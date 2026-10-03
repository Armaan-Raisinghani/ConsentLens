/**
 * Engine module exports - deterministic policy engine
 */

// Types
export type {
  Decision,
  PrecedenceLayer,
  ParsedRule,
  MatchResult,
  EngineDecision,
  TTLType,
  TTLRule,
  Explanation,
  ExplanationDetail,
} from './types.js';

export {
  PRECEDENCE_WEIGHTS,
  generateRuleId,
} from './types.js';

// Rule Parser
export {
  parseRule,
  parseRules,
} from './rule-parser.js';

// Rule Matcher
export {
  matchRule,
  matchDomain,
  matchCapability,
  extractDomain,
} from './rule-matcher.js';

// Decision Engine
export {
  DecisionEngine,
} from './decision-engine.js';

// Temporary Rules
export {
  TemporaryRuleManager,
} from './temporary-rules.js';

// Explanation
export {
  ExplanationGenerator,
} from './explanation.js';