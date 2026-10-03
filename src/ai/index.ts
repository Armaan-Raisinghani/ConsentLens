/**
 * AI module barrel exports
 * All public AI types, classes, and functions
 */

// Evidence citations
export type { EvidenceCitation } from './evidence.js';
export {
  createDomEvidence,
  createPolicyEvidence,
  createTermsEvidence,
  createOAuthEvidence,
  createCookieEvidence,
  createOpenJevEvidence,
  combineEvidence,
} from './evidence.js';

// Core AI types
export type {
  PurposeInference,
  PermissionInterpretation,
  DataPractice,
  PolicyExtraction,
  TermsClause,
  TermsExtraction,
  MismatchReasoning,
  OpenJevClassification,
  AIBackend,
  PageContext,
  AIAnalysisResult,
} from './types.js';

// OpenJev types
export type {
  BaseQuestion,
  NouQuestion,
  ChoiceQuestion,
  ScoreQuestion,
  Question,
  BaseAnswer,
  NouAnswer,
  ChoiceAnswer,
  ScoreAnswer,
  Answer,
  OpenJevRequest,
  OpenJevResponse,
} from './openjev-types.js';
export {
  buildDecisionQuestion,
  buildExcessivenessQuestion,
  buildPurposeMatchQuestion,
  buildSensitivityQuestion,
} from './openjev-types.js';

// OpenJev client
export { OpenJevClient, OpenJevError } from './openjev-client.js';
export type { OpenJevClientConfig } from './openjev-client.js';

// AI Engines
export { PurposeInferenceEngine } from './purpose-inference.js';
export { PermissionInterpretationEngine } from './permission-interpretation.js';
export { PolicyExtractionEngine } from './policy-extraction.js';
export { TermsExtractionEngine } from './terms-extraction.js';
export { MismatchReasoningEngine } from './mismatch-reasoning.js';

// Fallback heuristics
export { FallbackHeuristics } from './fallback-heuristics.js';

// Backend adapter
export { OpenJevAIBackend, initializeOpenJevBackend, getDefaultOpenJevBackend } from './backend-adapter.js';
export { registerAIBackend } from '../plugins/ai-backend-plugin.js';