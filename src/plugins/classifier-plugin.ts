/**
 * Classifier Plugin Interface - per PLUGIN-02
 * Allows custom cookie/tracker classification functions
 */

import type { Capability, CookieCapability } from '../ir/capability.js';
import type { Evidence } from '../ir/evidence.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import type { AdapterResult, PageContext } from '../shared/errors.js';

/**
 * Parsed cookie structure for classification
 */
export interface ParsedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: Date;
  maxAge?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none' | 'unknown';
  isSession: boolean;
}

/**
 * Cookie category enumeration matching CookieAdapter
 */
export enum CookieCategory {
  Essential = 'essential',
  Analytics = 'analytics',
  Advertising = 'advertising',
  Personalization = 'personalization',
  Functional = 'functional',
  Security = 'security',
  Unknown = 'unknown',
}

/**
 * Classification result
 */
export interface ClassificationResult {
  category: CookieCategory;
  confidence: number;
  source: string;
  metadata?: Record<string, unknown>;
}

/**
 * Classifier function signature
 * Takes a parsed cookie and returns classification or null to use default
 */
export type ClassifierFn = (cookie: ParsedCookie, context: PageContext) => ClassificationResult | null;

/**
 * Global classifier registry
 */
const classifierRegistry = new Map<string, ClassifierFn>();

/**
 * Registers a custom cookie classifier
 * 
 * @param name - Unique classifier name
 * @param fn - Classifier function that returns classification or null for default
 * 
 * @example
 * ```typescript
 * registerClassifier('my-custom-classifier', (cookie, context) => {
 *   if (cookie.name.startsWith('_custom_')) {
 *     return { category: CookieCategory.Analytics, confidence: 0.9, source: 'custom' };
 *   }
 *   return null; // Use default classification
 * });
 * ```
 */
export function registerClassifier(name: string, fn: ClassifierFn): void {
  if (classifierRegistry.has(name)) {
    throw new Error(`Classifier '${name}' already registered`);
  }
  classifierRegistry.set(name, fn);
}

/**
 * Unregisters a classifier by name
 */
export function unregisterClassifier(name: string): boolean {
  return classifierRegistry.delete(name);
}

/**
 * Gets a classifier by name
 */
export function getClassifier(name: string): ClassifierFn | undefined {
  return classifierRegistry.get(name);
}

/**
 * Gets all registered classifiers
 */
export function getAllClassifiers(): ClassifierFn[] {
  return [...classifierRegistry.values()];
}

/**
 * Clears all classifiers
 */
export function clearClassifiers(): void {
  classifierRegistry.clear();
}

/**
 * Classifies a cookie using all registered classifiers in order
 * Returns the first non-null result, or null if no classifier handles it
 */
export function classifyCookie(cookie: ParsedCookie, context: PageContext): ClassificationResult | null {
  for (const fn of classifierRegistry.values()) {
    const result = fn(cookie, context);
    if (result) {
      return result;
    }
  }
  return null;
}

/**
 * Creates a ConsentEvent for a classified cookie
 * Used by CookieAdapter to integrate with classifier plugins
 */
export function createClassifierConsentEvent(params: {
  website: string;
  cookie: ParsedCookie;
  classification: ClassificationResult;
  evidence: Evidence[];
  timestamp?: string;
}): ConsentEvent {
  const { createCookieCapability } = require('../ir/capability.js');
  const { ConsentType, GrantStatus } = require('../shared/types.js');
  
  return {
    website: params.website,
    consentType: ConsentType.Cookie,
    capability: createCookieCapability(params.classification.category, params.cookie.name, params.cookie.domain),
    cookieCategory: params.classification.category,
    timestamp: params.timestamp ?? new Date().toISOString(),
    grantStatus: GrantStatus.Pending,
    evidence: params.evidence,
    userAction: `cookie:classifier-${params.classification.source}`,
    resource: params.cookie.domain,
  };
}