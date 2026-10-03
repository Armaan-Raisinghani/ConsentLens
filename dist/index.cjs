'use strict';

// src/shared/types.ts
var ConsentType = /* @__PURE__ */ ((ConsentType2) => {
  ConsentType2["OAuth"] = "oauth";
  ConsentType2["BrowserPermission"] = "browser-permission";
  ConsentType2["Cookie"] = "cookie";
  ConsentType2["Policy"] = "policy";
  ConsentType2["Terms"] = "terms";
  return ConsentType2;
})(ConsentType || {});
var GrantStatus = /* @__PURE__ */ ((GrantStatus2) => {
  GrantStatus2["Pending"] = "pending";
  GrantStatus2["Granted"] = "granted";
  GrantStatus2["Denied"] = "denied";
  GrantStatus2["Revoked"] = "revoked";
  GrantStatus2["Unknown"] = "unknown";
  return GrantStatus2;
})(GrantStatus || {});
var EvidenceSource = /* @__PURE__ */ ((EvidenceSource2) => {
  EvidenceSource2["DOM"] = "dom";
  EvidenceSource2["Network"] = "network";
  EvidenceSource2["Storage"] = "storage";
  EvidenceSource2["Heuristic"] = "heuristic";
  EvidenceSource2["User"] = "user";
  return EvidenceSource2;
})(EvidenceSource || {});
var ExtractionMethod = /* @__PURE__ */ ((ExtractionMethod2) => {
  ExtractionMethod2["TextContent"] = "text-content";
  ExtractionMethod2["Attribute"] = "attribute";
  ExtractionMethod2["Regex"] = "regex";
  ExtractionMethod2["MetaTag"] = "meta-tag";
  ExtractionMethod2["URLParam"] = "url-param";
  ExtractionMethod2["DataAttribute"] = "data-attribute";
  ExtractionMethod2["Heuristic"] = "heuristic";
  return ExtractionMethod2;
})(ExtractionMethod || {});
var ErrorSeverity = /* @__PURE__ */ ((ErrorSeverity2) => {
  ErrorSeverity2["Info"] = "info";
  ErrorSeverity2["Warning"] = "warning";
  ErrorSeverity2["Error"] = "error";
  ErrorSeverity2["Critical"] = "critical";
  return ErrorSeverity2;
})(ErrorSeverity || {});

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

