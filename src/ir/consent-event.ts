/**
 * ConsentEvent interface - core IR type per IR-01, D-08
 */

import { Capability } from './capability.js';
import { Purpose } from './purpose.js';
import { Evidence } from './evidence.js';
import { DecisionRecord } from './decision-record.js';
import { ConsentType, GrantStatus } from '../shared/types.js';

/**
 * ConsentEvent - unified consent schema per D-08
 * Required fields: website, consentType, capability, timestamp, grantStatus, evidence[]
 */
export interface ConsentEvent {
  /** Website where consent was requested */
  website: string;
  /** Type of consent mechanism */
  consentType: ConsentType;
  /** Capability being requested */
  capability: Capability;
  /** Resource being accessed (optional) */
  resource?: string;
  /** OAuth scopes (for OAuth consent) */
  oauthScope?: string[];
  /** Browser permission type (for browser permissions) */
  browserPermission?: string;
  /** Cookie category (for cookie consent) */
  cookieCategory?: string;
  /** Data collected description */
  dataCollected?: string;
  /** Data shared description */
  dataShared?: string;
  /** Retention period */
  retention?: string;
  /** Whether data is used for AI training */
  aiTrainingUse?: boolean;
  /** Purpose inference */
  purpose?: Purpose;
  /** Policy evidence */
  policyEvidence?: string;
  /** Terms evidence */
  termsEvidence?: string;
  /** Timestamp of consent request */
  timestamp: string;
  /** Grant status */
  grantStatus: GrantStatus;
  /** Evidence supporting this event */
  evidence: Evidence[];
  /** Decision record from policy engine */
  decisionRecord?: DecisionRecord;
  /** User action that triggered this event */
  userAction?: string;
}

/**
 * Creates a consent event
 */
export function createConsentEvent(params: {
  website: string;
  consentType: ConsentType;
  capability: Capability;
  timestamp?: string;
  grantStatus?: GrantStatus;
  evidence: Evidence[];
  resource?: string;
  oauthScope?: string[];
  browserPermission?: string;
  cookieCategory?: string;
  dataCollected?: string;
  dataShared?: string;
  retention?: string;
  aiTrainingUse?: boolean;
  purpose?: Purpose;
  policyEvidence?: string;
  termsEvidence?: string;
  decisionRecord?: DecisionRecord;
  userAction?: string;
}): ConsentEvent {
  return {
    website: params.website,
    consentType: params.consentType,
    capability: params.capability,
    resource: params.resource,
    oauthScope: params.oauthScope,
    browserPermission: params.browserPermission,
    cookieCategory: params.cookieCategory,
    dataCollected: params.dataCollected,
    dataShared: params.dataShared,
    retention: params.retention,
    aiTrainingUse: params.aiTrainingUse,
    purpose: params.purpose,
    policyEvidence: params.policyEvidence,
    termsEvidence: params.termsEvidence,
    timestamp: params.timestamp ?? new Date().toISOString(),
    grantStatus: params.grantStatus ?? GrantStatus.Pending,
    evidence: params.evidence,
    decisionRecord: params.decisionRecord,
    userAction: params.userAction,
  };
}

/**
 * Creates an OAuth consent event
 */
export function createOAuthConsentEvent(params: {
  website: string;
  provider: string;
  scope: string[];
  evidence: Evidence[];
  timestamp?: string;
  grantStatus?: GrantStatus;
  userAction?: string;
}): ConsentEvent {
  const { createOAuthCapability } = await import('./capability.js');
  return createConsentEvent({
    website: params.website,
    consentType: ConsentType.OAuth,
    capability: createOAuthCapability(params.provider, params.scope),
    oauthScope: params.scope,
    evidence: params.evidence,
    timestamp: params.timestamp,
    grantStatus: params.grantStatus,
    userAction: params.userAction,
  });
}