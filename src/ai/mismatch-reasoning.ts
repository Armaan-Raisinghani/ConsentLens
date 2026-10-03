/**
 * MismatchReasoningEngine - compares inferred purpose vs capabilities for relevance classification
 * Implements AI-05, AI-06, AI-07: Mismatch reasoning, least-privilege estimation, cross-source summary
 */

import { OpenJevClient } from './openjev-client.js'; // eslint-disable-line @typescript-eslint/consistent-type-imports
import type { MismatchReasoning, EvidenceCitation, PurposeInference } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import type { Capability } from '../ir/capability.js';
import { FallbackHeuristics } from './fallback-heuristics.js';
import { createOpenJevEvidence, combineEvidence } from './evidence.js';
import { isOAuthCapability, isBrowserPermissionCapability, isCookieCapability, isPolicyCapability, isTermsCapability } from '../ir/capability.js';

/**
 * Purpose category keywords for least-privilege estimation
 */
const PURPOSE_MINIMAL_CAPABILITIES: Record<string, string[]> = {
  productivity: ['oauth:google:drive', 'oauth:google:docs', 'oauth:microsoft:files', 'browser:clipboard'],
  social: ['oauth:facebook:profile', 'oauth:twitter:tweet', 'browser:notifications'],
  ecommerce: ['oauth:google:payments', 'oauth:paypal:payments', 'cookie:essential'],
  content: ['cookie:preferences', 'browser:notifications'],
  auth: ['oauth:google:profile', 'oauth:github:profile', 'cookie:essential'],
  other: [],
};

/**
 * MismatchReasoningEngine class for analyzing purpose/access mismatches
 */
export class MismatchReasoningEngine {
  private readonly openjevClient: OpenJevClient | null;
  private readonly fallback: typeof FallbackHeuristics;
  private currentMode: 'openjev' | 'fallback';

  constructor(openjevClient?: OpenJevClient) {
    this.openjevClient = openjevClient ?? null;
    this.fallback = FallbackHeuristics;
    this.currentMode = openjevClient ? 'openjev' : 'fallback';
  }

  /**
   * Reasons about purpose/access mismatch for each consent event
   * @param events - Consent events to analyze
   * @param purpose - Inferred page purpose
   * @returns Promise<MismatchReasoning[]> with relevance classification, reasoning, and evidence
   */
  async reason(events: ConsentEvent[], purpose: PurposeInference): Promise<MismatchReasoning[]> {
    // Try OpenJev first if available
    if (this.openjevClient) {
      try {
        return await this.reasonWithOpenJev(events, purpose);
      } catch (error) {
        console.warn('OpenJev mismatch reasoning failed, falling back to heuristics:', error);
        this.currentMode = 'fallback';
      }
    }

    // Fallback to local heuristics
    this.currentMode = 'fallback';
    return this.fallback.reasonMismatch(events, purpose);
  }

  /**
   * Reasons about mismatch using OpenJevClient for relevance classification
   */
  private async reasonWithOpenJev(events: ConsentEvent[], purpose: PurposeInference): Promise<MismatchReasoning[]> {
    const results: MismatchReasoning[] = [];

    for (const event of events) {
      const capabilityText = this.getCapabilityText(event.capability);
      const state = `Page Purpose: ${purpose.inferred} (confidence: ${purpose.confidence})\nCapability: ${capabilityText}\nCapability Description: ${event.capability.type}`;

      const question = {
        type: 'choice' as const,
        instructions: 'How relevant is this capability to the page purpose?',
        criteria: {
          relevant: 'Capability directly supports the stated purpose',
          unclear: 'Relationship between capability and purpose is ambiguous',
          'potentially-excessive': 'Capability seems broader than needed for the purpose',
          unrelated: 'Capability has no clear connection to the purpose',
        },
      };

      const request = {
        model: 'openjev-latest' as const,
        state,
        questions: { relevance: question },
      };

      const response = await this.openjevClient!.request(request);
      const answer = response.answers['relevance'] as { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> };

      let relevance: MismatchReasoning['relevance'] = 'unclear';
      let confidence = 0.5;

      if (answer && answer.type === 'choice') {
        relevance = answer.choice as MismatchReasoning['relevance'];
        confidence = answer.confidence;
      }

      // Generate reasoning text based on classification
      const reasoning = this.generateReasoning(relevance, capabilityText, purpose.inferred);

      // Build evidence combining purpose evidence, capability evidence, and OpenJev evidence
      const evidence = this.buildEvidence(event, purpose, confidence);

      results.push({
        capability: event.capability,
        relevance,
        reasoning,
        evidence,
      });
    }

    return results;
  }

