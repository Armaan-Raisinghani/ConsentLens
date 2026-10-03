/**
 * EvidenceCitation type and helpers for AI outputs per AI-08
 * All AI outputs must include evidence citations for traceability
 */

import type { EvidenceSource, ExtractionMethod } from '../shared/types.js';

/**
 * EvidenceCitation - standardized citation for AI outputs
 * Sources: dom, policy, terms, oauth-url, cookie, openjev
 */
export interface EvidenceCitation {
  /** Source of the evidence */
  source: 'dom' | 'policy' | 'terms' | 'oauth-url' | 'cookie' | 'openjev';
  /** CSS selector for DOM elements */
  selector?: string;
  /** Text span with character offsets */
  textSpan?: { start: number; end: number };
  /** URL reference (policy, terms, OAuth) */
  url?: string;
  /** Policy/terms section header */
  section?: string;
  /** OAuth scope string */
  scope?: string;
  /** Cookie name and domain */
  cookie?: { name: string; domain: string };
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * Creates a DOM-based evidence citation
 */
export function createDomEvidence(
  selector: string,
  text: string,
  confidence: number
): EvidenceCitation {
  return {
    source: 'dom',
    selector,
    textSpan: { start: 0, end: text.length },
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Creates a policy-based evidence citation
 */
export function createPolicyEvidence(
  url: string,
  section: string,
  confidence: number
): EvidenceCitation {
  return {
    source: 'policy',
    url,
    section,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Creates a terms-based evidence citation
 */
export function createTermsEvidence(
  url: string,
  clause: string,
  confidence: number
): EvidenceCitation {
  return {
    source: 'terms',
    url,
    section: clause,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Creates an OAuth URL-based evidence citation
 */
export function createOAuthEvidence(
  url: string,
  scope: string,
  confidence: number
): EvidenceCitation {
  return {
    source: 'oauth-url',
    url,
    scope,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Creates a cookie-based evidence citation
 */
export function createCookieEvidence(
  name: string,
  domain: string,
  confidence: number
): EvidenceCitation {
  return {
    source: 'cookie',
    cookie: { name, domain },
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Creates an OpenJev API-based evidence citation
 */
export function createOpenJevEvidence(confidence: number): EvidenceCitation {
  return {
    source: 'openjev',
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Combines multiple evidence citations into a single array
 */
export function combineEvidence(...citations: EvidenceCitation[]): EvidenceCitation[] {
  return citations.filter(Boolean);
}