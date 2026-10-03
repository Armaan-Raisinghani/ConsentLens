/**
 * AI Backend Plugin Interface - per PLUGIN-04
 * Enables swappable AI models for classification, extraction, and reasoning
 */

import type { ConsentEvent } from '../ir/consent-event.js';
import type { Purpose } from '../ir/purpose.js';
import type { Evidence } from '../ir/evidence.js';
import type { PageContext } from '../shared/errors.js';
import type { DecisionRecord } from '../ir/decision-record.js';

/**
 * Classification result from AI backend
 * Matches DecisionRecord.aiClassification structure
 */
export type Classification = DecisionRecord['aiClassification'];

/**
 * Extracted data from policy/terms text
 */
export interface ExtractedData {
  practices?: Array<{
    type: string;
    text: string;
    confidence: number;
  }>;
  clauses?: Array<{
    type: string;
    text: string;
    severity: 'high' | 'medium' | 'low';
    confidence: number;
  }>;
  purposes?: Array<{
    stated: string;
    inferred: string;
    confidence: number;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Reasoning result for purpose/access mismatch analysis
 */
export interface ReasoningResult {
  mismatch: boolean;
  mismatchDetails?: string;
  userIntentAlignment?: 'aligned' | 'partial' | 'misaligned';
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * AI Backend interface - all methods are async for remote/local model support
 */
export interface AIBackend {
  /**
   * Classifies consent events into allow/ask/deny with confidence
   * Used for fast structured classification (OpenJev System One style)
   */
  classify(events: ConsentEvent[]): Promise<Classification[]>;
  
  /**
   * Extracts structured data from policy or terms text
   * Used for semantic extraction of practices/clauses
   */
  extract(text: string, type: 'policy' | 'terms', context?: PageContext): Promise<ExtractedData>;
  
  /**
   * Performs reasoning on consent events for a specific purpose
   * Used for cross-source reasoning and purpose/access mismatch detection
   */
  reason(events: ConsentEvent[], purpose: Purpose): Promise<ReasoningResult>;
}

/**
 * Global AI backend registry
 */
const aiBackendRegistry = new Map<string, AIBackend>();

/**
 * Registers an AI backend
 * 
 * @param name - Unique backend name (e.g., 'openjev', 'local-llm', 'remote-api')
 * @param backend - AIBackend implementation
 * 
 * @example
 * ```typescript
 * registerAIBackend('openjev', {
 *   async classify(events) {
 *     // Call OpenJev API for fast classification
 *     const response = await fetch('https://api.codiv.ai/v1/classify', {
 *       method: 'POST',
 *       body: JSON.stringify({ events }),
 *     });
 *     return response.json();
 *   },
 *   async extract(text, type) {
 *     // Extract practices/clauses from text
 *   },
 *   async reason(events, purpose) {
 *     // Reason about purpose/access mismatch
 *   },
 * });
 * ```
 */
export function registerAIBackend(name: string, backend: AIBackend): void {
  if (aiBackendRegistry.has(name)) {
    throw new Error(`AI backend '${name}' already registered`);
  }
  aiBackendRegistry.set(name, backend);
}

/**
 * Unregisters an AI backend by name
 */
export function unregisterAIBackend(name: string): boolean {
  return aiBackendRegistry.delete(name);
}

/**
 * Gets an AI backend by name
 */
export function getAIBackend(name: string): AIBackend | undefined {
  return aiBackendRegistry.get(name);
}

/**
 * Gets all registered AI backends
 */
export function getAllAIBackends(): AIBackend[] {
  return [...aiBackendRegistry.values()];
}

/**
 * Clears all AI backends
 */
export function clearAIBackends(): void {
  aiBackendRegistry.clear();
}

/**
 * Gets the default AI backend (first registered)
 */
export function getDefaultAIBackend(): AIBackend | undefined {
  const backends = [...aiBackendRegistry.values()];
  return backends[0];
}

/**
 * Creates a ConsentEvent with AI classification result
 */
export function createAIClassificationEvent(params: {
  website: string;
  originalEvent: ConsentEvent;
  classification: Classification;
  evidence: Evidence[];
  timestamp?: string;
}): ConsentEvent {
  const { ConsentType, GrantStatus } = require('../shared/types.js');
  
  return {
    ...params.originalEvent,
    website: params.website,
    consentType: ConsentType.OAuth, // Will be overridden by caller
    timestamp: params.timestamp ?? new Date().toISOString(),
    grantStatus: GrantStatus.Pending,
    evidence: [...params.originalEvent.evidence, ...params.evidence],
    decisionRecord: {
      matchedRule: undefined,
      aiClassification: params.classification,
      confidence: 1.0, // AI classification confidence defaults to 1.0
      provenance: {
        engine: 'ai-backend',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      },
    },
  };
}