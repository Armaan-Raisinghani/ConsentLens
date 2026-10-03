/**
 * Rule Matcher - matches ParsedRule against ConsentEvent
 * Implements full domain and capability matching per ENGINE-03 and ENGINE-04
 */

import type { ParsedRule, MatchResult } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import type { Capability, OAuthCapability, CookieCapability, BrowserPermissionCapability, PolicyCapability, TermsCapability } from '../ir/capability.js';
import { isOAuthCapability, isCookieCapability, isBrowserPermissionCapability, isPolicyCapability, isTermsCapability } from '../ir/capability.js';

/**
 * Match a rule against a ConsentEvent
 * @param rule - The parsed rule to match
 * @param event - The consent event to match against
 * @returns MatchResult with match details
 */
export function matchRule(rule: ParsedRule, event: ConsentEvent): MatchResult {
  const domainMatched = matchDomain(rule.domainPattern, event.website);
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
 * Supports: exact, suffix, wildcard (*.example.com), regex (/pattern/flags)
 * @param pattern - Domain pattern from rule
 * @param website - Website URL from ConsentEvent
 * @returns true if domain matches
 */
export function matchDomain(pattern: string, website: string): boolean {
  // Extract domain from website URL
  const domain = extractDomain(website).toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  
  // Regex pattern: /pattern/flags
  if (normalizedPattern.startsWith('/') && normalizedPattern.lastIndexOf('/') > 0) {
    return matchRegexDomain(normalizedPattern, domain);
  }
  
  // Wildcard pattern: *.example.com
  if (normalizedPattern.startsWith('*.')) {
    return matchWildcardDomain(normalizedPattern, domain);
  }
  
  // Suffix/exact pattern: example.com (matches sub.example.com and example.com per uBlock)
  return matchSuffixDomain(normalizedPattern, domain);
}

/**
 * Match regex domain pattern
 */
function matchRegexDomain(pattern: string, domain: string): boolean {
  const lastSlash = pattern.lastIndexOf('/');
  const regexPattern = pattern.slice(1, lastSlash);
  const flags = pattern.slice(lastSlash + 1);
  
  try {
    const regex = new RegExp(regexPattern, flags);
    return regex.test(domain);
  } catch {
    return false;
  }
}

/**
 * Match wildcard domain pattern: *.example.com
 * Matches sub.example.com, a.b.example.com but NOT example.com
 */
function matchWildcardDomain(pattern: string, domain: string): boolean {
  // Pattern is *.example.com, extract example.com
  const suffix = pattern.slice(2); // Remove *.
  
  // Domain must end with .suffix and have at least one subdomain
  return domain.endsWith('.' + suffix) && domain !== suffix;
}

/**
 * Match suffix domain pattern: example.com
 * Matches example.com, sub.example.com, a.b.example.com (per uBlock semantics)
 */
function matchSuffixDomain(pattern: string, domain: string): boolean {
  // Exact match or subdomain match
  return domain === pattern || domain.endsWith('.' + pattern);
}

/**
 * Match capability pattern against a Capability object
 * Supports: exact, category wildcard (oauth.*), provider wildcard (oauth.google.*), full wildcard (*)
 * @param pattern - Capability pattern from rule
 * @param capability - Capability from ConsentEvent
 * @returns true if capability matches
 */
export function matchCapability(pattern: string, capability: Capability): boolean {
  // Full wildcard: * matches everything
  if (pattern === '*') {
    return true;
  }
  
  const parts = pattern.split('.');
  if (parts.length < 2) {
    return false;
  }
  
  const [type, ...rest] = parts;
  const hasWildcard = rest.includes('*');
  const wildcardIndex = rest.indexOf('*');
  
  // Category wildcard: type.* (e.g., oauth.*, cookie.*)
  if (hasWildcard && wildcardIndex === rest.length - 1 && rest.length === 1) {
    return capability.type === type;
  }
  
  // Provider wildcard: type.provider.* (e.g., oauth.google.*)
  if (hasWildcard && wildcardIndex === rest.length - 1 && rest.length === 2) {
    const provider: string = rest[0]!; // non-null assertion, rest.length === 2
    return matchProviderWildcard(type, provider, capability);
  }
  
  // Exact match: type.provider (e.g., oauth.google) or type.provider.scope (e.g., oauth.google.drive)
  return matchExactCapability(pattern, capability);
}

/**
 * Match provider wildcard pattern (e.g., oauth.google.*)
 */
function matchProviderWildcard(type: string, provider: string, capability: Capability): boolean {
  if (capability.type !== type) return false;
  
  switch (type) {
    case 'oauth':
      return isOAuthCapability(capability) && capability.provider === provider;
    case 'cookie':
      return isCookieCapability(capability) && capability.category === provider;
    default:
      return false;
  }
}

/**
 * Match exact capability pattern
 */
function matchExactCapability(pattern: string, capability: Capability): boolean {
  const parts = pattern.split('.');
  const [type, ...rest] = parts;
  
  if (capability.type !== type) return false;
  
  switch (type) {
    case 'oauth': {
      if (!isOAuthCapability(capability)) return false;
      // oauth.google or oauth.google.drive
      if (rest.length === 1) {
        return capability.provider === (rest[0] as string);
      }
      if (rest.length === 2) {
        const provider = rest[0] as string;
        const scope = rest[1] as string;
        return capability.provider === provider && capability.scope.some(s => s.includes(scope) || scope.includes(s));
      }
      return false;
    }
    
    case 'browser-permission': {
      if (!isBrowserPermissionCapability(capability)) return false;
      return capability.permission === rest.join('.');
    }
    
    case 'cookie': {
      if (!isCookieCapability(capability)) return false;
      // cookie.analytics or cookie.analytics._ga
      if (rest.length === 1) {
        return capability.category === (rest[0] as string);
      }
      if (rest.length === 2) {
        return capability.category === (rest[0] as string) && capability.name === (rest[1] as string);
      }
      return false;
    }
    
    case 'policy': {
      if (!isPolicyCapability(capability)) return false;
      return capability.practice === rest.join('.');
    }
    
    case 'terms': {
      if (!isTermsCapability(capability)) return false;
      return capability.clause === rest.join('.');
    }
    
    default:
      return false;
  }
}

/**
 * Extract domain from a website URL
 * e.g., "https://drive.google.com/path" -> "drive.google.com"
 */
export function extractDomain(website: string): string {
  try {
    const url = new URL(website);
    return url.hostname;
  } catch {
    // If not a valid URL, return as-is (might already be a domain)
    return website;
  }
}