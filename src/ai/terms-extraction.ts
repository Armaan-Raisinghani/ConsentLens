/**
 * TermsExtractionEngine - extracts material clauses from terms of service text
 * Implements AI-04: Terms extraction with severity ratings and evidence
 */

import { OpenJevClient } from './openjev-client.js';
import type { TermsExtraction, TermsClause, EvidenceCitation } from './types.js';
import { FallbackHeuristics } from './fallback-heuristics.js';
import { createTermsEvidence, createOpenJevEvidence, combineEvidence } from './evidence.js';

/**
 * Clause types with their severity levels (per plan specification)
 */
const CLAUSE_TYPES = [
  { type: 'arbitration' as const, severity: 'high' as const, description: 'Binding arbitration clause limiting legal recourse' },
  { type: 'auto-renewal' as const, severity: 'medium' as const, description: 'Automatic renewal of subscriptions' },
  { type: 'liability' as const, severity: 'medium' as const, description: 'Limitation of liability clause' },
  { type: 'content-license' as const, severity: 'high' as const, description: 'Content license grant to service provider' },
  { type: 'termination' as const, severity: 'medium' as const, description: 'Account/service termination terms' },
  { type: 'governing-law' as const, severity: 'low' as const, description: 'Governing law and jurisdiction' },
] as const;

/**
 * TermsExtractionEngine class for extracting clauses from terms of service
 */
export class TermsExtractionEngine {
  private readonly openjevClient: OpenJevClient | null;
  private readonly fallback: typeof FallbackHeuristics;
  private currentMode: 'openjev' | 'fallback';

  constructor(openjevClient?: OpenJevClient) {
    this.openjevClient = openjevClient ?? null;
    this.fallback = FallbackHeuristics;
    this.currentMode = openjevClient ? 'openjev' : 'fallback';
  }

  /**
   * Extracts material clauses from terms of service text
   * @param termsText - Full terms of service text (from TermsAdapter via r.jina.ai + Readability)
   * @param url - Source URL of the terms
   * @returns Promise<TermsExtraction> with clauses, severity, and evidence
   */
  async extract(termsText: string, url: string): Promise<TermsExtraction> {
    // Try OpenJev first if available
    if (this.openjevClient) {
      try {
        return await this.extractWithOpenJev(termsText, url);
      } catch (error) {
        console.warn('OpenJev terms extraction failed, falling back to heuristics:', error);
        this.currentMode = 'fallback';
      }
    }

    // Fallback to local heuristics
    this.currentMode = 'fallback';
    return this.fallback.extractTerms(termsText);
  }

  /**
   * Extracts terms clauses using OpenJevClient with choice questions for each clause type
   */
  private async extractWithOpenJev(termsText: string, url: string): Promise<TermsExtraction> {
    const state = `Terms of Service URL: ${url}\n\nTerms Text:\n${termsText.slice(0, 8000)}`;

    // Build questions for each clause type
    const questions: Record<string, any> = {};

    for (const { type, severity } of CLAUSE_TYPES) {
      questions[type] = {
        type: 'choice' as const,
        instructions: `Does this terms of service contain a ${type.replace('-', ' ')} clause?`,
        criteria: {
          present: `Contains ${type.replace('-', ' ')} clause with ${severity} severity`,
          absent: `No ${type.replace('-', ' ')} clause found`,
        },
      };
    }

    const request = {
      model: 'openjev-latest' as const,
      state,
      questions,
    };

    const response = await this.openjevClient['callOpenJev'](request);

    // Parse clause results
    const clauses: TermsClause[] = [];

    for (const { type, severity } of CLAUSE_TYPES) {
      const answer = response.answers[type] as { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> };

      if (answer && answer.type === 'choice' && answer.choice === 'present') {
        const evidence = this.findClauseEvidence(termsText, type);
        clauses.push({
          type,
          text: evidence.snippet,
          severity,
          evidence: [
            createTermsEvidence(url, type, answer.confidence),
            createOpenJevEvidence(answer.confidence),
            {
              source: 'terms' as const,
              url,
              section: type,
              textSpan: { start: evidence.start, end: evidence.end },
              confidence: answer.confidence,
            },
          ],
        });
      }
    }

    // Build overall evidence
    const evidence = this.buildEvidence(termsText, url, clauses);

    return {
      clauses,
      evidence,
    };
  }

  /**
   * Finds relevant text evidence for a clause type
   */
  private findClauseEvidence(text: string, clauseType: string): { snippet: string; start: number; end: number } {
    const lowerText = text.toLowerCase();
    const patterns: Record<string, RegExp[]> = {
      arbitration: [/arbitration.{0,200}/i, /binding arbitration.{0,200}/i, /waive.{0,100}(court|jury|class action).{0,100}/i],
      'auto-renewal': [/auto.?renew.{0,200}/i, /automatic renewal.{0,200}/i, /renew automatically.{0,200}/i],
      liability: [/limitation of liability.{0,200}/i, /not liable.{0,200}/i, /disclaimer of.{0,100}(warrant|liability).{0,100}/i],
      'content-license': [/grant.{0,100}license.{0,200}/i, /you grant.{0,200}/i, /worldwide.{0,100}license.{0,200}/i, /perpetual.{0,100}license.{0,200}/i],
      termination: [/terminat.{0,200}/i, /cancel.{0,200}/i, /end this agreement.{0,200}/i],
      'governing-law': [/governing law.{0,200}/i, /jurisdiction.{0,200}/i, /venue.{0,200}/i],
    };

    const clausePatterns = patterns[clauseType] || [];
    for (const pattern of clausePatterns) {
      const match = text.match(pattern);
      if (match) {
        const start = match.index || 0;
        const end = Math.min(start + match[0].length, start + 300);
        return {
          snippet: text.slice(start, end),
          start,
          end,
        };
      }
    }

    return { snippet: text.slice(0, 300), start: 0, end: 300 };
  }

  /**
   * Builds evidence citations from terms text
   */
  private buildEvidence(termsText: string, url: string, clauses: TermsClause[]): EvidenceCitation[] {
    const citations: EvidenceCitation[] = [];

    // Add terms URL evidence
    citations.push(createTermsEvidence(url, 'full-terms', 0.8));

    // Add text span evidence (first 500 chars)
    if (termsText.length > 0) {
      citations.push({
        source: 'terms',
        url,
        textSpan: { start: 0, end: Math.min(500, termsText.length) },
        confidence: 0.7,
      });
    }

    // Add per-clause evidence
    for (const clause of clauses) {
      if (clause.evidence) {
        for (const ev of clause.evidence) {
          if (ev.source === 'terms' && ev.textSpan) {
            citations.push(ev);
          }
        }
      }
    }

    // Add OpenJev evidence
    citations.push(createOpenJevEvidence(0.8));

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