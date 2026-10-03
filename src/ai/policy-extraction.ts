/**
 * PolicyExtractionEngine - parses privacy policy text into structured data practices
 * Implements AI-03: Policy extraction with evidence citations
 */

import { OpenJevClient } from './openjev-client.js';
import type { PolicyExtraction, DataPractice, EvidenceCitation, PageContext } from './types.js';
import { FallbackHeuristics } from './fallback-heuristics.js';
import { createPolicyEvidence, createOpenJevEvidence, combineEvidence } from './evidence.js';

/**
  * PolicyExtractionEngine class for extracting structured data from privacy policies
  */
export class PolicyExtractionEngine {
  private readonly openjevClient: OpenJevClient | null;
  private readonly fallback: typeof FallbackHeuristics;
  private currentMode: 'openjev' | 'fallback';

  constructor(openjevClient?: OpenJevClient) {
    this.openjevClient = openjevClient ?? null;
    this.fallback = FallbackHeuristics;
    this.currentMode = openjevClient ? 'openjev' : 'fallback';
  }

  /**
   * Extracts structured policy data from policy text
   * @param policyText - Full privacy policy text (from PolicyAdapter via r.jina.ai + Readability)
   * @param url - Source URL of the policy
   * @returns Promise<PolicyExtraction> with practices, purposes, third parties, AI training flag, retention, and evidence
   */
  async extract(policyText: string, url: string): Promise<PolicyExtraction> {
    // Try OpenJev first if available
    if (this.openjevClient) {
      try {
        return await this.extractWithOpenJev(policyText, url);
      } catch (error) {
        console.warn('OpenJev policy extraction failed, falling back to heuristics:', error);
        this.currentMode = 'fallback';
      }
    }

    // Fallback to local heuristics
    this.currentMode = 'fallback';
    return this.fallback.extractPolicy(policyText);
  }

  /**
   * Extracts policy data using OpenJevClient with multiple choice/score questions
   */
  private async extractWithOpenJev(policyText: string, url: string): Promise<PolicyExtraction> {
    const state = `Privacy Policy URL: ${url}\n\nPolicy Text:\n${policyText.slice(0, 8000)}`;

    const questions = {
      practices: {
        type: 'choice' as const,
        instructions: 'What data practices are described in this policy? Select all that apply.',
        criteria: {
          collection: 'Collection of personal data',
          sharing: 'Sharing data with third parties',
          selling: 'Selling personal data',
          'ai-training': 'Using data for AI training or machine learning',
        },
      },
      purposes: {
        type: 'choice' as const,
        instructions: 'What purposes for data processing are stated in this policy?',
        criteria: {
          'service-provision': 'Providing the core service',
          analytics: 'Analytics and performance monitoring',
          marketing: 'Marketing and advertising',
          personalization: 'Personalization and recommendations',
          security: 'Security and fraud prevention',
          legal: 'Legal compliance and obligations',
        },
      },
      thirdParties: {
        type: 'choice' as const,
        instructions: 'What types of third parties receive data according to this policy?',
        criteria: {
          'service-providers': 'Service providers and processors',
          partners: 'Business partners',
          affiliates: 'Corporate affiliates',
          advertisers: 'Advertisers and ad networks',
          analytics: 'Analytics providers',
        },
      },
      aiTraining: {
        type: 'noul' as const,
        instructions: 'Does this policy mention using user data for AI training or machine learning?',
      },
      retention: {
        type: 'choice' as const,
        instructions: 'What is the data retention period described in this policy?',
        criteria: {
          'session-only': 'Data retained only for the session',
          'days-to-months': 'Data retained for days to months',
          years: 'Data retained for years',
          'indefinite': 'Data retained indefinitely or not specified',
        },
      },
    };

    const request = {
      model: 'openjev-latest' as const,
      state,
      questions,
    };

    const response = await this.openjevClient['callOpenJev'](request);

    // Parse practices (multi-select from choice probabilities)
    const practicesAnswer = response.answers['practices'] as { type: 'choice'; probabilities: Record<string, number>; confidence: number };
    const practices: DataPractice[] = [];
    if (practicesAnswer && practicesAnswer.type === 'choice') {
      for (const [category, prob] of Object.entries(practicesAnswer.probabilities)) {
        if (prob > 0.5) { // Threshold for inclusion
          const evidence = this.findPolicyEvidence(policyText, category);
          practices.push({
            category: category as DataPractice['category'],
            description: `${category} detected in policy`,
            evidence: [createPolicyEvidence(url, evidence.section, 0.8), createOpenJevEvidence(prob)],
          });
        }
      }
    }

    // Parse purposes
    const purposesAnswer = response.answers['purposes'] as { type: 'choice'; probabilities: Record<string, number>; confidence: number };
    const purposes: string[] = [];
    if (purposesAnswer && purposesAnswer.type === 'choice') {
      for (const [purpose, prob] of Object.entries(purposesAnswer.probabilities)) {
        if (prob > 0.5) {
          purposes.push(purpose);
        }
      }
    }

    // Parse third parties
    const thirdPartiesAnswer = response.answers['thirdParties'] as { type: 'choice'; probabilities: Record<string, number>; confidence: number };
    const thirdParties: string[] = [];
    if (thirdPartiesAnswer && thirdPartiesAnswer.type === 'choice') {
      for (const [party, prob] of Object.entries(thirdPartiesAnswer.probabilities)) {
        if (prob > 0.5) {
          thirdParties.push(party);
        }
      }
    }

    // Parse AI training (noul)
    const aiTrainingAnswer = response.answers['aiTraining'] as { type: 'noul'; noul: number };
    const aiTraining = aiTrainingAnswer && aiTrainingAnswer.type === 'noul' ? aiTrainingAnswer.noul > 0.5 : false;

    // Parse retention
    const retentionAnswer = response.answers['retention'] as { type: 'choice'; choice: string; confidence: number };
    let retention: string | undefined;
    if (retentionAnswer && retentionAnswer.type === 'choice') {
      const retentionMap: Record<string, string> = {
        'session-only': 'Session only',
        'days-to-months': 'Days to months',
        years: 'Years',
        indefinite: 'Indefinite / not specified',
      };
      retention = retentionMap[retentionAnswer.choice] || retentionAnswer.choice;
    }

    // Build evidence
    const evidence = this.buildEvidence(policyText, url, practicesAnswer?.confidence ?? 0.7);

    return {
      practices,
      purposes: [...new Set(purposes)],
      thirdParties: [...new Set(thirdParties)],
      aiTraining,
      retention,
      evidence,
    };
  }

