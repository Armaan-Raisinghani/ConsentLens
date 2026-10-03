'use strict';

var zod = require('zod');

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/plugins/adapter-plugin.ts
var adapter_plugin_exports = {};
__export(adapter_plugin_exports, {
  getPluginRegistry: () => getPluginRegistry,
  registerAdapter: () => registerAdapter,
  registerAdapterInstance: () => registerAdapterInstance,
  registerPlugin: () => registerPlugin,
  setPluginRegistry: () => setPluginRegistry,
  unregisterAdapter: () => unregisterAdapter
});
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
var globalRegistry;
var init_adapter_plugin = __esm({
  "src/plugins/adapter-plugin.ts"() {
    globalRegistry = null;
  }
});

// src/ir/capability.ts
var capability_exports = {};
__export(capability_exports, {
  createBrowserPermissionCapability: () => createBrowserPermissionCapability,
  createCookieCapability: () => createCookieCapability,
  createOAuthCapability: () => createOAuthCapability,
  createPolicyCapability: () => createPolicyCapability,
  createTermsCapability: () => createTermsCapability,
  isBrowserPermissionCapability: () => isBrowserPermissionCapability,
  isCookieCapability: () => isCookieCapability,
  isOAuthCapability: () => isOAuthCapability,
  isPolicyCapability: () => isPolicyCapability,
  isTermsCapability: () => isTermsCapability
});
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
var init_capability = __esm({
  "src/ir/capability.ts"() {
  }
});

// src/shared/types.ts
var types_exports = {};
__export(types_exports, {
  ConsentType: () => ConsentType,
  ErrorSeverity: () => ErrorSeverity,
  EvidenceSource: () => EvidenceSource,
  ExtractionMethod: () => ExtractionMethod,
  GrantStatus: () => GrantStatus
});
var ConsentType, GrantStatus, EvidenceSource, ExtractionMethod, ErrorSeverity;
var init_types = __esm({
  "src/shared/types.ts"() {
    ConsentType = /* @__PURE__ */ ((ConsentType2) => {
      ConsentType2["OAuth"] = "oauth";
      ConsentType2["BrowserPermission"] = "browser-permission";
      ConsentType2["Cookie"] = "cookie";
      ConsentType2["Policy"] = "policy";
      ConsentType2["Terms"] = "terms";
      return ConsentType2;
    })(ConsentType || {});
    GrantStatus = /* @__PURE__ */ ((GrantStatus2) => {
      GrantStatus2["Pending"] = "pending";
      GrantStatus2["Granted"] = "granted";
      GrantStatus2["Denied"] = "denied";
      GrantStatus2["Revoked"] = "revoked";
      GrantStatus2["Unknown"] = "unknown";
      return GrantStatus2;
    })(GrantStatus || {});
    EvidenceSource = /* @__PURE__ */ ((EvidenceSource2) => {
      EvidenceSource2["DOM"] = "dom";
      EvidenceSource2["Network"] = "network";
      EvidenceSource2["Storage"] = "storage";
      EvidenceSource2["Heuristic"] = "heuristic";
      EvidenceSource2["User"] = "user";
      return EvidenceSource2;
    })(EvidenceSource || {});
    ExtractionMethod = /* @__PURE__ */ ((ExtractionMethod2) => {
      ExtractionMethod2["TextContent"] = "text-content";
      ExtractionMethod2["Attribute"] = "attribute";
      ExtractionMethod2["Regex"] = "regex";
      ExtractionMethod2["MetaTag"] = "meta-tag";
      ExtractionMethod2["URLParam"] = "url-param";
      ExtractionMethod2["DataAttribute"] = "data-attribute";
      ExtractionMethod2["Heuristic"] = "heuristic";
      return ExtractionMethod2;
    })(ExtractionMethod || {});
    ErrorSeverity = /* @__PURE__ */ ((ErrorSeverity2) => {
      ErrorSeverity2["Info"] = "info";
      ErrorSeverity2["Warning"] = "warning";
      ErrorSeverity2["Error"] = "error";
      ErrorSeverity2["Critical"] = "critical";
      return ErrorSeverity2;
    })(ErrorSeverity || {});
  }
});

// src/plugins/classifier-plugin.ts
var classifier_plugin_exports = {};
__export(classifier_plugin_exports, {
  CookieCategory: () => exports.CookieCategory,
  classifyCookie: () => classifyCookie,
  clearClassifiers: () => clearClassifiers,
  createClassifierConsentEvent: () => createClassifierConsentEvent,
  getAllClassifiers: () => getAllClassifiers,
  getClassifier: () => getClassifier,
  registerClassifier: () => registerClassifier,
  unregisterClassifier: () => unregisterClassifier
});
function registerClassifier(name, fn) {
  if (classifierRegistry.has(name)) {
    throw new Error(`Classifier '${name}' already registered`);
  }
  classifierRegistry.set(name, fn);
}
function unregisterClassifier(name) {
  return classifierRegistry.delete(name);
}
function getClassifier(name) {
  return classifierRegistry.get(name);
}
function getAllClassifiers() {
  return [...classifierRegistry.values()];
}
function clearClassifiers() {
  classifierRegistry.clear();
}
function classifyCookie(cookie, context) {
  for (const fn of classifierRegistry.values()) {
    const result = fn(cookie, context);
    if (result) {
      return result;
    }
  }
  return null;
}
function createClassifierConsentEvent(params) {
  const { createCookieCapability: createCookieCapability2 } = (init_capability(), __toCommonJS(capability_exports));
  const { ConsentType: ConsentType2, GrantStatus: GrantStatus2 } = (init_types(), __toCommonJS(types_exports));
  return {
    website: params.website,
    consentType: ConsentType2.Cookie,
    capability: createCookieCapability2(params.classification.category, params.cookie.name, params.cookie.domain),
    cookieCategory: params.classification.category,
    timestamp: params.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
    grantStatus: GrantStatus2.Pending,
    evidence: params.evidence,
    userAction: `cookie:classifier-${params.classification.source}`,
    resource: params.cookie.domain
  };
}
exports.CookieCategory = void 0; var classifierRegistry;
var init_classifier_plugin = __esm({
  "src/plugins/classifier-plugin.ts"() {
    exports.CookieCategory = /* @__PURE__ */ ((CookieCategory2) => {
      CookieCategory2["Essential"] = "essential";
      CookieCategory2["Analytics"] = "analytics";
      CookieCategory2["Advertising"] = "advertising";
      CookieCategory2["Personalization"] = "personalization";
      CookieCategory2["Functional"] = "functional";
      CookieCategory2["Security"] = "security";
      CookieCategory2["Unknown"] = "unknown";
      return CookieCategory2;
    })(exports.CookieCategory || {});
    classifierRegistry = /* @__PURE__ */ new Map();
  }
});

