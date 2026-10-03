'use strict';

// src/ir/capability.ts
function isOAuthCapability(cap) {
  return cap.type === "oauth";
}
function isBrowserPermissionCapability(cap) {
  return cap.type === "browser-permission";
}
function isCookieCapability(cap) {
  return cap.type === "cookie";
}
function isPolicyCapability(cap) {
  return cap.type === "policy";
}
function isTermsCapability(cap) {
  return cap.type === "terms";
}
function createOAuthCapability(provider, scope) {
  return {
    type: "oauth",
    provider: provider.toLowerCase(),
    scope: [...new Set(scope.map((s) => s.trim()).filter(Boolean))]
  };
}
function createBrowserPermissionCapability(permission) {
  return {
    type: "browser-permission",
    permission
  };
}
function createCookieCapability(category, name, domain) {
  return {
    type: "cookie",
    category,
    name,
    domain
  };
}
function createPolicyCapability(practice) {
  return {
    type: "policy",
    practice
  };
}
function createTermsCapability(clause) {
  return {
    type: "terms",
    clause
  };
}

// src/ir/consent-event.ts
function createConsentEvent(params) {
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
    timestamp: params.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
    grantStatus: params.grantStatus ?? "pending" /* Pending */,
    evidence: params.evidence,
    decisionRecord: params.decisionRecord,
    userAction: params.userAction
  };
}
function createOAuthConsentEvent(params) {
  return createConsentEvent({
    website: params.website,
    consentType: "oauth" /* OAuth */,
    capability: createOAuthCapability(params.provider, params.scope),
    oauthScope: params.scope,
    evidence: params.evidence,
    timestamp: params.timestamp,
    grantStatus: params.grantStatus,
    userAction: params.userAction
  });
}

// src/ir/purpose.ts
function createPurpose(params) {
  return {
    inferred: params.inferred,
    stated: params.stated,
    userIntent: params.userIntent,
    confidence: Math.max(0, Math.min(1, params.confidence))
  };
}
var emptyPurpose = {
  confidence: 0
};

// src/ir/evidence.ts
function createEvidence(params) {
  return {
    source: params.source,
    selector: params.selector,
    url: params.url,
    text: params.text,
    confidence: Math.max(0, Math.min(1, params.confidence)),
    extractionMethod: params.extractionMethod,
    extractedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function createDOMEvidence(params) {
  return createEvidence({
    source: "dom" /* DOM */,
    selector: params.selector,
    url: params.url,
    text: params.text,
    confidence: params.confidence,
    extractionMethod: params.extractionMethod
  });
}
function createHeuristicEvidence(params) {
  return createEvidence({
    source: "heuristic" /* Heuristic */,
    url: params.url,
    text: params.text,
    confidence: params.confidence,
    extractionMethod: "heuristic" /* Heuristic */
  });
}

// src/ir/decision-record.ts
function createDecisionRecord(params) {
  return {
    matchedRule: params.matchedRule,
    aiClassification: params.aiClassification,
    confidence: Math.max(0, Math.min(1, params.confidence)),
    provenance: {
      engine: params.engine,
      version: params.version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
var emptyDecisionRecord = {
  confidence: 0,
  provenance: {
    engine: "consentlens",
    version: "0.1.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }
};

exports.createBrowserPermissionCapability = createBrowserPermissionCapability;
exports.createConsentEvent = createConsentEvent;
exports.createCookieCapability = createCookieCapability;
exports.createDOMEvidence = createDOMEvidence;
exports.createDecisionRecord = createDecisionRecord;
exports.createEvidence = createEvidence;
exports.createHeuristicEvidence = createHeuristicEvidence;
exports.createOAuthCapability = createOAuthCapability;
exports.createOAuthConsentEvent = createOAuthConsentEvent;
exports.createPolicyCapability = createPolicyCapability;
exports.createPurpose = createPurpose;
exports.createTermsCapability = createTermsCapability;
exports.emptyDecisionRecord = emptyDecisionRecord;
exports.emptyPurpose = emptyPurpose;
exports.isBrowserPermissionCapability = isBrowserPermissionCapability;
exports.isCookieCapability = isCookieCapability;
exports.isOAuthCapability = isOAuthCapability;
exports.isPolicyCapability = isPolicyCapability;
exports.isTermsCapability = isTermsCapability;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map