  /**
   * Generates natural language reasoning for the relevance classification
   */
  private generateReasoning(
    relevance: MismatchReasoning['relevance'],
    capabilityText: string,
    purpose: string
  ): string {
    switch (relevance) {
      case 'relevant':
        return `The capability (${capabilityText}) directly supports the inferred page purpose: ${purpose}. This access appears necessary for the service to function as intended.`;
      case 'unclear':
        return `The relationship between the capability (${capabilityText}) and the page purpose (${purpose}) is ambiguous. It's unclear whether this access is necessary or excessive.`;
      case 'potentially-excessive':
        return `The capability (${capabilityText}) may request broader permissions than needed for the ${purpose} purpose. Consider whether a more limited scope would suffice.`;
      case 'unrelated':
        return `The capability (${capabilityText}) does not appear to have a clear connection to the ${purpose} purpose. This access may be unnecessary for the current context.`;
      default:
        return `Unable to determine relevance of ${capabilityText} to ${purpose} purpose.`;
    }
  }

  /**
   * Gets human-readable text for a capability
   */
  private getCapabilityText(cap: Capability): string {
    if (isOAuthCapability(cap)) return `OAuth ${cap.provider} (${cap.scope.join(', ')})`;
    if (isBrowserPermissionCapability(cap)) return `Browser permission: ${cap.permission}`;
    if (isCookieCapability(cap)) return `Cookie: ${cap.category} (${cap.name || 'unnamed'})`;
    if (isPolicyCapability(cap)) return `Policy practice: ${cap.practice}`;
    if (isTermsCapability(cap)) return `Terms clause: ${cap.clause}`;
    return 'Unknown capability';
  }

  /**
   * Builds evidence citations for mismatch reasoning
   */
  private buildEvidence(event: ConsentEvent, purpose: PurposeInference, openjevConfidence: number): EvidenceCitation[] {
    const citations: EvidenceCitation[] = [];

    // Add purpose evidence
    for (const ev of purpose.evidence) {
      citations.push(ev);
    }

    // Add capability-specific evidence
    const cap = event.capability;
    if (isOAuthCapability(cap)) {
      citations.push({
        source: 'oauth-url',
        url: `https://${cap.provider}.com/oauth/authorize`,
        scope: cap.scope.join(', '),
        confidence: 0.8,
      });
    } else if (isBrowserPermissionCapability(cap)) {
      citations.push({
        source: 'openjev',
        confidence: 0.7,
      });
    } else if (isCookieCapability(cap)) {
      if (cap.name && cap.domain) {
        citations.push({
          source: 'cookie',
          cookie: { name: cap.name, domain: cap.domain },
          confidence: 0.8,
        });
      }
    } else if (isPolicyCapability(cap)) {
      citations.push({
        source: 'policy',
        section: cap.practice,
        confidence: 0.7,
      });
    } else if (isTermsCapability(cap)) {
      citations.push({
        source: 'terms',
        section: cap.clause,
        confidence: 0.7,
      });
    }

    // Add OpenJev classification evidence
    citations.push(createOpenJevEvidence(openjevConfidence));

    return combineEvidence(...citations);
  }

  /**
   * Estimates least-privilege capabilities for a given purpose (AI-06)
   * Returns the minimal set of capabilities that seem necessary for the purpose
   */
  estimateLeastPrivilege(purpose: PurposeInference): string[] {
    const purposeCategory = purpose.inferred;
    return PURPOSE_MINIMAL_CAPABILITIES[purposeCategory] || [];
  }

  /**
   * Generates cross-source natural language summary (AI-07)
   * Aggregates reasoning across all events into a unified explanation
   */
  generateCrossSourceSummary(reasonings: MismatchReasoning[], purpose: PurposeInference): string {
    const relevant = reasonings.filter(r => r.relevance === 'relevant');
    const potentiallyExcessive = reasonings.filter(r => r.relevance === 'potentially-excessive');
    const unrelated = reasonings.filter(r => r.relevance === 'unrelated');
    const unclear = reasonings.filter(r => r.relevance === 'unclear');

    const parts: string[] = [];

    parts.push(`Page purpose inferred as: ${purpose.inferred} (${Math.round(purpose.confidence * 100)}% confidence).`);

    if (relevant.length > 0) {
      const caps = relevant.map(r => this.getCapabilityText(r.capability)).join(', ');
      parts.push(`${relevant.length} capability${relevant.length > 1 ? 's' : ''} (${caps}) directly support this purpose.`);
    }

    if (potentiallyExcessive.length > 0) {
      const caps = potentiallyExcessive.map(r => this.getCapabilityText(r.capability)).join(', ');
      parts.push(`${potentiallyExcessive.length} capability${potentiallyExcessive.length > 1 ? 's' : ''} (${caps}) may request excessive permissions beyond what's needed for ${purpose.inferred}.`);
    }

    if (unrelated.length > 0) {
      const caps = unrelated.map(r => this.getCapabilityText(r.capability)).join(', ');
      parts.push(`${unrelated.length} capability${unrelated.length > 1 ? 's' : ''} (${caps}) appear unrelated to the ${purpose.inferred} purpose.`);
    }

    if (unclear.length > 0) {
      parts.push(`${unclear.length} capability${unclear.length > 1 ? 's' : ''} have an unclear relationship to the page purpose.`);
    }

    if (potentiallyExcessive.length > 0 || unrelated.length > 0) {
      parts.push('Recommendation: Review excessive or unrelated permissions before consenting.');
    }

    return parts.join(' ');
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