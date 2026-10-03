/**
 * OpenJevAIBackend - bridges OpenJevClient to Phase 1 AI backend plugin interface (PLUGIN-04)
 * Registers itself as 'openjev' backend on module load
 */

import type { ConsentEvent } from '../ir/consent-event.js';
import type { Purpose } from '../ir/purpose.js';
import type { PageContext } from '../shared/errors.js';
import type { Classification, ExtractedData, ReasoningResult, AIBackend as PluginAIBackend } from '../plugins/ai-backend-plugin.js';
import { OpenJevClient } from './openjev-client.js';
import { FallbackHeuristics } from './fallback-heuristics.js';
import { registerAIBackend, getAIBackend } from '../plugins/ai-backend-plugin.js';

/**
 * OpenJevAIBackend implements the Phase 1 AIBackend plugin interface using OpenJevClient
 * Falls back to FallbackHeuristics when OpenJevClient is unavailable
 */
export class OpenJevAIBackend implements PluginAIBackend {
  private readonly openjevClient: OpenJevClient | null;

  constructor(openjevClient?: OpenJevClient) {
    this.openjevClient = openjevClient ?? null;
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
      return FallbackHeuristics.classifyBatchForPlugin(events);
    }
  }

  /**
   * Extract structured data from policy or terms text
   * Uses fallback heuristics for now (real engines in Plan 03-02)
   */
  async extract(text: string, type: 'policy' | 'terms', context?: PageContext): Promise<ExtractedData> {
    // For now, use fallback heuristics
    // Real implementation will use PolicyExtractionEngine/TermsExtractionEngine in Plan 03-02
    if (type === 'policy') {
      return FallbackHeuristics.extractPolicyForPlugin(text);
    } else {
      return FallbackHeuristics.extractTermsForPlugin(text);
    }
  }

  /**
   * Reason about purpose/access mismatch
   * Uses fallback heuristics for now (real engine in Plan 03-02)
   */
  async reason(events: ConsentEvent[], purpose: Purpose): Promise<ReasoningResult> {
    // For now, use fallback heuristics
    // Real implementation will use MismatchReasoningEngine in Plan 03-02
    return FallbackHeuristics.reasonMismatchForPlugin(events, purpose);
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
    return this.openjevClient ? 'openjev' : 'fallback';
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

// Initialize default backend in fallback mode on module load
getDefaultOpenJevBackend();