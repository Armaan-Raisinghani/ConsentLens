/**
 * Rule Matcher - matches ParsedRule against ConsentEvent
 * Implements domain and capability matching per ENGINE-03 and ENGINE-04
 */

import type { ParsedRule, MatchResult } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import type { Capability } from '../ir/capability.js';
import { isOAuthCapability } from '../ir/capability.js';

/**
 * Match a rule against a ConsentEvent
 * @param rule - The parsed rule to match
 * @param event - The consent event to match against
 * @returns MatchResult with match details
 */
export function matchRule(rule: ParsedRule, event: ConsentEvent): MatchResult {
  // Domain matching (exact match for tracer)
  const domainMatched = matchDomain(rule.domainPattern, event.website);
  
  // Capability matching (exact match for tracer)
  const capabilityMatched = matchCapability(rule.capabilityPattern, event.capability);
  
  const matched = domainMatched && capabilityMatched;
  
  return {
    matched,
    rule,
    capabilityMatched,
    domainMatched,
  };
}

/**
 * Match domain pattern against a website URL/domain
 * For tracer: exact match only
 * @param pattern - Domain pattern from rule
 * @param website - Website URL from ConsentEvent
 * @returns true if domain matches
 */
export function matchDomain(pattern: string, website: string): boolean {
  // Extract domain from website URL
  const domain = extractDomain(website);
  
  // For tracer: exact match (case-insensitive)
  return pattern.toLowerCase() === domain.toLowerCase();
}

/**
 * Match capability pattern against a Capability object
 * For tracer: exact match for oauth.google
 * @param pattern - Capability pattern from rule (e.g., "oauth.google")
 * @param capability - Capability from ConsentEvent
 * @returns true if capability matches
 */
export function matchCapability(pattern: string, capability: Capability): boolean {
  // For tracer: exact match for oauth capabilities
  if (pattern === 'oauth.google') {
    return isOAuthCapability(capability) && capability.provider === 'google';
  }
  
  // Fallback: string comparison (will be expanded in Task 3)
  return pattern === capabilityToString(capability);
}

/**
 * Convert Capability to string for comparison
 */
function capabilityToString(capability: Capability): string {
  switch (capability.type) {
    case 'oauth':
      return `oauth.${capability.provider}`;
    case 'browser-permission':
      return `browser-permission.${capability.permission}`;
    case 'cookie':
      return `cookie.${capability.category}`;
    case 'policy':
      return `policy.${capability.practice}`;
    case 'terms':
      return `terms.${capability.clause}`;
    default:
      // Exhaustiveness check - TypeScript will error if new types are added
      const _exhaustive: never = capability;
      return _exhaustive;
  }
}

/**
 * Extract domain from a website URL
 * e.g., "https://drive.google.com/path" -> "drive.google.com"
 */
function extractDomain(website: string): string {
  try {
    const url = new URL(website);
    return url.hostname;
  } catch {
    // If not a valid URL, return as-is (might already be a domain)
    return website;
  }
}