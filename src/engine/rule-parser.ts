/**
 * Rule Parser - parses uBlock-style rules into ParsedRule objects
 * Supports: `capability@domain = action` and `@@capability@domain` (exception)
 */

import type { ParsedRule, Decision, PrecedenceLayer } from './types.js';

/**
 * Parse a single uBlock-style rule string
 * Format: `capability@domain = action` or `@@capability@domain` (exception, implies allow)
 * @param ruleString - The rule string to parse
 * @returns ParsedRule object
 * @throws Error if syntax is invalid
 */
export function parseRule(ruleString: string): ParsedRule {
  const trimmed = ruleString.trim();
  
  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) {
    throw new Error('Empty or comment line');
  }
  
  // Check for exception rule (@@ prefix)
  const isException = trimmed.startsWith('@@');
  const workingString = isException ? trimmed.slice(2).trim() : trimmed;
  
  // Parse capability@domain = action
  // Find the last @ before the = (to handle @ in capability patterns like oauth.google)
  const equalsIndex = workingString.indexOf('=');
  if (equalsIndex === -1) {
    throw new Error(`Invalid rule syntax: missing '=' separator in "${ruleString}"`);
  }
  
  const leftSide = workingString.slice(0, equalsIndex).trim();
  const actionStr = workingString.slice(equalsIndex + 1).trim();
  
  // Parse action
  const action = parseAction(actionStr);
  
  // Parse capability@domain from left side
  // Split on last @ to handle capability patterns with dots
  const atIndex = leftSide.lastIndexOf('@');
  if (atIndex === -1) {
    throw new Error(`Invalid rule syntax: missing '@' separator in "${ruleString}"`);
  }
  
  const capabilityPattern = leftSide.slice(0, atIndex).trim();
  const domainPattern = leftSide.slice(atIndex + 1).trim();
  
  if (!capabilityPattern) {
    throw new Error(`Invalid rule syntax: empty capability pattern in "${ruleString}"`);
  }
  
  if (!domainPattern) {
    throw new Error(`Invalid rule syntax: empty domain pattern in "${ruleString}"`);
  }
  
  // For tracer, default precedence layer is 'user'
  const precedenceLayer: PrecedenceLayer = 'user';
  
  return {
    id: generateRuleId(trimmed),
    raw: trimmed,
    capabilityPattern,
    domainPattern,
    action,
    isException,
    precedenceLayer,
  };
}

/**
 * Parse action string to Decision type
 */
function parseAction(actionStr: string): Decision {
  const normalized = actionStr.toLowerCase();
  switch (normalized) {
    case 'allow':
      return 'allow';
    case 'ask':
      return 'ask';
    case 'deny':
      return 'deny';
    default:
      throw new Error(`Invalid action: "${actionStr}". Must be 'allow', 'ask', or 'deny'`);
  }
}

/**
 * Parse multiple rules from a text block
 * @param ruleText - Multi-line rule text
 * @returns Array of ParsedRule objects
 */
export function parseRules(ruleText: string): ParsedRule[] {
  const lines = ruleText.split('\n');
  const rules: ParsedRule[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) {
      continue;
    }
    
    try {
      const rule = parseRule(line);
      rules.push(rule);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Line ${i + 1}: ${err.message}`);
      }
      throw err;
    }
  }
  
  return rules;
}

/**
 * Generates a unique ID from a raw rule string
 */
function generateRuleId(raw: string): string {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `rule_${Math.abs(hash).toString(36)}`;
}