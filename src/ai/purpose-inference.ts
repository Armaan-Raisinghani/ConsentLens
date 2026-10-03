/**
 * PurposeInferenceEngine - extracts page purpose from DOM with confidence and evidence citations
 * Implements AI-01: Purpose inference from page content
 */

import { OpenJevClient } from './openjev-client.js';
import type { PageContext, PurposeInference, EvidenceCitation } from './types.js';
import { FallbackHeuristics } from './fallback-heuristics.js';
import { createDomEvidence, createOpenJevEvidence, combineEvidence } from './evidence.js';

/**
 * Purpose categories for classification
 */
const PURPOSE_CATEGORIES = [
  'productivity',
  'social',
  'ecommerce',
  'content',
  'auth',
  'other',
] as const;

export type PurposeCategory = (typeof PURPOSE_CATEGORIES)[number];

/**
 * Criteria for OpenJev purpose classification
 */
const PURPOSE_CRITERIA: Record<PurposeCategory, string> = {
  productivity: 'Document editing, project management, developer tools',
  social: 'Social networking, messaging, content sharing',
  ecommerce: 'Shopping, payments, marketplace',
  content: 'Media consumption, news, entertainment',
  auth: 'Login, signup, account management',
  other: 'Other purpose',
};

/**
 * PurposeInferenceEngine class for inferring page purpose from DOM
 */
export class PurposeInferenceEngine {
  private readonly openjevClient: OpenJevClient | null;
  private readonly fallback: typeof FallbackHeuristics;

  constructor(openjevClient?: OpenJevClient) {
    this.openjevClient = openjevClient ?? null;
    this.fallback = FallbackHeuristics;
  }

  /**
   * Infers the purpose of a page from its context
   * @param pageContext - Page context containing DOM-extracted content
   * @returns Promise<PurposeInference> with inferred purpose, confidence, and evidence
   */
  async infer(pageContext: PageContext): Promise<PurposeInference> {
    // Build state string for OpenJev from extracted text
    const state = this.buildStateString(pageContext);

    // Try OpenJev first if available
    if (this.openjevClient) {
      try {
        return await this.inferWithOpenJev(pageContext, state);
      } catch (error) {
        // Fall back to heuristics on any OpenJev error
        console.warn('OpenJev purpose inference failed, falling back to heuristics:', error);
      }
    }

    // Fallback to local heuristics
    return this.fallback.inferPurpose(pageContext);
  }

  /**
   * Builds concatenated state string from page context for OpenJev
   */
  private buildStateString(pageContext: PageContext): string {
    const parts: string[] = [
      `URL: ${pageContext.url}`,
      `Title: ${pageContext.title}`,
    ];

    // Add meta tags
    for (const [name, content] of Object.entries(pageContext.metaTags)) {
      if (content && content.trim()) {
        parts.push(`Meta ${name}: ${content}`);
      }
    }

    // Add headings
    for (const heading of pageContext.headings) {
      if (heading && heading.trim()) {
        parts.push(`Heading: ${heading}`);
      }
    }

    // Add main content (truncated)
    if (pageContext.mainContent && pageContext.mainContent.trim()) {
      parts.push(`Main content: ${pageContext.mainContent.slice(0, 2000)}`);
    }

    return parts.join('; ');
  }

  /**
   * Infers purpose using OpenJevClient
   */
  private async inferWithOpenJev(pageContext: PageContext, state: string): Promise<PurposeInference> {
    const question = {
      type: 'choice' as const,
      instructions: 'What is the primary purpose of this page?',
      criteria: PURPOSE_CRITERIA,
    };

    const request = {
      model: 'openjev-latest' as const,
      state,
      questions: { purpose: question },
    };

    const response = await this.openjevClient['callOpenJev'](request);
    const answer = response.answers['purpose'] as { type: 'choice'; choice: string; confidence: number };

    if (!answer || answer.type !== 'choice') {
      throw new Error('Invalid OpenJev response for purpose classification');
    }

    const inferred = answer.choice as PurposeCategory;
    const confidence = answer.confidence;

    // Build evidence citations
    const evidence = this.buildEvidence(pageContext, inferred, confidence);

    return {
      inferred,
      confidence: Math.max(0, Math.min(1, confidence)),
      evidence,
    };
  }

  /**
   * Builds evidence citations from DOM extraction
   */
  private buildEvidence(pageContext: PageContext, inferred: string, confidence: number): EvidenceCitation[] {
    const citations: EvidenceCitation[] = [];

    // Title evidence
    if (pageContext.title) {
      citations.push(createDomEvidence('title', pageContext.title, 0.8));
    }

    // Meta tag evidence
    for (const [name, content] of Object.entries(pageContext.metaTags)) {
      if (content && this.isRelevantMetaTag(name)) {
        citations.push(createDomEvidence(`meta[name="${name}"], meta[property="${name}"]`, content, 0.7));
      }
    }

    // Heading evidence
    for (const heading of pageContext.headings.slice(0, 5)) {
      if (heading && heading.trim()) {
        citations.push(createDomEvidence('h1, h2', heading, 0.75));
      }
    }

    // Main content evidence (first 500 chars)
    if (pageContext.mainContent && pageContext.mainContent.trim()) {
      const snippet = pageContext.mainContent.slice(0, 500);
      citations.push(createDomEvidence('main, article, [role="main"]', snippet, 0.6));
    }

    // OpenJev evidence
    citations.push(createOpenJevEvidence(confidence));

    return combineEvidence(...citations);
  }

  /**
   * Checks if a meta tag is relevant for purpose inference
   */
  private isRelevantMetaTag(name: string): boolean {
    const relevantTags = [
      'description',
      'og:description',
      'twitter:description',
      'application-name',
      'og:title',
      'twitter:title',
    ];
    return relevantTags.includes(name.toLowerCase());
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
    return this.openjevClient ? 'openjev' : 'fallback';
  }
}