// src/plugins/policy-extractor-plugin.ts
var policy_extractor_plugin_exports = {};
__export(policy_extractor_plugin_exports, {
  PolicyPractice: () => exports.PolicyPractice,
  clearPolicyExtractors: () => clearPolicyExtractors,
  createPolicyExtractorConsentEvent: () => createPolicyExtractorConsentEvent,
  extractPolicyPractices: () => extractPolicyPractices,
  getAllPolicyExtractors: () => getAllPolicyExtractors,
  getPolicyExtractor: () => getPolicyExtractor,
  registerPolicyExtractor: () => registerPolicyExtractor,
  unregisterPolicyExtractor: () => unregisterPolicyExtractor
});
function registerPolicyExtractor(name, fn) {
  if (policyExtractorRegistry.has(name)) {
    throw new Error(`Policy extractor '${name}' already registered`);
  }
  policyExtractorRegistry.set(name, fn);
}
function unregisterPolicyExtractor(name) {
  return policyExtractorRegistry.delete(name);
}
function getPolicyExtractor(name) {
  return policyExtractorRegistry.get(name);
}
function getAllPolicyExtractors() {
  return [...policyExtractorRegistry.values()];
}
function clearPolicyExtractors() {
  policyExtractorRegistry.clear();
}
function extractPolicyPractices(text, url, context) {
  const allPractices = [];
  const seen = /* @__PURE__ */ new Set();
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
function createPolicyExtractorConsentEvent(params) {
  const { createPolicyCapability: createPolicyCapability2 } = (init_capability(), __toCommonJS(capability_exports));
  const { ConsentType: ConsentType2, GrantStatus: GrantStatus2 } = (init_types(), __toCommonJS(types_exports));
  return {
    website: params.website,
    consentType: ConsentType2.Policy,
    capability: createPolicyCapability2(params.practice.practice),
    timestamp: params.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
    grantStatus: GrantStatus2.Pending,
    evidence: params.evidence,
    userAction: `policy:extractor-${params.practice.source}`,
    resource: params.policyUrl,
    policyEvidence: params.practice.text
  };
}
exports.PolicyPractice = void 0; var policyExtractorRegistry;
var init_policy_extractor_plugin = __esm({
  "src/plugins/policy-extractor-plugin.ts"() {
    exports.PolicyPractice = /* @__PURE__ */ ((PolicyPractice2) => {
      PolicyPractice2["DataCollection"] = "data-collection";
      PolicyPractice2["DataSharing"] = "data-sharing";
      PolicyPractice2["DataSelling"] = "data-selling";
      PolicyPractice2["AiTraining"] = "ai-training";
      PolicyPractice2["Retention"] = "retention";
      PolicyPractice2["ThirdParties"] = "third-parties";
      PolicyPractice2["UserRights"] = "user-rights";
      PolicyPractice2["Security"] = "security";
      PolicyPractice2["InternationalTransfer"] = "international-transfer";
      PolicyPractice2["AutomatedDecision"] = "automated-decision";
      PolicyPractice2["Cookies"] = "cookies";
      PolicyPractice2["Marketing"] = "marketing";
      PolicyPractice2["Analytics"] = "analytics";
      PolicyPractice2["Personalization"] = "personalization";
      PolicyPractice2["Unknown"] = "unknown";
      return PolicyPractice2;
    })(exports.PolicyPractice || {});
    policyExtractorRegistry = /* @__PURE__ */ new Map();
  }
});

// src/plugins/ai-backend-plugin.ts
var ai_backend_plugin_exports = {};
__export(ai_backend_plugin_exports, {
  clearAIBackends: () => clearAIBackends,
  createAIClassificationEvent: () => createAIClassificationEvent,
  getAIBackend: () => getAIBackend,
  getAllAIBackends: () => getAllAIBackends,
  getDefaultAIBackend: () => getDefaultAIBackend,
  registerAIBackend: () => registerAIBackend,
  unregisterAIBackend: () => unregisterAIBackend
});
function registerAIBackend(name, backend) {
  if (aiBackendRegistry.has(name)) {
    throw new Error(`AI backend '${name}' already registered`);
  }
  aiBackendRegistry.set(name, backend);
}
function unregisterAIBackend(name) {
  return aiBackendRegistry.delete(name);
}
function getAIBackend(name) {
  return aiBackendRegistry.get(name);
}
function getAllAIBackends() {
  return [...aiBackendRegistry.values()];
}
function clearAIBackends() {
  aiBackendRegistry.clear();
}
function getDefaultAIBackend() {
  const backends = [...aiBackendRegistry.values()];
  return backends[0];
}
function createAIClassificationEvent(params) {
  const { ConsentType: ConsentType2, GrantStatus: GrantStatus2 } = (init_types(), __toCommonJS(types_exports));
  return {
    ...params.originalEvent,
    website: params.website,
    consentType: ConsentType2.OAuth,
    // Will be overridden by caller
    timestamp: params.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
    grantStatus: GrantStatus2.Pending,
    evidence: [...params.originalEvent.evidence, ...params.evidence],
    decisionRecord: {
      matchedRule: void 0,
      aiClassification: params.classification,
      confidence: 1,
      // AI classification confidence defaults to 1.0
      provenance: {
        engine: "ai-backend",
        version: "0.1.0",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    }
  };
}
var aiBackendRegistry;
var init_ai_backend_plugin = __esm({
  "src/plugins/ai-backend-plugin.ts"() {
    aiBackendRegistry = /* @__PURE__ */ new Map();
  }
});

// src/plugins/provider-plugin.ts
var provider_plugin_exports = {};
__export(provider_plugin_exports, {
  ProviderRegistry: () => exports.ProviderRegistry,
  clearProviders: () => clearProviders,
  detectProviders: () => detectProviders,
  findProviderByAuthUrl: () => findProviderByAuthUrl,
  getAllProviderScopes: () => getAllProviderScopes,
  getAllProviders: () => getAllProviders,
  getProvider: () => getProvider,
  getProviderScopes: () => getProviderScopes,
  registerProvider: () => registerProvider,
  unregisterProvider: () => unregisterProvider
});
function registerProvider(id, config) {
  if (providerRegistry.has(id)) {
    throw new Error(`Provider '${id}' already registered`);
  }
  if (!config.name || !config.authUrl || !config.scopeMap || !config.icon || !config.color) {
    throw new Error(`Provider '${id}' missing required fields: name, authUrl, scopeMap, icon, color`);
  }
  providerRegistry.set(id, config);
}
function unregisterProvider(id) {
  return providerRegistry.delete(id);
}
function getProvider(id) {
  return providerRegistry.get(id);
}
function getAllProviders() {
  return [...providerRegistry.values()];
}
function clearProviders() {
  providerRegistry.clear();
}
function findProviderByAuthUrl(authUrl) {
  for (const provider of providerRegistry.values()) {
    try {
      const providerUrl = new URL(provider.authUrl);
      const checkUrl = new URL(authUrl);
      if (providerUrl.hostname === checkUrl.hostname && providerUrl.pathname === checkUrl.pathname) {
        return provider;
      }
    } catch {
    }
  }
  return void 0;
}
function detectProviders(context) {
  const detections = [];
  const { document, url } = context;
  const hasQuerySelector = typeof document?.querySelectorAll === "function";
  for (const provider of providerRegistry.values()) {
    if (!provider.detectionPatterns) continue;
    let maxConfidence = 0;
    let matchedElement;
    let matchedPattern;
    if (provider.detectionPatterns.urlPatterns) {
      for (const pattern of provider.detectionPatterns.urlPatterns) {
        if (pattern.test(url)) {
          maxConfidence = Math.max(maxConfidence, 0.9);
          matchedPattern = pattern.source;
        }
      }
    }
    if (hasQuerySelector && provider.detectionPatterns.buttonTextPatterns) {
      const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]');
      for (const button of buttons) {
        const text = (button.textContent || "").trim().toLowerCase();
        for (const pattern of provider.detectionPatterns.buttonTextPatterns) {
          if (pattern.test(text)) {
            maxConfidence = Math.max(maxConfidence, 0.85);
            matchedElement = button;
            matchedPattern = pattern.source;
          }
        }
      }
    }
    if (hasQuerySelector && provider.detectionPatterns.dataAttributes) {
      for (const [attr, value] of Object.entries(provider.detectionPatterns.dataAttributes)) {
        const elements = document.querySelectorAll(`[${attr}="${value}"]`);
        if (elements.length > 0) {
          maxConfidence = Math.max(maxConfidence, 0.8);
          matchedElement = elements[0];
          matchedPattern = `${attr}=${value}`;
        }
      }
    }
    if (maxConfidence > 0) {
      detections.push({
        provider,
        confidence: maxConfidence,
        matchedElement,
        matchedPattern
      });
    }
  }
  return detections.sort((a, b) => b.confidence - a.confidence);
}
function getProviderScopes(providerId, category) {
  const provider = providerRegistry.get(providerId);
  return provider?.scopeMap[category] ?? [];
}
function getAllProviderScopes(providerId) {
  const provider = providerRegistry.get(providerId);
  if (!provider) return [];
  return Object.values(provider.scopeMap).flat();
}
var providerRegistry; exports.ProviderRegistry = void 0;
var init_provider_plugin = __esm({
  "src/plugins/provider-plugin.ts"() {
    providerRegistry = /* @__PURE__ */ new Map();
    exports.ProviderRegistry = class {
      registry = /* @__PURE__ */ new Map();
      /**
       * Register multiple providers at once
       */
      register(providers) {
        for (const provider of providers) {
          this.add(provider);
        }
      }
      /**
       * Add a single provider
       */
      add(provider) {
        if (this.registry.has(provider.id)) {
          throw new Error(`Provider '${provider.id}' already registered`);
        }
        if (!provider.name || !provider.authUrl || !provider.scopeMap || !provider.icon || !provider.color) {
          throw new Error(`Provider '${provider.id}' missing required fields: name, authUrl, scopeMap, icon, color`);
        }
        this.registry.set(provider.id, provider);
      }
      /**
       * Remove a provider by ID
       */
      remove(id) {
        return this.registry.delete(id);
      }
      /**
       * Get a provider by ID
       */
      getProvider(id) {
        return this.registry.get(id);
      }
      /**
       * Get all registered providers
       */
      getAllProviders() {
        return [...this.registry.values()];
      }
      /**
       * Find a provider by authorization URL
       */
      findByAuthUrl(authUrl) {
        for (const provider of this.registry.values()) {
          try {
            const providerUrl = new URL(provider.authUrl);
            const checkUrl = new URL(authUrl);
            if (providerUrl.hostname === checkUrl.hostname && providerUrl.pathname === checkUrl.pathname) {
              return provider;
            }
          } catch {
          }
        }
        return void 0;
      }
      /**
       * Clear all providers
       */
      clear() {
        this.registry.clear();
      }
    };
  }
});

// src/plugins/config-plugin.ts
var config_plugin_exports = {};
__export(config_plugin_exports, {
  getConfig: () => getConfig,
  initConfig: () => initConfig,
  onConfigChange: () => onConfigChange,
  registerPluginsFromConfig: () => registerPluginsFromConfig,
  resetConfig: () => resetConfig,
  updateConfig: () => updateConfig
});
async function initConfig(configPath) {
  const config = getDefaultConfig();
  globalConfig = config;
  notifyListeners(config);
  return config;
}
function getConfig() {
  return globalConfig;
}
function updateConfig(partial) {
  if (!globalConfig) {
    throw new Error("Config not initialized. Call initConfig() first.");
  }
  globalConfig = {
    ...globalConfig,
    ...partial,
    adapters: partial.adapters ? [...globalConfig.adapters, ...partial.adapters] : globalConfig.adapters,
    classifiers: partial.classifiers ? [...globalConfig.classifiers, ...partial.classifiers] : globalConfig.classifiers,
    policyExtractors: partial.policyExtractors ? [...globalConfig.policyExtractors, ...partial.policyExtractors] : globalConfig.policyExtractors,
    aiBackends: partial.aiBackends ? [...globalConfig.aiBackends, ...partial.aiBackends] : globalConfig.aiBackends,
    providers: partial.providers ? [...globalConfig.providers, ...partial.providers] : globalConfig.providers,
    rulePacks: partial.rulePacks ? [...globalConfig.rulePacks, ...partial.rulePacks] : globalConfig.rulePacks,
    settings: { ...globalConfig.settings, ...partial.settings }
  };
  notifyListeners(globalConfig);
  return globalConfig;
}
function resetConfig() {
  globalConfig = getDefaultConfig();
  notifyListeners(globalConfig);
  return globalConfig;
}
function onConfigChange(listener) {
  configListeners.push(listener);
  return () => {
    const index = configListeners.indexOf(listener);
    if (index >= 0) configListeners.splice(index, 1);
  };
}
function notifyListeners(config) {
  for (const listener of configListeners) {
    try {
      listener(config);
    } catch {
    }
  }
}
function getDefaultConfig() {
  return {
    version: 1,
    adapters: [
      { type: "oauth", enabled: true, priority: 10, options: {} },
      { type: "browser-permission", enabled: true, priority: 20, options: {} },
      { type: "cookie", enabled: true, priority: 30, options: {} },
      { type: "policy", enabled: true, priority: 40, options: {} },
      { type: "terms", enabled: true, priority: 50, options: {} }
    ],
    classifiers: [
      { name: "default", enabled: true, options: {} }
    ],
    policyExtractors: [
      { name: "default", enabled: true, options: {} }
    ],
    aiBackends: [
      { name: "openjev", enabled: false, options: {} }
      // Requires API key
    ],
    providers: [
      { id: "google", enabled: true, options: {} },
      { id: "github", enabled: true, options: {} },
      { id: "microsoft", enabled: true, options: {} },
      { id: "slack", enabled: true, options: {} },
      { id: "discord", enabled: true, options: {} }
    ],
    rulePacks: [
      { name: "balanced", enabled: true, source: "builtin", path: "", options: {} },
      { name: "strict", enabled: false, source: "builtin", path: "", options: {} },
      { name: "essential", enabled: false, source: "builtin", path: "", options: {} },
      { name: "no-ai-training", enabled: false, source: "builtin", path: "", options: {} },
      { name: "paranoid", enabled: false, source: "builtin", path: "", options: {} }
    ],
    activeRulePack: "balanced",
    settings: {
      theme: "system",
      notifications: true,
      autoAnalyze: true,
      strictMode: false,
      language: "en",
      dataRetentionDays: 90,
      telemetry: false
    }
  };
}
function registerPluginsFromConfig(config, adapters, classifiers, policyExtractors, aiBackends, providers, rulePacks) {
  for (const adapterConfig of config.adapters) {
    if (!adapterConfig.enabled) continue;
    adapters.get(adapterConfig.type);
  }
  for (const classifierConfig of config.classifiers) {
    if (!classifierConfig.enabled) continue;
    classifiers.get(classifierConfig.name);
  }
  for (const extractorConfig of config.policyExtractors) {
    if (!extractorConfig.enabled) continue;
    policyExtractors.get(extractorConfig.name);
  }
  for (const backendConfig of config.aiBackends) {
    if (!backendConfig.enabled) continue;
    aiBackends.get(backendConfig.name);
  }
  for (const providerConfig of config.providers) {
    if (!providerConfig.enabled) continue;
    providers.get(providerConfig.id);
  }
  rulePacks.get(config.activeRulePack);
}
var globalConfig, configListeners;
var init_config_plugin = __esm({
  "src/plugins/config-plugin.ts"() {
    globalConfig = null;
    configListeners = [];
  }
});

// src/plugins/config-schema.ts
var config_schema_exports = {};
__export(config_schema_exports, {
  AIBackendConfigSchema: () => exports.AIBackendConfigSchema,
  AdapterConfigSchema: () => exports.AdapterConfigSchema,
  CONFIG_SCHEMA_VERSION: () => exports.CONFIG_SCHEMA_VERSION,
  ClassifierConfigSchema: () => exports.ClassifierConfigSchema,
  ConsentLensConfigSchema: () => exports.ConsentLensConfigSchema,
  PolicyExtractorConfigSchema: () => exports.PolicyExtractorConfigSchema,
  ProviderConfigSchema: () => exports.ProviderConfigSchema,
  RulePackConfigSchema: () => exports.RulePackConfigSchema,
  UserSettingsSchema: () => exports.UserSettingsSchema,
  createDefaultConfig: () => createDefaultConfig,
  mergeConfig: () => mergeConfig,
  migrateConfig: () => migrateConfig,
  safeValidateConfig: () => safeValidateConfig,
  validateConfig: () => validateConfig
});
function validateConfig(data) {
  return exports.ConsentLensConfigSchema.parse(data);
}
function safeValidateConfig(data) {
  const result = exports.ConsentLensConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
function createDefaultConfig() {
  return exports.ConsentLensConfigSchema.parse({
    version: 1,
    adapters: [
      { type: "oauth", enabled: true, priority: 10 },
      { type: "browser-permission", enabled: true, priority: 20 },
      { type: "cookie", enabled: true, priority: 30 },
      { type: "policy", enabled: true, priority: 40 },
      { type: "terms", enabled: true, priority: 50 }
    ],
    classifiers: [
      { name: "default", enabled: true }
    ],
    policyExtractors: [
      { name: "default", enabled: true }
    ],
    aiBackends: [
      { name: "openjev", enabled: false }
    ],
    providers: [
      { id: "google", enabled: true },
      { id: "github", enabled: true },
      { id: "microsoft", enabled: true },
      { id: "slack", enabled: true },
      { id: "discord", enabled: true }
    ],
    rulePacks: [
      { name: "balanced", enabled: true, source: "builtin" },
      { name: "strict", enabled: false, source: "builtin" },
      { name: "essential", enabled: false, source: "builtin" },
      { name: "no-ai-training", enabled: false, source: "builtin" },
      { name: "paranoid", enabled: false, source: "builtin" }
    ],
    activeRulePack: "balanced",
    settings: {
      theme: "system",
      notifications: true,
      autoAnalyze: true,
      strictMode: false,
      language: "en",
      dataRetentionDays: 90,
      telemetry: false
    }
  });
}
function mergeConfig(base, partial) {
  const merged = {
    ...base,
    ...partial,
    adapters: partial.adapters ? [...base.adapters, ...partial.adapters] : base.adapters,
    classifiers: partial.classifiers ? [...base.classifiers, ...partial.classifiers] : base.classifiers,
    policyExtractors: partial.policyExtractors ? [...base.policyExtractors, ...partial.policyExtractors] : base.policyExtractors,
    aiBackends: partial.aiBackends ? [...base.aiBackends, ...partial.aiBackends] : base.aiBackends,
    providers: partial.providers ? [...base.providers, ...partial.providers] : base.providers,
    rulePacks: partial.rulePacks ? [...base.rulePacks, ...partial.rulePacks] : base.rulePacks,
    settings: { ...base.settings, ...partial.settings }
  };
  return exports.ConsentLensConfigSchema.parse(merged);
}
function migrateConfig(data, fromVersion) {
  return validateConfig(data);
}
exports.AdapterConfigSchema = void 0; exports.ClassifierConfigSchema = void 0; exports.PolicyExtractorConfigSchema = void 0; exports.AIBackendConfigSchema = void 0; exports.ProviderConfigSchema = void 0; exports.RulePackConfigSchema = void 0; exports.UserSettingsSchema = void 0; exports.ConsentLensConfigSchema = void 0; exports.CONFIG_SCHEMA_VERSION = void 0;
var init_config_schema = __esm({
  "src/plugins/config-schema.ts"() {
    exports.AdapterConfigSchema = zod.z.object({
      type: zod.z.string().min(1),
      enabled: zod.z.boolean(),
      priority: zod.z.number().int().optional(),
      options: zod.z.record(zod.z.unknown()).optional()
    });
    exports.ClassifierConfigSchema = zod.z.object({
      name: zod.z.string().min(1),
      enabled: zod.z.boolean(),
      options: zod.z.record(zod.z.unknown()).optional()
    });
    exports.PolicyExtractorConfigSchema = zod.z.object({
      name: zod.z.string().min(1),
      enabled: zod.z.boolean(),
      options: zod.z.record(zod.z.unknown()).optional()
    });
    exports.AIBackendConfigSchema = zod.z.object({
      name: zod.z.string().min(1),
      enabled: zod.z.boolean(),
      options: zod.z.record(zod.z.unknown()).optional()
    });
    exports.ProviderConfigSchema = zod.z.object({
      id: zod.z.string().min(1),
      enabled: zod.z.boolean(),
      options: zod.z.record(zod.z.unknown()).optional()
    });
    exports.RulePackConfigSchema = zod.z.object({
      name: zod.z.string().min(1),
      enabled: zod.z.boolean(),
      source: zod.z.enum(["builtin", "local", "remote"]),
      path: zod.z.string().optional(),
      options: zod.z.record(zod.z.unknown()).optional()
    });
    exports.UserSettingsSchema = zod.z.object({
      theme: zod.z.enum(["light", "dark", "system"]),
      notifications: zod.z.boolean(),
      autoAnalyze: zod.z.boolean(),
      strictMode: zod.z.boolean(),
      language: zod.z.string(),
      dataRetentionDays: zod.z.number().int().positive(),
      telemetry: zod.z.boolean()
    }).default({
      theme: "system",
      notifications: true,
      autoAnalyze: true,
      strictMode: false,
      language: "en",
      dataRetentionDays: 90,
      telemetry: false
    });
    exports.ConsentLensConfigSchema = zod.z.object({
      version: zod.z.number().int().positive(),
      adapters: zod.z.array(exports.AdapterConfigSchema),
      classifiers: zod.z.array(exports.ClassifierConfigSchema),
      policyExtractors: zod.z.array(exports.PolicyExtractorConfigSchema),
      aiBackends: zod.z.array(exports.AIBackendConfigSchema),
      providers: zod.z.array(exports.ProviderConfigSchema),
      rulePacks: zod.z.array(exports.RulePackConfigSchema),
      activeRulePack: zod.z.string(),
      settings: exports.UserSettingsSchema
    }).default({
      version: 1,
      adapters: [
        { type: "oauth", enabled: true, priority: 10 },
        { type: "browser-permission", enabled: true, priority: 20 },
        { type: "cookie", enabled: true, priority: 30 },
        { type: "policy", enabled: true, priority: 40 },
        { type: "terms", enabled: true, priority: 50 }
      ],
      classifiers: [
        { name: "default", enabled: true }
      ],
      policyExtractors: [
        { name: "default", enabled: true }
      ],
      aiBackends: [
        { name: "openjev", enabled: false }
      ],
      providers: [
        { id: "google", enabled: true },
        { id: "github", enabled: true },
        { id: "microsoft", enabled: true },
        { id: "slack", enabled: true },
        { id: "discord", enabled: true }
      ],
      rulePacks: [
        { name: "balanced", enabled: true, source: "builtin" },
        { name: "strict", enabled: false, source: "builtin" },
        { name: "essential", enabled: false, source: "builtin" },
        { name: "no-ai-training", enabled: false, source: "builtin" },
        { name: "paranoid", enabled: false, source: "builtin" }
      ],
      activeRulePack: "balanced",
      settings: {
        theme: "system",
        notifications: true,
        autoAnalyze: true,
        strictMode: false,
        language: "en",
        dataRetentionDays: 90,
        telemetry: false
      }
    });
    exports.CONFIG_SCHEMA_VERSION = 1;
  }
});

// src/plugins/rule-pack.ts
var rule_pack_exports = {};
__export(rule_pack_exports, {
  BUILTIN_RULE_PACKS: () => exports.BUILTIN_RULE_PACKS,
  CapabilityPatternSchema: () => exports.CapabilityPatternSchema,
  DomainPatternSchema: () => exports.DomainPatternSchema,
  RulePackMetadataSchema: () => exports.RulePackMetadataSchema,
  RulePackSchema: () => exports.RulePackSchema,
  RuleSchema: () => exports.RuleSchema,
  createRulePack: () => createRulePack,
  safeValidateRulePack: () => safeValidateRulePack,
  validateRulePack: () => validateRulePack
});
function validateRulePack(data) {
  return exports.RulePackSchema.parse(data);
}
function safeValidateRulePack(data) {
  const result = exports.RulePackSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
function createRulePack(params) {
  return {
    metadata: {
      name: params.name,
      version: params.version,
      author: params.author,
      description: params.description,
      dependencies: params.dependencies,
      minEngineVersion: params.minEngineVersion,
      tags: params.tags,
      license: params.license,
      homepage: params.homepage,
      repository: params.repository
    },
    rules: params.rules
  };
}
exports.CapabilityPatternSchema = void 0; exports.DomainPatternSchema = void 0; exports.RuleSchema = void 0; exports.RulePackMetadataSchema = void 0; exports.RulePackSchema = void 0; exports.BUILTIN_RULE_PACKS = void 0;
var init_rule_pack = __esm({
  "src/plugins/rule-pack.ts"() {
    exports.CapabilityPatternSchema = zod.z.object({
      type: zod.z.string().optional(),
      provider: zod.z.string().optional(),
      scope: zod.z.string().optional(),
      permission: zod.z.string().optional(),
      category: zod.z.string().optional(),
      practice: zod.z.string().optional(),
      clause: zod.z.string().optional(),
      custom: zod.z.optional(zod.z.record(zod.z.union([zod.z.string(), zod.z.array(zod.z.string())])))
    });
    exports.DomainPatternSchema = zod.z.object({
      domains: zod.z.array(zod.z.string()).optional(),
      domainSuffixes: zod.z.array(zod.z.string()).optional(),
      domainPatterns: zod.z.array(zod.z.string()).optional(),
      excludeDomains: zod.z.array(zod.z.string()).optional(),
      excludePatterns: zod.z.array(zod.z.string()).optional()
    });
    exports.RuleSchema = zod.z.object({
      id: zod.z.string().min(1),
      name: zod.z.string().min(1),
      capability: exports.CapabilityPatternSchema,
      domain: exports.DomainPatternSchema,
      action: zod.z.enum(["allow", "ask", "deny"]),
      layer: zod.z.enum(["user", "trusted", "community", "default"]),
      ttl: zod.z.optional(zod.z.number().int().positive()),
      comment: zod.z.optional(zod.z.string()),
      metadata: zod.z.optional(zod.z.record(zod.z.unknown()))
    });
    exports.RulePackMetadataSchema = zod.z.object({
      name: zod.z.string().min(1),
      version: zod.z.string().regex(/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/),
      // SemVer
      author: zod.z.string().min(1),
      description: zod.z.string().min(1),
      dependencies: zod.z.array(zod.z.string()).optional(),
      minEngineVersion: zod.z.string().optional(),
      tags: zod.z.array(zod.z.string()).optional(),
      license: zod.z.string().optional(),
      homepage: zod.z.string().url().optional(),
      repository: zod.z.string().url().optional()
    });
    exports.RulePackSchema = zod.z.object({
      metadata: exports.RulePackMetadataSchema,
      rules: zod.z.array(exports.RuleSchema).min(1)
    });
    exports.BUILTIN_RULE_PACKS = {
      balanced: createRulePack({
        name: "balanced",
        version: "1.0.0",
        author: "ConsentLens",
        description: "Balanced privacy protection - allows essential, asks for analytics/ads, denies tracking",
        rules: [
          {
            id: "allow-essential-cookies",
            name: "Allow Essential Cookies",
            capability: { type: "cookie", category: "essential" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "allow-functional-cookies",
            name: "Allow Functional Cookies",
            capability: { type: "cookie", category: "functional" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "allow-security-cookies",
            name: "Allow Security Cookies",
            capability: { type: "cookie", category: "security" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "ask-analytics-cookies",
            name: "Ask for Analytics Cookies",
            capability: { type: "cookie", category: "analytics" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "ask-personalization-cookies",
            name: "Ask for Personalization Cookies",
            capability: { type: "cookie", category: "personalization" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "deny-advertising-cookies",
            name: "Deny Advertising Cookies",
            capability: { type: "cookie", category: "advertising" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "deny-unknown-cookies",
            name: "Deny Unknown Cookies",
            capability: { type: "cookie", category: "unknown" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "allow-oauth-core",
            name: "Allow Core OAuth Providers",
            capability: { type: "oauth", provider: "*" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "ask-browser-permissions",
            name: "Ask for Browser Permissions",
            capability: { type: "browser-permission", permission: "*" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "ask-policy-data-sharing",
            name: "Ask for Data Sharing Practices",
            capability: { type: "policy", practice: "data-sharing" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "deny-policy-data-selling",
            name: "Deny Data Selling",
            capability: { type: "policy", practice: "data-selling" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "ask-policy-ai-training",
            name: "Ask for AI Training",
            capability: { type: "policy", practice: "ai-training" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "deny-terms-arbitration",
            name: "Deny Mandatory Arbitration",
            capability: { type: "terms", clause: "arbitration" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "deny-terms-content-license",
            name: "Deny Broad Content Licensing",
            capability: { type: "terms", clause: "content-licensing" },
            domain: {},
            action: "deny",
            layer: "default"
          }
        ]
      }),
      strict: createRulePack({
        name: "strict",
        version: "1.0.0",
        author: "ConsentLens",
        description: "Strict privacy protection - denies all non-essential by default",
        rules: [
          {
            id: "allow-essential-only",
            name: "Allow Only Essential",
            capability: { type: "cookie", category: "essential" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "allow-security-only",
            name: "Allow Security Cookies",
            capability: { type: "cookie", category: "security" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "deny-all-other-cookies",
            name: "Deny All Other Cookies",
            capability: { type: "cookie" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "ask-all-oauth",
            name: "Ask for All OAuth",
            capability: { type: "oauth" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "ask-all-permissions",
            name: "Ask for All Browser Permissions",
            capability: { type: "browser-permission" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "deny-data-sharing",
            name: "Deny Data Sharing",
            capability: { type: "policy", practice: "data-sharing" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "deny-ai-training",
            name: "Deny AI Training",
            capability: { type: "policy", practice: "ai-training" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "deny-all-terms-high",
            name: "Deny High Severity Terms",
            capability: { type: "terms" },
            domain: {},
            action: "deny",
            layer: "default",
            metadata: { severityFilter: "high" }
          }
        ]
      }),
      essential: createRulePack({
        name: "essential",
        version: "1.0.0",
        author: "ConsentLens",
        description: "Minimal protection - only blocks known malicious patterns",
        rules: [
          {
            id: "allow-all-cookies",
            name: "Allow All Cookies",
            capability: { type: "cookie" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "allow-all-oauth",
            name: "Allow All OAuth",
            capability: { type: "oauth" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "ask-permissions",
            name: "Ask for Browser Permissions",
            capability: { type: "browser-permission" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "deny-data-selling",
            name: "Deny Data Selling",
            capability: { type: "policy", practice: "data-selling" },
            domain: {},
            action: "deny",
            layer: "default"
          }
        ]
      }),
      "no-ai-training": createRulePack({
        name: "no-ai-training",
        version: "1.0.0",
        author: "ConsentLens",
        description: "Blocks AI training data collection while allowing other functionality",
        rules: [
          {
            id: "allow-most-cookies",
            name: "Allow Most Cookies",
            capability: { type: "cookie", category: "*" },
            domain: {},
            action: "allow",
            layer: "default",
            metadata: { excludeCategories: ["advertising"] }
          },
          {
            id: "deny-advertising-cookies",
            name: "Deny Advertising Cookies",
            capability: { type: "cookie", category: "advertising" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "allow-oauth",
            name: "Allow OAuth",
            capability: { type: "oauth" },
            domain: {},
            action: "allow",
            layer: "default"
          },
          {
            id: "ask-permissions",
            name: "Ask for Browser Permissions",
            capability: { type: "browser-permission" },
            domain: {},
            action: "ask",
            layer: "default"
          },
          {
            id: "deny-ai-training-policy",
            name: "Deny AI Training in Policies",
            capability: { type: "policy", practice: "ai-training" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "deny-ai-training-terms",
            name: "Deny AI Training in Terms",
            capability: { type: "terms", clause: "ai-training" },
            domain: {},
            action: "deny",
            layer: "default"
          }
        ]
      }),
      paranoid: createRulePack({
        name: "paranoid",
        version: "1.0.0",
        author: "ConsentLens",
        description: "Maximum privacy - denies everything except explicitly allowed",
        rules: [
          {
            id: "deny-all-by-default",
            name: "Deny All by Default",
            capability: {},
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "allow-session-cookies",
            name: "Allow Session Cookies Only",
            capability: { type: "cookie", category: "essential" },
            domain: {},
            action: "allow",
            layer: "user"
          },
          {
            id: "ask-oauth-trusted",
            name: "Ask for Trusted OAuth Only",
            capability: { type: "oauth", provider: "google" },
            domain: {},
            action: "ask",
            layer: "user"
          },
          {
            id: "ask-oauth-trusted-github",
            name: "Ask for Trusted OAuth Only (GitHub)",
            capability: { type: "oauth", provider: "github" },
            domain: {},
            action: "ask",
            layer: "user"
          },
          {
            id: "ask-oauth-trusted-microsoft",
            name: "Ask for Trusted OAuth Only (Microsoft)",
            capability: { type: "oauth", provider: "microsoft" },
            domain: {},
            action: "ask",
            layer: "user"
          },
          {
            id: "deny-all-other-oauth",
            name: "Deny Other OAuth",
            capability: { type: "oauth" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "ask-permissions-minimal",
            name: "Ask for Minimal Permissions",
            capability: { type: "browser-permission", permission: "notifications" },
            domain: {},
            action: "ask",
            layer: "user"
          },
          {
            id: "deny-all-policy",
            name: "Deny All Policy Practices",
            capability: { type: "policy" },
            domain: {},
            action: "deny",
            layer: "default"
          },
          {
            id: "deny-all-terms",
            name: "Deny All Terms Clauses",
            capability: { type: "terms" },
            domain: {},
            action: "deny",
            layer: "default"
          }
        ]
      })
    };
  }
});

// src/plugins/index.ts
init_adapter_plugin();
init_classifier_plugin();
init_policy_extractor_plugin();
init_ai_backend_plugin();
init_provider_plugin();
init_config_plugin();
init_config_schema();
init_rule_pack();

// src/plugins/import-export.ts
var adapterRegistry = /* @__PURE__ */ new Map();
var classifierRegistry2 = /* @__PURE__ */ new Map();
var policyExtractorRegistry2 = /* @__PURE__ */ new Map();
var aiBackendRegistry2 = /* @__PURE__ */ new Map();
var providerRegistry2 = /* @__PURE__ */ new Map();
var rulePackRegistry = /* @__PURE__ */ new Map();
function registerAdapterForImport(type, adapter) {
  adapterRegistry.set(type, adapter);
}
function registerClassifierForImport(name, fn) {
  classifierRegistry2.set(name, fn);
}
function registerPolicyExtractorForImport(name, fn) {
  policyExtractorRegistry2.set(name, fn);
}
function registerAIBackendForImport(name, backend) {
  aiBackendRegistry2.set(name, backend);
}
function registerProviderForImport(id, config) {
  providerRegistry2.set(id, config);
}
function registerRulePackForImport(name, pack) {
  rulePackRegistry.set(name, pack);
}
async function exportConfig() {
  const { getConfig: getConfig2 } = await Promise.resolve().then(() => (init_config_plugin(), config_plugin_exports));
  const { createDefaultConfig: createDefaultConfig2 } = await Promise.resolve().then(() => (init_config_schema(), config_schema_exports));
  const config = getConfig2() ?? createDefaultConfig2();
  return {
    version: config.version,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    exportedBy: "ConsentLens",
    config,
    runtime: {
      adapters: [...adapterRegistry.keys()],
      classifiers: [...classifierRegistry2.keys()],
      policyExtractors: [...policyExtractorRegistry2.keys()],
      aiBackends: [...aiBackendRegistry2.keys()],
      providers: [...providerRegistry2.keys()],
      rulePacks: [...rulePackRegistry.keys()]
    }
  };
}
async function importConfig(json) {
  const { createDefaultConfig: createDefaultConfig2 } = await Promise.resolve().then(() => (init_config_schema(), config_schema_exports));
  const { validateConfig: validateConfig2 } = await Promise.resolve().then(() => (init_config_schema(), config_schema_exports));
  const { registerAdapter: registerAdapter2 } = await Promise.resolve().then(() => (init_adapter_plugin(), adapter_plugin_exports));
  const { registerClassifier: registerClassifier2 } = await Promise.resolve().then(() => (init_classifier_plugin(), classifier_plugin_exports));
  const { registerPolicyExtractor: registerPolicyExtractor2 } = await Promise.resolve().then(() => (init_policy_extractor_plugin(), policy_extractor_plugin_exports));
  const { registerAIBackend: registerAIBackend2 } = await Promise.resolve().then(() => (init_ai_backend_plugin(), ai_backend_plugin_exports));
  const { registerProvider: registerProvider2 } = await Promise.resolve().then(() => (init_provider_plugin(), provider_plugin_exports));
  const { initConfig: initConfig2, updateConfig: updateConfig2 } = await Promise.resolve().then(() => (init_config_plugin(), config_plugin_exports));
  const result = {
    success: false,
    config: createDefaultConfig2(),
    registered: {
      adapters: 0,
      classifiers: 0,
      policyExtractors: 0,
      aiBackends: 0,
      providers: 0,
      rulePacks: 0
    },
    warnings: [],
    errors: []
  };
  let exportedConfig;
  try {
    if (typeof json === "string") {
      exportedConfig = JSON.parse(json);
    } else {
      exportedConfig = json;
    }
    if (!exportedConfig.config || !exportedConfig.version) {
      result.errors.push("Invalid config format: missing config or version");
      return result;
    }
    const validation = validateConfig2(exportedConfig.config);
    result.config = validation;
    if (exportedConfig.version < 1) {
      result.warnings.push(`Config version ${exportedConfig.version} is old, migrated to v1`);
    }
    for (const type of exportedConfig.runtime.adapters) {
      const adapter = adapterRegistry.get(type);
      if (adapter) {
        try {
          registerAdapter2(type, async (context) => adapter.extract(context));
          result.registered.adapters++;
        } catch (err) {
          result.warnings.push(`Failed to register adapter '${type}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Adapter '${type}' not found in registry`);
      }
    }
    for (const name of exportedConfig.runtime.classifiers) {
      const fn = classifierRegistry2.get(name);
      if (fn) {
        try {
          registerClassifier2(name, fn);
          result.registered.classifiers++;
        } catch (err) {
          result.warnings.push(`Failed to register classifier '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Classifier '${name}' not found in registry`);
      }
    }
    for (const name of exportedConfig.runtime.policyExtractors) {
      const fn = policyExtractorRegistry2.get(name);
      if (fn) {
        try {
          registerPolicyExtractor2(name, fn);
          result.registered.policyExtractors++;
        } catch (err) {
          result.warnings.push(`Failed to register policy extractor '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Policy extractor '${name}' not found in registry`);
      }
    }
    for (const name of exportedConfig.runtime.aiBackends) {
      const backend = aiBackendRegistry2.get(name);
      if (backend) {
        try {
          registerAIBackend2(name, backend);
          result.registered.aiBackends++;
        } catch (err) {
          result.warnings.push(`Failed to register AI backend '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`AI backend '${name}' not found in registry`);
      }
    }
    for (const id of exportedConfig.runtime.providers) {
      const provider = providerRegistry2.get(id);
      if (provider) {
        try {
          registerProvider2(id, provider);
          result.registered.providers++;
        } catch (err) {
          result.warnings.push(`Failed to register provider '${id}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Provider '${id}' not found in registry`);
      }
    }
    for (const name of exportedConfig.runtime.rulePacks) {
      const pack = rulePackRegistry.get(name);
      if (pack) {
        try {
          const { validateRulePack: validateRulePack2 } = await Promise.resolve().then(() => (init_rule_pack(), rule_pack_exports));
          validateRulePack2(pack);
          result.registered.rulePacks++;
        } catch (err) {
          result.warnings.push(`Failed to register rule pack '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Rule pack '${name}' not found in registry`);
      }
    }
    await initConfig2();
    updateConfig2(result.config);
    result.success = true;
  } catch (err) {
    result.errors.push(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return result;
}
async function validateExport(json) {
  try {
    const { validateConfig: validateConfig2 } = await Promise.resolve().then(() => (init_config_schema(), config_schema_exports));
    const exportedConfig = typeof json === "string" ? JSON.parse(json) : json;
    if (!exportedConfig.config || !exportedConfig.version) {
      return { valid: false, errors: ["Invalid config format: missing config or version"] };
    }
    const config = validateConfig2(exportedConfig.config);
    return { valid: true, config };
  } catch (err) {
    return { valid: false, errors: [`Validation failed: ${err instanceof Error ? err.message : String(err)}`] };
  }
}
async function exportConfigMinimal() {
  const { getConfig: getConfig2 } = await Promise.resolve().then(() => (init_config_plugin(), config_plugin_exports));
  const { createDefaultConfig: createDefaultConfig2 } = await Promise.resolve().then(() => (init_config_schema(), config_schema_exports));
  return getConfig2() ?? createDefaultConfig2();
}
function configsEquivalent(a, b) {
  const aNormalized = { ...a };
  const bNormalized = { ...b };
  delete aNormalized.version;
  delete bNormalized.version;
  return JSON.stringify(aNormalized) === JSON.stringify(bNormalized);
}
function clearImportExportRegistries() {
  adapterRegistry.clear();
  classifierRegistry2.clear();
  policyExtractorRegistry2.clear();
  aiBackendRegistry2.clear();
  providerRegistry2.clear();
  rulePackRegistry.clear();
}

exports.classifyCookie = classifyCookie;
exports.clearAIBackends = clearAIBackends;
exports.clearClassifiers = clearClassifiers;
exports.clearImportExportRegistries = clearImportExportRegistries;
exports.clearPolicyExtractors = clearPolicyExtractors;
exports.clearProviders = clearProviders;
exports.configsEquivalent = configsEquivalent;
exports.createAIClassificationEvent = createAIClassificationEvent;
exports.createClassifierConsentEvent = createClassifierConsentEvent;
exports.createDefaultConfig = createDefaultConfig;
exports.createPolicyExtractorConsentEvent = createPolicyExtractorConsentEvent;
exports.createRulePack = createRulePack;
exports.detectProviders = detectProviders;
exports.exportConfig = exportConfig;
exports.exportConfigMinimal = exportConfigMinimal;
exports.extractPolicyPractices = extractPolicyPractices;
exports.findProviderByAuthUrl = findProviderByAuthUrl;
exports.getAIBackend = getAIBackend;
exports.getAllAIBackends = getAllAIBackends;
exports.getAllClassifiers = getAllClassifiers;
exports.getAllPolicyExtractors = getAllPolicyExtractors;
exports.getAllProviderScopes = getAllProviderScopes;
exports.getAllProviders = getAllProviders;
exports.getClassifier = getClassifier;
exports.getConfig = getConfig;
exports.getDefaultAIBackend = getDefaultAIBackend;
exports.getPluginRegistry = getPluginRegistry;
exports.getPolicyExtractor = getPolicyExtractor;
exports.getProvider = getProvider;
exports.getProviderScopes = getProviderScopes;
exports.importConfig = importConfig;
exports.initConfig = initConfig;
exports.mergeConfig = mergeConfig;
exports.migrateConfig = migrateConfig;
exports.onConfigChange = onConfigChange;
exports.registerAIBackend = registerAIBackend;
exports.registerAIBackendForImport = registerAIBackendForImport;
exports.registerAdapter = registerAdapter;
exports.registerAdapterForImport = registerAdapterForImport;
exports.registerAdapterInstance = registerAdapterInstance;
exports.registerClassifier = registerClassifier;
exports.registerClassifierForImport = registerClassifierForImport;
exports.registerPlugin = registerPlugin;
exports.registerPluginsFromConfig = registerPluginsFromConfig;
exports.registerPolicyExtractor = registerPolicyExtractor;
exports.registerPolicyExtractorForImport = registerPolicyExtractorForImport;
exports.registerProvider = registerProvider;
exports.registerProviderForImport = registerProviderForImport;
exports.registerRulePackForImport = registerRulePackForImport;
exports.resetConfig = resetConfig;
exports.safeValidateConfig = safeValidateConfig;
exports.safeValidateRulePack = safeValidateRulePack;
exports.setPluginRegistry = setPluginRegistry;
exports.unregisterAIBackend = unregisterAIBackend;
exports.unregisterAdapter = unregisterAdapter;
exports.unregisterClassifier = unregisterClassifier;
exports.unregisterPolicyExtractor = unregisterPolicyExtractor;
exports.unregisterProvider = unregisterProvider;
exports.updateConfig = updateConfig;
exports.validateConfig = validateConfig;
exports.validateExport = validateExport;
exports.validateRulePack = validateRulePack;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map