// src/shared/errors.ts
function createAdapterError(adapter, message, code, severity = "error" /* Error */, context) {
  return {
    adapter,
    message,
    code,
    severity,
    context,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/adapters/adapter.ts
var BaseAdapter = class {
  /**
   * Creates a success result with events
   */
  createResult(events = [], errors = []) {
    return { events, errors };
  }
  /**
   * Creates an adapter error
   */
  createError(message, code, severity = "error" /* Error */, context) {
    return {
      adapter: this.name,
      message,
      code,
      severity,
      context,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Safe extraction wrapper - fail-open per D-12
   */
  async safeExtract(fn, errorCode, errorMessage) {
    try {
      const data = await fn();
      return { data, error: null };
    } catch (err) {
      const error = this.createError(
        `${errorMessage}: ${err instanceof Error ? err.message : String(err)}`,
        errorCode,
        "error" /* Error */
      );
      return { data: null, error };
    }
  }
};

// src/adapters/oauth-adapter.ts
var OAUTH_PROVIDERS = [
  {
    name: "google",
    patterns: [
      /accounts\.google\.com/,
      /googleapis\.com\/auth/,
      /oauth2\.googleapis\.com/
    ],
    buttonTextPatterns: [
      /continue with google/i,
      /sign in with google/i,
      /login with google/i,
      /google sign.in/i
    ],
    scopeParam: "scope"
  },
  {
    name: "github",
    patterns: [
      /github\.com\/login\/oauth/,
      /github\.com\/auth/
    ],
    buttonTextPatterns: [
      /continue with github/i,
      /sign in with github/i,
      /login with github/i,
      /github sign.in/i
    ],
    scopeParam: "scope"
  },
  {
    name: "microsoft",
    patterns: [
      /login\.microsoftonline\.com/,
      /login\.live\.com/,
      /microsoftonline\.com\/oauth/
    ],
    buttonTextPatterns: [
      /continue with microsoft/i,
      /sign in with microsoft/i,
      /login with microsoft/i,
      /microsoft sign.in/i,
      /continue with outlook/i,
      /sign in with outlook/i
    ],
    scopeParam: "scope"
  },
  {
    name: "slack",
    patterns: [
      /slack\.com\/oauth/,
      /slack\.com\/auth/
    ],
    buttonTextPatterns: [
      /continue with slack/i,
      /sign in with slack/i,
      /login with slack/i,
      /slack sign.in/i,
      /add to slack/i
    ],
    scopeParam: "scope"
  },
  {
    name: "discord",
    patterns: [
      /discord\.com\/oauth2/,
      /discord\.com\/api\/oauth2/
    ],
    buttonTextPatterns: [
      /continue with discord/i,
      /sign in with discord/i,
      /login with discord/i,
      /discord sign.in/i,
      /authorize with discord/i
    ],
    scopeParam: "scope"
  }
];
var GENERIC_OAUTH_PATTERNS = [
  /\/oauth\/authorize/i,
  /\/oauth2\/authorize/i,
  /\/auth\/oauth/i,
  /\/login\/oauth/i,
  /\?client_id=/i,
  /response_type=code/i,
  /scope=/i
];
var OAuthAdapter = class extends BaseAdapter {
  name = "oauth";
  priority = 10;
  async extract(context) {
    const { document, url, origin } = context;
    const events = [];
    const errors = [];
    try {
      const oauthElements = this.detectOAuthElements(document);
      for (const element of oauthElements) {
        try {
          const event = await this.extractOAuthEvent(element, document, url, origin);
          if (event) {
            events.push(event);
          }
        } catch (err) {
          errors.push(
            this.createError(
              `Failed to extract OAuth event from element: ${err instanceof Error ? err.message : String(err)}`,
              "OAUTH_EXTRACTION_FAILED",
              "warning" /* Warning */,
              { elementHtml: element.outerHTML.substring(0, 500) }
            )
          );
        }
      }
      const genericEvents = this.detectGenericOAuth(document, url, origin);
      events.push(...genericEvents);
    } catch (err) {
      errors.push(
        this.createError(
          `OAuth adapter extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          "OAUTH_ADAPTER_ERROR",
          "error" /* Error */
        )
      );
    }
    return { events, errors };
  }
  /**
   * Detect OAuth-related elements in the DOM
   */
  detectOAuthElements(document) {
    const elements = [];
    const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]');
    for (const button of buttons) {
      const text = (button.textContent || "").trim().toLowerCase();
      const href = button.getAttribute("href") || "";
      for (const provider of OAUTH_PROVIDERS) {
        for (const pattern of provider.buttonTextPatterns) {
          if (pattern.test(text)) {
            elements.push(button);
            break;
          }
        }
        for (const pattern of provider.patterns) {
          if (pattern.test(href)) {
            elements.push(button);
            break;
          }
        }
      }
      const dataProvider = button.getAttribute("data-provider")?.toLowerCase();
      const dataOauth = button.getAttribute("data-oauth")?.toLowerCase();
      if (dataProvider || dataOauth === "true") {
        elements.push(button);
      }
    }
    const links = document.querySelectorAll("a[href]");
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      for (const provider of OAUTH_PROVIDERS) {
        for (const pattern of provider.patterns) {
          if (pattern.test(href)) {
            elements.push(link);
            break;
          }
        }
      }
      for (const pattern of GENERIC_OAUTH_PATTERNS) {
        if (pattern.test(href)) {
          elements.push(link);
          break;
        }
      }
    }
    const metaTags = document.querySelectorAll('meta[name*="oauth" i], meta[property*="oauth" i]');
    for (const meta of metaTags) {
      elements.push(meta);
    }
    return Array.from(new Set(elements));
  }
  /**
   * Extract OAuth event from a detected element
   */
  async extractOAuthEvent(element, document, url, origin) {
    const href = element.getAttribute("href") || "";
    const text = (element.textContent || "").trim();
    const dataProvider = element.getAttribute("data-provider")?.toLowerCase();
    const dataScope = element.getAttribute("data-scope")?.trim();
    element.getAttribute("data-client-id")?.trim();
    let provider = this.identifyProvider(href, text, dataProvider);
    if (!provider) {
      provider = this.identifyProvider(url, "", "");
    }
    if (!provider) {
      provider = "unknown";
    }
    const scopes = this.extractScopes(href, dataScope, document);
    const evidence = [
      createDOMEvidence({
        selector: this.getSelector(element),
        text: text || href,
        confidence: provider !== "unknown" ? 0.9 : 0.5,
        extractionMethod: "data-attribute" /* DataAttribute */,
        url
      })
    ];
    if (href.includes("scope=")) {
      evidence.push(
        createDOMEvidence({
          selector: this.getSelector(element),
          text: `OAuth scopes from URL: ${scopes.join(", ")}`,
          confidence: 0.85,
          extractionMethod: "url-param" /* URLParam */,
          url: href
        })
      );
    }
    return createOAuthConsentEvent({
      website: origin,
      provider,
      scope: scopes,
      evidence,
      userAction: `click:${this.getSelector(element)}`
    });
  }
  /**
   * Identify OAuth provider from various signals
   */
  identifyProvider(href, text, dataProvider) {
    if (dataProvider && OAUTH_PROVIDERS.some((p) => p.name === dataProvider)) {
      return dataProvider;
    }
    for (const provider of OAUTH_PROVIDERS) {
      for (const pattern of provider.patterns) {
        if (pattern.test(href)) {
          return provider.name;
        }
      }
    }
    const lowerText = text.toLowerCase();
    for (const provider of OAUTH_PROVIDERS) {
      for (const pattern of provider.buttonTextPatterns) {
        if (pattern.test(lowerText)) {
          return provider.name;
        }
      }
    }
    return null;
  }
  /**
   * Extract scopes from URL params and data attributes per D-14
   */
  extractScopes(href, dataScope, document) {
    const scopes = /* @__PURE__ */ new Set();
    try {
      const parsedUrl = new URL(href, "http://localhost");
      const scopeParam = parsedUrl.searchParams.get("scope");
      if (scopeParam) {
        scopeParam.split(/[\s,+]/).forEach((s) => scopes.add(s.trim()));
      }
    } catch {
    }
    if (dataScope) {
      dataScope.split(/[\s,+]/).forEach((s) => scopes.add(s.trim()));
    }
    const scopeMeta = document.querySelector('meta[name="oauth-scope"], meta[property="oauth:scope"]');
    if (scopeMeta) {
      const content = scopeMeta.getAttribute("content") || "";
      content.split(/[\s,+]/).forEach((s) => scopes.add(s.trim()));
    }
    const scopeElements = document.querySelectorAll("[data-scope]");
    for (const el of scopeElements) {
      const scope = el.getAttribute("data-scope")?.trim();
      if (scope) {
        scope.split(/[\s,+]/).forEach((s) => scopes.add(s.trim()));
      }
    }
    return Array.from(scopes).filter(Boolean);
  }
  /**
   * Detect generic OAuth patterns (fallback per D-13)
   */
  detectGenericOAuth(document, url, origin) {
    const events = [];
    for (const pattern of GENERIC_OAUTH_PATTERNS) {
      if (pattern.test(url)) {
        const scopes = this.extractScopes(url, "", document);
        const provider = this.identifyProvider(url, "", "") || "unknown";
        const evidence = [
          createDOMEvidence({
            selector: "window.location",
            text: `Generic OAuth detected in URL: ${url}`,
            confidence: 0.4,
            extractionMethod: "url-param" /* URLParam */,
            url
          })
        ];
        if (scopes.length > 0 || provider !== "unknown") {
          events.push(
            createOAuthConsentEvent({
              website: origin,
              provider,
              scope: scopes,
              evidence,
              userAction: "page-load"
            })
          );
        }
        break;
      }
    }
    return events;
  }
  /**
   * Generate a CSS selector for an element
   */
  getSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      const classes = element.className.split(" ").filter(Boolean).join(".");
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }
    return element.tagName.toLowerCase();
  }
};

// src/adapters/registry.ts
var AdapterRegistry = class {
  adapters = [];
  sharedContext = /* @__PURE__ */ new Map();
  /**
   * Register adapters - explicit array per D-22
   */
  register(adapters) {
    this.adapters = [...adapters].sort((a, b) => a.priority - b.priority);
  }
  /**
   * Add a single adapter
   */
  add(adapter) {
    this.adapters.push(adapter);
    this.adapters.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Remove an adapter by name
   */
  remove(name) {
    const index = this.adapters.findIndex((a) => a.name === name);
    if (index >= 0) {
      this.adapters.splice(index, 1);
      return true;
    }
    return false;
  }
  /**
   * Get all registered adapters
   */
  getAdapters() {
    return [...this.adapters];
  }
  /**
   * Get adapter by name
   */
  getAdapter(name) {
    return this.adapters.find((a) => a.name === name);
  }
  /**
   * Run all adapters in priority order per D-23
   * Each adapter wrapped in try/catch for fail-open per D-12
   * Context is mutable and enriched per D-24
   */
  async run(context) {
    const allEvents = [];
    const allErrors = [];
    const enrichedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        registry: this,
        sharedContext: this.sharedContext
      }
    };
    for (const adapter of this.adapters) {
      try {
        const result = await adapter.extract(enrichedContext);
        allEvents.push(...result.events);
        allErrors.push(...result.errors);
      } catch (err) {
        allErrors.push({
          adapter: adapter.name,
          message: `Adapter threw unhandled error: ${err instanceof Error ? err.message : String(err)}`,
          code: "ADAPTER_UNHANDLED_ERROR",
          severity: "error" /* Error */,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    return { events: allEvents, errors: allErrors };
  }
  /**
   * Set shared context value (mutable enrichment per D-24)
   */
  setSharedContext(key, value) {
    this.sharedContext.set(key, value);
  }
  /**
   * Get shared context value
   */
  getSharedContext(key) {
    return this.sharedContext.get(key);
  }
  /**
   * Clear shared context
   */
  clearSharedContext() {
    this.sharedContext.clear();
  }
  /**
   * Clear all adapters
   */
  clear() {
    this.adapters = [];
    this.clearSharedContext();
  }
};

// src/plugins/adapter-plugin.ts
var globalRegistry = null;
function setPluginRegistry(registry) {
  globalRegistry = registry;
}
function getPluginRegistry() {
  return globalRegistry;
}
function registerAdapter(type, factory) {
  if (!globalRegistry) {
    throw new Error("Plugin registry not initialized. Call setPluginRegistry() first.");
  }
  const adapter = {
    name: type,
    priority: 100,
    // Default priority for plugins (runs after core adapters)
    async extract(context) {
      return factory(context);
    }
  };
  globalRegistry.add(adapter);
}
function registerAdapterInstance(adapter) {
  if (!globalRegistry) {
    throw new Error("Plugin registry not initialized. Call setPluginRegistry() first.");
  }
  globalRegistry.add(adapter);
}
function unregisterAdapter(type) {
  if (!globalRegistry) {
    return false;
  }
  return globalRegistry.remove(type);
}
async function registerPlugin(plugin) {
  if (!globalRegistry) {
    throw new Error("Plugin registry not initialized. Call setPluginRegistry() first.");
  }
  await plugin.initialize(globalRegistry);
}

exports.AdapterRegistry = AdapterRegistry;
exports.ConsentType = ConsentType;
exports.ErrorSeverity = ErrorSeverity;
exports.EvidenceSource = EvidenceSource;
exports.ExtractionMethod = ExtractionMethod;
exports.GrantStatus = GrantStatus;
exports.OAuthAdapter = OAuthAdapter;
exports.createAdapterError = createAdapterError;
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
exports.getPluginRegistry = getPluginRegistry;
exports.isBrowserPermissionCapability = isBrowserPermissionCapability;
exports.isCookieCapability = isCookieCapability;
exports.isOAuthCapability = isOAuthCapability;
exports.isPolicyCapability = isPolicyCapability;
exports.isTermsCapability = isTermsCapability;
exports.registerAdapter = registerAdapter;
exports.registerAdapterInstance = registerAdapterInstance;
exports.registerPlugin = registerPlugin;
exports.setPluginRegistry = setPluginRegistry;
exports.unregisterAdapter = unregisterAdapter;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map