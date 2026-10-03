/**
 * OpenJevAIBackend - bridges OpenJevClient to Phase 1 AI backend plugin interface (PLUGIN-04)
 * Registers itself as 'openjev' backend on module load
 * Now fully implements all AIBackend methods with real engines (Plan 03-02)
 */

import type { ConsentEvent } from '../ir/consent-event.js';
import type { Purpose } from '../ir/purpose.js';
import type { PageContext } from '../shared/errors.js';
import type { Classification, ExtractedData, ReasoningResult, AIBackend as PluginAIBackend } from '../plugins/ai-backend-plugin.js';
import { OpenJevClient } from './openjev-client.js';
import { FallbackHeuristics } from './fallback-heuristics.js';
import { PolicyExtractionEngine } from './policy-extraction.js';
import { TermsExtractionEngine } from './terms-extraction.js';
import { MismatchReasoningEngine } from './mismatch-reasoning.js';
import { registerAIBackend, getAIBackend } from '../plugins/ai-backend-plugin.js';
import type { PurposeInference } from './types.js';

/**
 * OpenJevAIBackend implements the Phase 1 AIBackend plugin interface using OpenJevClient
 * Falls back to FallbackHeuristics when OpenJevClient is unavailable
 */
export class OpenJevAIBackend implements PluginAIBackend {
  private readonly openjevClient: OpenJevClient | null;
  private readonly policyEngine: PolicyExtractionEngine;
  private readonly termsEngine: TermsExtractionEngine;
  private readonly mismatchEngine: MismatchReasoningEngine;
  private currentMode: 'openjev' | 'fallback';

  constructor(openjevClient?: OpenJevClient) {
    this.openjevClient = openjevClient ?? null;
    this.policyEngine = new PolicyExtractionEngine(openjevClient);
    this.termsEngine = new TermsExtractionEngine(openjevClient);
    this.mismatchEngine = new MismatchReasoningEngine(openjevClient);
    this.currentMode = openjevClient ? 'openjev' : 'fallback';
  }

  /**
   * Classify consent events into allow/ask/deny with confidence
   * Delegates to OpenJevClient.classifyBatch, falls back to heuristics
   */
  async classify(events: ConsentEvent[]): Promise<Classification[]> {
    if (!this.openjevClient) {
      return FallbackHeuristics.classifyBatchForPlugin(events);
    }

    try {
      const results = await this.openjevClient.classifyBatch(events);
      return this.convertToPluginClassification(results);
    } catch (error) {
      // Fallback on any OpenJev error
      this.currentMode = 'fallback';
      return FallbackHeuristics.classifyBatchForPlugin(events);
    }
  }

  /**
   * Extract structured data from policy or terms text
   * Delegates to PolicyExtractionEngine or TermsExtractionEngine with OpenJevClient
   * Falls back to heuristics if OpenJev fails
   */
  async extract(text: string, type: 'policy' | 'terms', context?: PageContext): Promise<ExtractedData> {
    try {
      if (type === 'policy') {
        const extraction = await this.policyEngine.extract(text, context?.url || 'unknown');
        // Update mode based on engine
        if (this.policyEngine.getMode() === 'fallback') {
          this.currentMode = 'fallback';
        }
        return this.convertPolicyExtraction(extraction);
      } else {
        const extraction = await this.termsEngine.extract(text, context?.url || 'unknown');
        // Update mode based on engine
        if (this.termsEngine.getMode() === 'fallback') {
          this.currentMode = 'fallback';
        }
        return this.convertTermsExtraction(extraction);
      }
    } catch (error) {
      // Fallback on any error
      this.currentMode = 'fallback';
      if (type === 'policy') {
        return FallbackHeuristics.extractPolicyForPlugin(text);
      } else {
        return FallbackHeuristics.extractTermsForPlugin(text);
      }
    }
  }

  /**
   * Reason about purpose/access mismatch
   * Delegates to MismatchReasoningEngine with OpenJevClient
   * Falls back to heuristics if OpenJev fails
   */
  async reason(events: ConsentEvent[], purpose: Purpose): Promise<ReasoningResult> {
    try {
      // Convert Purpose to PurposeInference for the engine
      const purposeInference: PurposeInference = {
        inferred: purpose.inferred || '',
        stated: purpose.stated,
        userIntent: purpose.userIntent,
        confidence: purpose.confidence,
        evidence: [], // Purpose from Phase 1 doesn't have evidence, but engine expects it
      };

      const reasonings = await this.mismatchEngine.reason(events, purposeInference);
      // Update mode based on engine
      if (this.mismatchEngine.getMode() === 'fallback') {
        this.currentMode = 'fallback';
      }
      return this.convertMismatchReasoning(reasonings);
    } catch (error) {
      // Fallback on any error
      this.currentMode = 'fallback';
      return FallbackHeuristics.reasonMismatchForPlugin(events, purpose);
    }
  }

  /**
   * Convert PolicyExtraction to plugin ExtractedData
   */
  private convertPolicyExtraction(extraction: {
    practices: Array<{ category: string; description: string; evidence: any[] }>;
    purposes: string[];
    thirdParties: string[];
    aiTraining: boolean;
    retention?: string;
    evidence: any[];
  }): ExtractedData {
    return {
      practices: extraction.practices.map(p => ({
        type: p.category,
        text: p.description,
        confidence: p.evidence[0]?.confidence ?? 0.5,
      })),
      purposes: extraction.purposes.map(p => ({
        stated: p,
        inferred: p,
        confidence: 0.7,
      })),
      metadata: {
        aiTraining: extraction.aiTraining,
        retention: extraction.retention,
        thirdParties: extraction.thirdParties,
      },
    };
  }

