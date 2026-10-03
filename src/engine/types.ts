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
  /** The precedence layer where the match was found */
  matchedLayer?: PrecedenceLayer | 'exception';
  /** Human-readable explanation of the decision */
  explanation: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * PolicyPack interface - defines a named collection of rules
 */
export interface PolicyPack {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this pack does */
  description: string;
  /** Version string */
  version: string;
  /** Array of rule strings in uBlock syntax */
  rules: string[];
  /** Precedence layer for this pack */
  layer: PrecedenceLayer;
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
 * TTL Type for temporary rules
 */
export type TTLType = 'session' | '1hr' | '24hr' | 'custom';

/**
 * TTL Rule interface extending ParsedRule with expiry information
 */
export interface TTLRule extends ParsedRule {
  /** Expiry timestamp in milliseconds since epoch */
  expiresAt: number;
  /** TTL type */
  ttlType: TTLType;
  /** Creation timestamp in milliseconds since epoch */
  createdAt: number;
}

/**
 * Explanation interface - human-readable decision explanation
 */
export interface Explanation {
  /** The decision made */
  decision: Decision;
  /** The matched rule string (raw) */
  matchedRule: string;
  /** The precedence layer where the match was found */
  matchedLayer: PrecedenceLayer | 'exception';
  /** Capability being requested */
  capability: string;
  /** Domain where the request originated */
  domain: string;
  /** The action taken */
  action: Decision;
  /** Confidence score (0-1) */
  confidence: number;
  /** Human-readable explanation string */
  humanReadable: string;
  /** Evidence from the consent event */
  evidence: string[];
}

/**
 * Explanation detail for structured breakdown
 */
export type ExplanationDetail = {
  ruleType: 'user' | 'trusted' | 'community' | 'defaults' | 'exception';
  ruleString: string;
  layer: string;
  reason: string;
};

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