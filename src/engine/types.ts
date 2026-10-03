/**
 * Engine types - core type definitions for the deterministic policy engine
 */

/**
 * Decision type returned by the policy engine
 */
export type Decision = 'allow' | 'ask' | 'deny';

/**
 * Precedence layer for rule ordering (uBlock-style)
 * Higher precedence (user > trusted > community > defaults) wins
 */
export type PrecedenceLayer = 'user' | 'trusted' | 'community' | 'defaults';

/**
 * Parsed rule structure from uBlock-style syntax
 * Format: `capability@domain = action` or `@@capability@domain` (exception)
 */
export interface ParsedRule {
  /** Unique identifier generated from raw rule */
  id: string;
  /** Original raw rule string */
  raw: string;
  /** Capability pattern (e.g., "oauth.google", "cookie.*", "*") */
  capabilityPattern: string;
  /** Domain pattern (e.g., "drive.google.com", "*.google.com", "/pattern/") */
  domainPattern: string;
  /** Action to take when rule matches */
  action: Decision;
  /** Whether this is an exception rule (@@ prefix) */
  isException: boolean;
  /** Precedence layer for conflict resolution */
  precedenceLayer: PrecedenceLayer;
}

/**
 * Result of matching a rule against a ConsentEvent
 */
export interface MatchResult {
  /** Whether the rule matched the event */
  matched: boolean;
  /** The rule that was matched */
  rule: ParsedRule;
  /** Whether the capability pattern matched */
  capabilityMatched: boolean;
  /** Whether the domain pattern matched */
  domainMatched: boolean;
}

/**
 * Decision returned by the DecisionEngine
 */
export interface EngineDecision {
  /** The decision: allow, ask, or deny */
  decision: Decision;
  /** The rule that matched (if any) */
  matchedRule?: ParsedRule;
  /** Human-readable explanation of the decision */
  explanation: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Precedence weight for sorting rules
 * Higher weight = higher precedence
 */
export const PRECEDENCE_WEIGHTS: Record<PrecedenceLayer, number> = {
  user: 1000,
  trusted: 100,
  community: 10,
  defaults: 1,
};

/**
 * RuleSet - a collection of rules at a specific precedence layer
 */
export interface RuleSet {
  layer: PrecedenceLayer;
  rules: ParsedRule[];
}

/**
 * Generates a unique ID from a raw rule string
 */
export function generateRuleId(raw: string): string {
  // Simple hash-based ID generation
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `rule_${Math.abs(hash).toString(36)}`;
}