  /**
   * Convert TermsExtraction to plugin ExtractedData
   */
  private convertTermsExtraction(extraction: {
    clauses: Array<{ type: string; text: string; severity: string; evidence: any[] }>;
    evidence: any[];
  }): ExtractedData {
    return {
      clauses: extraction.clauses.map(c => ({
        type: c.type,
        text: c.text,
        severity: c.severity as 'high' | 'medium' | 'low',
        confidence: c.evidence[0]?.confidence ?? 0.5,
      })),
      metadata: {
        clauseCount: extraction.clauses.length,
      },
    };
  }

  /**
   * Convert MismatchReasoning[] to plugin ReasoningResult
   */
  private convertMismatchReasoning(reasonings: Array<{
    capability: any;
    relevance: string;
    reasoning: string;
    evidence: any[];
  }>): ReasoningResult {
    const hasMismatch = reasonings.some(r => r.relevance === 'potentially-excessive' || r.relevance === 'unrelated');
    const highRisk = reasonings.some(r => r.relevance === 'unrelated');

    return {
      mismatch: hasMismatch,
      mismatchDetails: hasMismatch ? reasonings.map(r => `${r.relevance}: ${r.reasoning}`).join('; ') : undefined,
      userIntentAlignment: hasMismatch ? (highRisk ? 'misaligned' : 'partial') : 'aligned',
      riskLevel: highRisk ? 'high' : hasMismatch ? 'medium' : 'low',
      recommendations: hasMismatch ? ['Review excessive permissions', 'Consider denying unrelated requests'] : [],
      confidence: reasonings.length > 0
        ? reasonings.reduce((sum, r) => sum + (r.evidence[0]?.confidence ?? 0.5), 0) / reasonings.length
        : 0.5,
      metadata: {
        totalEvents: reasonings.length,
        mismatchCount: reasonings.filter(r => r.relevance !== 'relevant').length,
        relevantCount: reasonings.filter(r => r.relevance === 'relevant').length,
        excessiveCount: reasonings.filter(r => r.relevance === 'potentially-excessive').length,
        unrelatedCount: reasonings.filter(r => r.relevance === 'unrelated').length,
      },
    };
  }

  /**
   * Convert OpenJevClassification[] to plugin Classification[]
   */
  private convertToPluginClassification(results: any[]): Classification[] {
    return results.map(r => ({
      decision: r.decision,
      excessiveness: r.excessiveness === 'excessive' ? 'excessive' : r.excessiveness === 'minimal' ? 'none' : 'moderate',
      purposeMatch: r.purposeMatch === 'relevant',
      reasoning: `Excessiveness: ${r.excessiveness}, Purpose match: ${r.purposeMatch}, Sensitivity: ${r.sensitivity}`,
    }));
  }

  /**
   * Get the OpenJevClient instance (for testing/inspection)
   */
  getOpenJevClient(): OpenJevClient | null {
    return this.openjevClient;
  }

  /**
   * Check if using OpenJev or fallback mode
   */
  getMode(): 'openjev' | 'fallback' {
    return this.currentMode;
  }

  /**
   * Get the policy extraction engine (for testing/inspection)
   */
  getPolicyEngine(): PolicyExtractionEngine {
    return this.policyEngine;
  }

  /**
   * Get the terms extraction engine (for testing/inspection)
   */
  getTermsEngine(): TermsExtractionEngine {
    return this.termsEngine;
  }

  /**
   * Get the mismatch reasoning engine (for testing/inspection)
   */
  getMismatchEngine(): MismatchReasoningEngine {
    return this.mismatchEngine;
  }
}

// Create and register the default OpenJev backend on module load
// This will be overridden if user provides API key via configuration
let defaultOpenJevBackend: OpenJevAIBackend | null = null;

/**
 * Initialize the OpenJev backend with API key
 * Called by AIIntegration when user provides API key
 */
export function initializeOpenJevBackend(apiKey: string, baseUrl?: string): OpenJevAIBackend {
  const client = new OpenJevClient({ apiKey, baseUrl });
  defaultOpenJevBackend = new OpenJevAIBackend(client);
  registerAIBackend('openjev', defaultOpenJevBackend);
  return defaultOpenJevBackend;
}

/**
 * Get the default OpenJev backend (lazy initialization without API key = fallback mode)
 */
export function getDefaultOpenJevBackend(): OpenJevAIBackend {
  if (!defaultOpenJevBackend) {
    defaultOpenJevBackend = new OpenJevAIBackend();
    registerAIBackend('openjev', defaultOpenJevBackend);
  } else {
    // Ensure it's registered (in case registry was cleared)
    const registered = getAIBackend('openjev');
    if (!registered) {
      registerAIBackend('openjev', defaultOpenJevBackend);
    }
  }
  return defaultOpenJevBackend;
}

/**
 * Reset the default OpenJev backend (for testing)
 */
export function resetDefaultOpenJevBackend(): void {
  defaultOpenJevBackend = null;
}

// Initialize default backend in fallback mode on module load
getDefaultOpenJevBackend();