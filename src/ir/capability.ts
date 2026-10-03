/**
 * Capability taxonomy - structured objects per D-07
 */

/**
 * Base capability interface
 */
export interface BaseCapability {
  type: string;
}

/**
 * OAuth capability - for OAuth consent flows
 */
export interface OAuthCapability extends BaseCapability {
  type: 'oauth';
  provider: string;
  scope: string[];
}

/**
 * Browser permission capability - for browser permission prompts
 */
export interface BrowserPermissionCapability extends BaseCapability {
  type: 'browser-permission';
  permission: string;
}

/**
 * Cookie capability - for cookie consent
 */
export interface CookieCapability extends BaseCapability {
  type: 'cookie';
  category: string;
  name?: string;
  domain?: string;
}

/**
 * Policy capability - for privacy policy clauses
 */
export interface PolicyCapability extends BaseCapability {
  type: 'policy';
  practice: string;
}

/**
 * Terms capability - for terms of service clauses
 */
export interface TermsCapability extends BaseCapability {
  type: 'terms';
  clause: string;
}

/**
 * Discriminated union of all capability types
 */
export type Capability =
  | OAuthCapability
  | BrowserPermissionCapability
  | CookieCapability
  | PolicyCapability
  | TermsCapability;

/**
 * Type guard for OAuthCapability
 */
export function isOAuthCapability(cap: Capability): cap is OAuthCapability {
  return cap.type === 'oauth';
}

/**
 * Type guard for BrowserPermissionCapability
 */
export function isBrowserPermissionCapability(
  cap: Capability
): cap is BrowserPermissionCapability {
  return cap.type === 'browser-permission';
}

/**
 * Type guard for CookieCapability
 */
export function isCookieCapability(cap: Capability): cap is CookieCapability {
  return cap.type === 'cookie';
}

/**
 * Type guard for PolicyCapability
 */
export function isPolicyCapability(cap: Capability): cap is PolicyCapability {
  return cap.type === 'policy';
}

/**
 * Type guard for TermsCapability
 */
export function isTermsCapability(cap: Capability): cap is TermsCapability {
  return cap.type === 'terms';
}

/**
 * Creates an OAuth capability
 */
export function createOAuthCapability(
  provider: string,
  scope: string[]
): OAuthCapability {
  return {
    type: 'oauth',
    provider: provider.toLowerCase(),
    scope: [...new Set(scope.map(s => s.trim()).filter(Boolean))],
  };
}

/**
 * Creates a browser permission capability
 */
export function createBrowserPermissionCapability(
  permission: string
): BrowserPermissionCapability {
  return {
    type: 'browser-permission',
    permission,
  };
}

/**
 * Creates a cookie capability
 */
export function createCookieCapability(
  category: string,
  name?: string,
  domain?: string
): CookieCapability {
  return {
    type: 'cookie',
    category,
    name,
    domain,
  };
}

/**
 * Creates a policy capability
 */
export function createPolicyCapability(practice: string): PolicyCapability {
  return {
    type: 'policy',
    practice,
  };
}

/**
 * Creates a terms capability
 */
export function createTermsCapability(clause: string): TermsCapability {
  return {
    type: 'terms',
    clause,
  };
}