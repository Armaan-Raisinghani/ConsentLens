/**
 * Capability taxonomy - structured objects per D-07
 */
/**
 * Base capability interface
 */
interface BaseCapability {
    type: string;
}
/**
 * OAuth capability - for OAuth consent flows
 */
interface OAuthCapability extends BaseCapability {
    type: 'oauth';
    provider: string;
    scope: string[];
}
/**
 * Browser permission capability - for browser permission prompts
 */
interface BrowserPermissionCapability extends BaseCapability {
    type: 'browser-permission';
    permission: string;
}
/**
 * Cookie capability - for cookie consent
 */
interface CookieCapability extends BaseCapability {
    type: 'cookie';
    category: string;
    name?: string;
    domain?: string;
}
/**
 * Policy capability - for privacy policy clauses
 */
interface PolicyCapability extends BaseCapability {
    type: 'policy';
    practice: string;
}
/**
 * Terms capability - for terms of service clauses
 */
interface TermsCapability extends BaseCapability {
    type: 'terms';
    clause: string;
}
/**
 * Discriminated union of all capability types
 */
type Capability = OAuthCapability | BrowserPermissionCapability | CookieCapability | PolicyCapability | TermsCapability;
/**
 * Type guard for OAuthCapability
 */
declare function isOAuthCapability(cap: Capability): cap is OAuthCapability;
/**
 * Type guard for BrowserPermissionCapability
 */
declare function isBrowserPermissionCapability(cap: Capability): cap is BrowserPermissionCapability;
/**
 * Type guard for CookieCapability
 */
declare function isCookieCapability(cap: Capability): cap is CookieCapability;
/**
 * Type guard for PolicyCapability
 */
declare function isPolicyCapability(cap: Capability): cap is PolicyCapability;
/**
 * Type guard for TermsCapability
 */
declare function isTermsCapability(cap: Capability): cap is TermsCapability;
/**
 * Creates an OAuth capability
 */
declare function createOAuthCapability(provider: string, scope: string[]): OAuthCapability;
/**
 * Creates a browser permission capability
 */
declare function createBrowserPermissionCapability(permission: string): BrowserPermissionCapability;
/**
 * Creates a cookie capability
 */
declare function createCookieCapability(category: string, name?: string, domain?: string): CookieCapability;
/**
 * Creates a policy capability
 */
declare function createPolicyCapability(practice: string): PolicyCapability;
/**
 * Creates a terms capability
 */
declare function createTermsCapability(clause: string): TermsCapability;

/**
 * Purpose interface - per IR-03
 */
/**
 * Purpose interface representing the inferred/stated purpose of a consent request
 */
interface Purpose {
    /** Inferred purpose from AI analysis */
    inferred?: string;
    /** Stated purpose from the consent UI/text */
    stated?: string;
    /** User's apparent intent */
    userIntent?: string;
    /** Confidence score 0-1 */
    confidence: number;
}
/**
 * Creates a purpose object
 */
declare function createPurpose(params: {
    inferred?: string;
    stated?: string;
    userIntent?: string;
    confidence: number;
}): Purpose;
/**
 * Default empty purpose
 */
declare const emptyPurpose: Purpose;

/**
 * Shared type definitions for ConsentLens core
 */
/**
 * Consent type enumeration
 */
declare enum ConsentType {
    OAuth = "oauth",
    BrowserPermission = "browser-permission",
    Cookie = "cookie",
    Policy = "policy",
    Terms = "terms"
}
/**
 * Grant status enumeration
 */
declare enum GrantStatus {
    Pending = "pending",
    Granted = "granted",
    Denied = "denied",
    Revoked = "revoked",
    Unknown = "unknown"
}
/**
 * Evidence source enumeration
 */
declare enum EvidenceSource {
    DOM = "dom",
    Network = "network",
    Storage = "storage",
    Heuristic = "heuristic",
    User = "user"
}
/**
 * Extraction method enumeration
 */
