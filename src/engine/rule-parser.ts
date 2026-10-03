/**
 * Rule Parser - parses uBlock-style rules into ParsedRule objects
 * Supports all ENGINE-01, ENGINE-03, ENGINE-04, ENGINE-05 syntax variants:
 * - Basic: `capability@domain = action`
 * - Exception: `@@capability@domain` (action implied allow)
 * - Wildcard domain: `*.example.com`
 * - Suffix domain: `example.com` (matches sub.example.com)
 * - Regex domain: `/pattern/flags`
 * - Category wildcard capability: `cookie.*`, `oauth.google.*`
 * - Comments: `! comment` and inline `# comment`
 * - Empty/whitespace lines skipped
 */

import type { ParsedRule, Decision, PrecedenceLayer } from './types.js';

/**
 * Parsed components of a rule before creating ParsedRule
 */
interface ParsedComponents {
  isException: boolean;
  capabilityPattern: string;
  domainPattern: string;
  action: Decision;
  precedenceLayer: PrecedenceLayer;
  raw: string;
}

/**
 * Parse a single uBlock-style rule string
 * @param ruleString - The rule string to parse
 * @returns ParsedRule object
 * @throws Error if syntax is invalid with position info
 */
export function parseRule(ruleString: string): ParsedRule {
  let trimmed = ruleString.trim();
  
  // Handle inline comments (# comment)
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex >= 0) {
    trimmed = trimmed.slice(0, hashIndex).trim();
  }
  
  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) {
    throw new Error('Empty or comment line');
  }
  
  const components = parseRuleComponents(ruleString, trimmed);
  
  return {
    id: generateRuleId(trimmed),
    raw: components.raw,
    capabilityPattern: components.capabilityPattern,
    domainPattern: components.domainPattern,
    action: components.action,
    isException: components.isException,
    precedenceLayer: components.precedenceLayer,
  };
}

/**
 * Parse rule into components with detailed error handling
 */
function parseRuleComponents(original: string, trimmed: string): ParsedComponents {
  // Check for exception rule (@@ prefix)
  const isException = trimmed.startsWith('@@');
  let workingString = isException ? trimmed.slice(2).trim() : trimmed;
  
  // For exception rules, action is implied 'allow' and there's no = separator
  let action: Decision = 'allow';
  let leftSide = workingString;
  
  if (!isException) {
    // Find the = separator (last one to handle = in regex patterns)
    const equalsIndex = findEqualsSeparator(workingString);
    if (equalsIndex === -1) {
      throw createSyntaxError(original, 'missing \'=\' separator', trimmed.length);
    }
    
    leftSide = workingString.slice(0, equalsIndex).trim();
    const actionStr = workingString.slice(equalsIndex + 1).trim();
    action = parseAction(actionStr, original);
  }
  
  // Parse capability@domain from left side
  // Split on last @ to handle capability patterns with dots (e.g., oauth.google)
  const atIndex = leftSide.lastIndexOf('@');
  if (atIndex === -1) {
    throw createSyntaxError(original, 'missing \'@\' separator', atIndex);
  }
  
  const capabilityPattern = leftSide.slice(0, atIndex).trim();
  const domainPattern = leftSide.slice(atIndex + 1).trim();
  
  if (!capabilityPattern) {
    throw createSyntaxError(original, 'empty capability pattern', atIndex);
  }
  
  if (!domainPattern) {
    throw createSyntaxError(original, 'empty domain pattern', trimmed.length);
  }
  
  // Validate capability pattern syntax
  validateCapabilityPattern(capabilityPattern, original);
  
  // Validate domain pattern syntax
  validateDomainPattern(domainPattern, original);
  
  // Default precedence layer is 'user'
  const precedenceLayer: PrecedenceLayer = 'user';
  
  return {
    isException,
    capabilityPattern,
    domainPattern,
    action,
    precedenceLayer,
    raw: trimmed,
  };
}

/**
 * Find the = separator that separates left side from action
 * Handles regex patterns that may contain =
 */