  /**
   * Finds relevant text evidence in policy for a practice category
   */
  private findPolicyEvidence(text: string, category: string): { section: string; snippet: string } {
    const lowerText = text.toLowerCase();
    const patterns: Record<string, RegExp[]> = {
      collection: [/collect.{0,100}/i, /gather.{0,100}/i, /obtain.{0,100}/i],
      sharing: [/share.{0,100}/i, /disclos.{0,100}/i, /third.part.{0,100}/i],
      selling: [/sell.{0,100}/i, /monetiz.{0,100}/i],
      'ai-training': [/ai training.{0,100}/i, /machine learning.{0,100}/i, /train.{0,50}model.{0,100}/i],
    };

    const categoryPatterns = patterns[category] || [];
    for (const pattern of categoryPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          section: category,
          snippet: match[0].slice(0, 200),
        };
      }
    }

    return { section: category, snippet: text.slice(0, 200) };
  }

  /**
   * Builds evidence citations from policy text
   */
  private buildEvidence(policyText: string, url: string, confidence: number): EvidenceCitation[] {
    const citations: EvidenceCitation[] = [];

    // Add policy URL evidence
    citations.push(createPolicyEvidence(url, 'full-policy', confidence));

    // Add text span evidence (first 500 chars)
    if (policyText.length > 0) {
      citations.push({
        source: 'policy',
        url,
        textSpan: { start: 0, end: Math.min(500, policyText.length) },
        confidence: Math.max(0, Math.min(1, confidence)),
      });
    }

    // Add OpenJev evidence
    citations.push(createOpenJevEvidence(confidence));

    return combineEvidence(...citations);
  }

  /**
   * Gets the OpenJev client instance (for testing/inspection)
   */
  getOpenJevClient(): OpenJevClient | null {
    return this.openjevClient;
  }

  /**
   * Checks if using OpenJev or fallback mode
   */
  getMode(): 'openjev' | 'fallback' {
    return this.currentMode;
  }
}