/**
 * Policy Extractor Plugin Interface - per PLUGIN-03
 * Allows custom policy parsing logic
 */

import type { Evidence } from '../ir/evidence.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import type { PageContext } from '../shared/errors.js';

/**
 * Policy practice enumeration matching PolicyAdapter
 */
export enum PolicyPractice {
  DataCollection = 'data-collection',
  DataSharing = 'data-sharing',
  DataSelling = 'data-selling',
  AiTraining = 'ai-training',
  Retention = 'retention',
  ThirdParties = 'third-parties',
  UserRights = 'user-rights',
  Security = 'security',
  InternationalTransfer = 'international-transfer',
  AutomatedDecision = 'automated-decision',
  Cookies = 'cookies',
  Marketing = 'marketing',
  Analytics = 'analytics',
  Personalization = 'personalization',
  Unknown = 'unknown',
}

/**
 * Extracted policy practice with metadata
 */
export interface ExtractedPolicyPractice {
  practice: PolicyPractice;
  text: string;
  confidence: number;
  source: string;
  severity?: 'high' | 'medium' | 'low';
  metadata?: Record<string, unknown>;
}

/**
 * Policy extractor function signature
 * Takes policy text and URL, returns array of extracted practices
 */
export type PolicyExtractorFn = (text: string, url: string, context: PageContext) => ExtractedPolicyPractice[];

/**
 * Global policy extractor registry
 */
const policyExtractorRegistry = new Map<string, PolicyExtractorFn>();

/**
 * Registers a custom policy extractor
 * 
 * @param name - Unique extractor name
 * @param fn - Extractor function that returns array of extracted practices
 * 
 * @example
 * ```typescript
 * registerPolicyExtractor('my-gdpr-extractor', (text, url, context) => {
 *   const practices = [];
 *   if (text.includes('right to be forgotten')) {
 *     practices.push({
 *       practice: PolicyPractice.UserRights,
 *       text: 'Right to erasure (right to be forgotten)',
 *       confidence: 0.95,
 *       source: 'gdpr-extractor',
 *       severity: 'high',
 *     });
 *   }
 *   return practices;
 * });
 * ```
 */
export function registerPolicyExtractor(name: string, fn: PolicyExtractorFn): void {
  if (policyExtractorRegistry.has(name)) {
    throw new Error(`Policy extractor '${name}' already registered`);
  }
  policyExtractorRegistry.set(name, fn);
}

/**
 * Unregisters a policy extractor by name
 */
export function unregisterPolicyExtractor(name: string): boolean {
  return policyExtractorRegistry.delete(name);
}

/**
 * Gets a policy extractor by name
 */
export function getPolicyExtractor(name: string): PolicyExtractorFn | undefined {
  return policyExtractorRegistry.get(name);
}

/**
 * Gets all registered policy extractors
 */
export function getAllPolicyExtractors(): PolicyExtractorFn[] {
  return [...policyExtractorRegistry.values()];
}

/**
 * Clears all policy extractors
 */
export function clearPolicyExtractors(): void {
  policyExtractorRegistry.clear();
}

/**
 * Extracts policy practices using all registered extractors
 * Combines results from all extractors, deduplicating by practice type
 */
export function extractPolicyPractices(text: string, url: string, context: PageContext): ExtractedPolicyPractice[] {
  const allPractices: ExtractedPolicyPractice[] = [];
  const seen = new Set<string>();
  
  for (const fn of policyExtractorRegistry.values()) {
    const practices = fn(text, url, context);
    for (const practice of practices) {
      const key = `${practice.practice}:${practice.text.substring(0, 100)}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPractices.push(practice);
      }
    }
  }
  
  return allPractices;
}

/**
 * Creates a ConsentEvent for an extracted policy practice
 * Used by PolicyAdapter to integrate with policy extractor plugins
 */
export function createPolicyExtractorConsentEvent(params: {
  website: string;
  practice: ExtractedPolicyPractice;
  evidence: Evidence[];
  policyUrl: string;
  timestamp?: string;
}): ConsentEvent {
  const { createPolicyCapability } = require('../ir/capability.js');
  const { ConsentType, GrantStatus } = require('../shared/types.js');
  
  return {
    website: params.website,
    consentType: ConsentType.Policy,
    capability: createPolicyCapability(params.practice.practice),
    timestamp: params.timestamp ?? new Date().toISOString(),
    grantStatus: GrantStatus.Pending,
    evidence: params.evidence,
    userAction: `policy:extractor-${params.practice.source}`,
    resource: params.policyUrl,
    policyEvidence: params.practice.text,
  };
}