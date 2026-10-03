/**
 * Core AI type definitions for the semantic layer
 * All outputs include EvidenceCitation per AI-08
 */

import type { Capability } from '../ir/capability.js';
import type { EvidenceCitation } from './evidence.js';

// Re-export EvidenceCitation and Capability for convenience
export type { EvidenceCitation } from './evidence.js';
export type { Capability } from '../ir/capability.js';

/**
 * Purpose inference result from page analysis
 */
export interface PurposeInference {
  /** Inferred purpose category */
  inferred: string;
  /** Stated purpose from policy/terms if available */
  stated?: string;
  /** User intent inferred from context */
  userIntent?: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * Permission interpretation result
 */
export interface PermissionInterpretation {
  /** Capability being interpreted */
  capability: Capability;
  /** Human-readable description */
  description: string;
  /** Sensitivity rating */
  sensitivity: 'high' | 'medium' | 'low';
  /** Confidence score 0-1 */
  confidence: number;
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * Data practice extracted from policy
 */
export interface DataPractice {
  /** Practice category */
  category: 'collection' | 'sharing' | 'selling' | 'ai-training';
  /** Description of the practice */
  description: string;
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * Policy extraction result
 */
export interface PolicyExtraction {
  /** Data practices found */
  practices: DataPractice[];
  /** Purposes stated in policy */
  purposes: string[];
  /** Third parties mentioned */
  thirdParties: string[];
  /** Whether AI training is mentioned */
  aiTraining: boolean;
  /** Retention period if specified */
  retention?: string;
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * Terms clause extracted from terms of service
 */
export interface TermsClause {
  /** Clause type */
  type: 'arbitration' | 'auto-renewal' | 'liability' | 'content-license' | 'termination' | 'governing-law';
  /** Clause text */
  text: string;
  /** Severity level */
  severity: 'high' | 'medium' | 'low';
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * Terms extraction result
 */
export interface TermsExtraction {
  /** Extracted clauses */
  clauses: TermsClause[];
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * Mismatch reasoning result
 */
export interface MismatchReasoning {
  /** Capability being analyzed */
  capability: Capability;
  /** Relevance classification */
  relevance: 'relevant' | 'unclear' | 'potentially-excessive' | 'unrelated';
  /** Natural language reasoning */
  reasoning: string;
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * OpenJev classification result with all 4 classification types
 */
export interface OpenJevClassification {
  /** Consent decision classification */
  decision: 'allow' | 'ask' | 'deny';
  /** Decision confidence 0-1 */
  decisionConfidence: number;
  /** Excessiveness classification */
  excessiveness: 'excessive' | 'appropriate' | 'minimal';
  /** Excessiveness confidence 0-1 */
  excessivenessConfidence: number;
  /** Purpose match classification */
  purposeMatch: 'relevant' | 'unclear' | 'unrelated';
  /** Purpose match confidence 0-1 */
  purposeMatchConfidence: number;
  /** Sensitivity classification */
  sensitivity: 'high' | 'medium' | 'low';
  /** Sensitivity score 0-2 */
  sensitivityScore: 0 | 1 | 2;
  /** Evidence citations */
  evidence: EvidenceCitation[];
}

/**
 * AI Backend interface - mirrors PLUGIN-04 from Phase 1
 */
export interface AIBackend {
  /** Classify consent events */
  classify(events: Capability[]): Promise<OpenJevClassification[]>;
  /** Extract structured data from policy/terms text */
  extract(text: string, type: 'policy' | 'terms'): Promise<PolicyExtraction | TermsExtraction>;
  /** Reason about purpose/access mismatch */
  reason(events: Capability[], purpose: PurposeInference): Promise<MismatchReasoning[]>;
}

/**
 * Page context for AI analysis
 */
export interface PageContext {
  /** Page URL */
  url: string;
  /** Page origin */
  origin: string;
  /** Document title */
  title: string;
  /** Meta tags */
  metaTags: Record<string, string>;
  /** Heading texts */
  headings: string[];
  /** Main content text */
  mainContent: string;
}

/**
 * Complete AI analysis result from integration pipeline
 */
export interface AIAnalysisResult {
  /** Inferred page purpose */
  purpose: PurposeInference;
  /** Permission interpretations per capability */
  permissions: PermissionInterpretation[];
  /** Policy extraction if policy events exist */
  policy: PolicyExtraction | null;
  /** Terms extraction if terms events exist */
  terms: TermsExtraction | null;
  /** Mismatch reasoning per event */
  mismatches: MismatchReasoning[];
  /** OpenJev classifications per event */
  openjevClassifications: OpenJevClassification[];
  /** Cross-source natural language summary */
  summary: string;
  /** Mode used: 'openjev' or 'fallback' */
  mode: 'openjev' | 'fallback';
}