function findEqualsSeparator(str: string): number {
  // Look for = that is not inside a regex pattern (/.../)
  let inRegex = false;
  let regexDelimiter = '';
  
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str[i];
    
    if (char === '/' && (i === 0 || str[i - 1] !== '\\')) {
      if (!inRegex) {
        inRegex = true;
        regexDelimiter = '/';
      } else if (regexDelimiter === '/') {
        inRegex = false;
      }
    }
    
    if (char === '=' && !inRegex) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Parse action string to Decision type
 */
function parseAction(actionStr: string, original: string): Decision {
  const normalized = actionStr.toLowerCase().trim();
  switch (normalized) {
    case 'allow':
      return 'allow';
    case 'ask':
      return 'ask';
    case 'deny':
      return 'deny';
    default:
      throw createSyntaxError(original, `invalid action: "${actionStr}". Must be 'allow', 'ask', or 'deny'`, original.length - actionStr.length);
  }
}

/**
 * Validate capability pattern syntax
 * Supports: exact (oauth.google), category wildcard (cookie.*), provider wildcard (oauth.google.*), full wildcard (*)
 */
function validateCapabilityPattern(pattern: string, original: string): void {
  if (pattern === '*') return; // Full wildcard
  
  const parts = pattern.split('.');
  if (parts.length < 2) {
    throw createSyntaxError(original, `invalid capability pattern: "${pattern}". Expected format: type.provider or type.* or type.provider.*`, 0);
  }
  
  const [type, ...rest] = parts;
  const typeStr: string = type as string; // parts.length >= 2 guaranteed by check above
  const validTypes = ['oauth', 'cookie', 'browser-permission', 'policy', 'terms'];
  if (!validTypes.includes(typeStr)) {
    throw createSyntaxError(original, `unknown capability type: "${typeStr}". Valid types: ${validTypes.join(', ')}`, 0);
  }
  
  // Check wildcard patterns
  if (rest.includes('*')) {
    const starIndex = rest.indexOf('*');
    if (starIndex !== rest.length - 1) {
      throw createSyntaxError(original, `wildcard * must be at the end of capability pattern: "${pattern}"`, 0);
    }
  }
}

/**
 * Validate domain pattern syntax
 * Supports: exact (example.com), suffix (example.com), wildcard (*.example.com), regex (/pattern/flags)
 */
function validateDomainPattern(pattern: string, original: string): void {
  if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
    // Regex pattern: /pattern/flags
    const lastSlash = pattern.lastIndexOf('/');
    const regexPattern = pattern.slice(1, lastSlash);
    const flags = pattern.slice(lastSlash + 1);
    
    if (!regexPattern) {
      throw createSyntaxError(original, 'empty regex pattern', 0);
    }
    
    // Validate regex
    try {
      new RegExp(regexPattern, flags);
    } catch (e) {
      throw createSyntaxError(original, `invalid regex: ${e instanceof Error ? e.message : String(e)}`, 0);
    }
    
    // Validate flags
    const validFlags = 'gimsuy';
    for (const flag of flags) {
      if (!validFlags.includes(flag)) {
        throw createSyntaxError(original, `invalid regex flag: "${flag}". Valid flags: ${validFlags}`, 0);
      }
    }
    return;
  }
  
  // Wildcard domain: *.example.com
  if (pattern.startsWith('*.')) {
    if (pattern.length <= 2) {
      throw createSyntaxError(original, 'wildcard domain pattern too short: "*.example.com"', 0);
    }
    return;
  }
  
  // Suffix/exact domain: example.com or sub.example.com
  // Basic validation: must contain at least one dot for domain-like patterns
  if (!pattern.includes('.') && pattern !== '*') {
    throw createSyntaxError(original, `domain pattern should contain a dot: "${pattern}"`, 0);
  }
}

/**
 * Create a syntax error with position information
 */
function createSyntaxError(original: string, message: string, position: number): Error {
  const lines = original.split('\n');
  let charPos = 0;
  let lineNum = 1;
  let colNum = 1;
  
  for (const line of lines) {
    if (charPos + line.length >= position) {
      colNum = position - charPos + 1;
      break;
    }
    charPos += line.length + 1; // +1 for newline
    lineNum++;
  }
  
  return new Error(`Line ${lineNum}, col ${colNum}: ${message}`);
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
    
    // Handle inline comments (# comment)
    const hashIndex = trimmed.indexOf('#');
    const rulePart = hashIndex >= 0 ? trimmed.slice(0, hashIndex).trim() : trimmed;
    
    if (!rulePart) {
      continue; // Line was only a comment
    }
    
    try {
      const rule = parseRule(rulePart);
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