declare enum ExtractionMethod {
    TextContent = "text-content",
    Attribute = "attribute",
    Regex = "regex",
    MetaTag = "meta-tag",
    URLParam = "url-param",
    DataAttribute = "data-attribute",
    Heuristic = "heuristic"
}
/**
 * Severity levels for adapter errors
 */
declare enum ErrorSeverity {
    Info = "info",
    Warning = "warning",
    Error = "error",
    Critical = "critical"
}

/**
 * Evidence interface - rich references with confidence per D-09
 */

/**
 * Evidence interface for consent event extraction
 */
interface Evidence {
    /** Source of the evidence */
    source: EvidenceSource;
    /** CSS selector used to locate the element */
    selector?: string;
    /** URL where evidence was found */
    url?: string;
    /** Text content of the evidence */
    text?: string;
    /** Confidence score 0-1 */
    confidence: number;
    /** Method used to extract this evidence */
    extractionMethod: ExtractionMethod;
    /** Timestamp when evidence was extracted */
    extractedAt: string;
}
/**
 * Creates an evidence object
 */
declare function createEvidence(params: {
    source: EvidenceSource;
    selector?: string;
    url?: string;
    text?: string;
    confidence: number;
    extractionMethod: ExtractionMethod;
}): Evidence;
/**
 * Creates DOM-based evidence
 */
declare function createDOMEvidence(params: {
    selector: string;
    text: string;
    confidence: number;
    extractionMethod: ExtractionMethod;
    url?: string;
}): Evidence;
/**
 * Creates heuristic evidence
 */
declare function createHeuristicEvidence(params: {
    text: string;
    confidence: number;
    url?: string;
}): Evidence;

/**
 * DecisionRecord interface - per IR-05
 */
/**
 * Decision record for consent classification
 */
interface DecisionRecord {
    /** Matched rule identifier */
    matchedRule?: string;
    /** AI classification result */
    aiClassification?: {
        decision: 'allow' | 'ask' | 'deny';
        excessiveness: 'none' | 'moderate' | 'excessive';
        purposeMatch: boolean;
        reasoning: string;
    };
    /** Confidence score 0-1 */
    confidence: number;
    /** Provenance information */
    provenance: {
        engine: string;
        version: string;
        timestamp: string;
    };
}
/**
 * Creates a decision record
 */
declare function createDecisionRecord(params: {
    matchedRule?: string;
    aiClassification?: DecisionRecord['aiClassification'];
    confidence: number;
    engine: string;
    version: string;
}): DecisionRecord;
/**
 * Default empty decision record
 */
declare const emptyDecisionRecord: DecisionRecord;

/**
 * ConsentEvent interface - core IR type per IR-01, D-08
 */

/**
 * ConsentEvent - unified consent schema per D-08
 * Required fields: website, consentType, capability, timestamp, grantStatus, evidence[]
 */
interface ConsentEvent {
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
declare function createConsentEvent(params: {
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
}): ConsentEvent;
/**
 * Creates an OAuth consent event
 */
declare function createOAuthConsentEvent(params: {
    website: string;
    provider: string;
    scope: string[];
    evidence: Evidence[];
    timestamp?: string;
    grantStatus?: GrantStatus;
    userAction?: string;
}): ConsentEvent;

export { isTermsCapability as A, type BaseCapability as B, type Capability as C, type DecisionRecord as D, ErrorSeverity as E, GrantStatus as G, type OAuthCapability as O, type PolicyCapability as P, type TermsCapability as T, type BrowserPermissionCapability as a, type ConsentEvent as b, ConsentType as c, type CookieCapability as d, type Evidence as e, EvidenceSource as f, ExtractionMethod as g, type Purpose as h, createBrowserPermissionCapability as i, createConsentEvent as j, createCookieCapability as k, createDOMEvidence as l, createDecisionRecord as m, createEvidence as n, createHeuristicEvidence as o, createOAuthCapability as p, createOAuthConsentEvent as q, createPolicyCapability as r, createPurpose as s, createTermsCapability as t, emptyDecisionRecord as u, emptyPurpose as v, isBrowserPermissionCapability as w, isCookieCapability as x, isOAuthCapability as y, isPolicyCapability as z };
