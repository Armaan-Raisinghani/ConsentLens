/**
 * ConsentLens Core - Main entry point
 * Exports all public APIs for @consentlens/core
 */

// IR Types
export * from './ir/index.js';

// Adapters
export type { Adapter, BaseAdapter, AdapterFactory, PageContext, AdapterError, AdapterResult } from './adapters/adapter.js';
export { OAuthAdapter, AdapterRegistry } from './adapters/index.js';

// AI Semantic Layer
export * from './ai/index.js';

// Plugins - export specific items to avoid conflicts with AI exports
export { 
  // Adapter plugin
  registerAdapter,
  registerAdapterInstance,
  unregisterAdapter,
  type AdapterPlugin,
  registerPlugin,
  setPluginRegistry,
  getPluginRegistry,
  
  // Classifier plugin
  registerClassifier,
  unregisterClassifier,
  getClassifier,
  getAllClassifiers,
  clearClassifiers,
  classifyCookie,
  type ClassifierFn,
  type ParsedCookie,
  type ClassificationResult,
  type CookieCategory,
  createClassifierConsentEvent,
  
  // Policy extractor plugin
  registerPolicyExtractor,
  unregisterPolicyExtractor,
  getPolicyExtractor,
  getAllPolicyExtractors,
  clearPolicyExtractors,
  extractPolicyPractices,
  type PolicyExtractorFn,
  type ExtractedPolicyPractice,
  type PolicyPractice,
  createPolicyExtractorConsentEvent,
  
  // AI backend plugin
  registerAIBackend,
  unregisterAIBackend,
  getAIBackend,
  getAllAIBackends,
  clearAIBackends,
  getDefaultAIBackend,
  type AIBackend,
  type Classification,
  type ExtractedData,
  type ReasoningResult,
  createAIClassificationEvent,
  
  // Provider plugin
  registerProvider,
  unregisterProvider,
  getProvider,
  getAllProviders,
  clearProviders,
  findProviderByAuthUrl,
  detectProviders,
  getProviderScopes,
  getAllProviderScopes,
  type ProviderConfig,
  type ProviderDetection,
  ProviderRegistry,
  
  // Config plugin
  initConfig,
  getConfig,
  updateConfig,
  resetConfig,
  onConfigChange,
  registerPluginsFromConfig,
  type AdapterConfig,
  type ClassifierConfig,
  type PolicyExtractorConfig,
  type AIBackendConfig,
  type ProviderConfig as ProviderConfigEntry,
  type RulePackConfig,
  type UserSettings,
  
  // Config schema
  validateConfig,
  safeValidateConfig,
  createDefaultConfig,
  mergeConfig,
  migrateConfig,
  type ConsentLensConfig,
  CONFIG_SCHEMA_VERSION,
  AdapterConfigSchema,
  ClassifierConfigSchema,
  PolicyExtractorConfigSchema,
  AIBackendConfigSchema,
  ProviderConfigSchema,
  RulePackConfigSchema,
  UserSettingsSchema,
  ConsentLensConfigSchema,
  
  // Rule pack
  validateRulePack,
  safeValidateRulePack,
  createRulePack,
  type RulePack,
  type Rule,
  type CapabilityPattern,
  type DomainPattern,
  type RuleAction,
  type RuleLayer,
  type RulePackMetadata,
  BUILTIN_RULE_PACKS,
  CapabilityPatternSchema,
  DomainPatternSchema,
  RuleSchema,
  RulePackMetadataSchema,
  RulePackSchema,
  
  // Import/export
  exportConfig,
  importConfig,
  validateExport,
  exportConfigMinimal,
  configsEquivalent,
  clearImportExportRegistries,
  registerAdapterForImport,
  registerClassifierForImport,
  registerPolicyExtractorForImport,
  registerAIBackendForImport,
  registerProviderForImport,
  registerRulePackForImport,
  type ExportedConfig,
  type ImportResult,
} from './plugins/index.js';

// Shared
export * from './shared/index.js';