/**
 * Config Plugin Interface - per PLUGIN-07
 * Unified configuration schema and management for ConsentLens
 */

import type { ConsentLensConfig } from './config-schema.js';
import type { Adapter } from '../adapters/adapter.js';
import type { ClassifierFn } from './classifier-plugin.js';
import type { PolicyExtractorFn } from './policy-extractor-plugin.js';
import type { AIBackend } from './ai-backend-plugin.js';
import type { ProviderConfig as ProviderConfigType } from './provider-plugin.js';
import type { RulePack } from './rule-pack.js';

/**
 * Configuration for an adapter
 */
export interface AdapterConfig {
  type: string;
  enabled: boolean;
  priority?: number;
  options?: Record<string, unknown>;
}

/**
 * Configuration for a classifier
 */
export interface ClassifierConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Configuration for a policy extractor
 */
export interface PolicyExtractorConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Configuration for an AI backend
 */
export interface AIBackendConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Configuration for a provider
 */
export interface ProviderConfigEntry {
  id: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Configuration for a rule pack
 */
export interface RulePackConfig {
  name: string;
  enabled: boolean;
  source: 'builtin' | 'local' | 'remote';
  path?: string; // local file path or remote URL
  options?: Record<string, unknown>;
}

/**
 * User settings
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoAnalyze: boolean;
  strictMode: boolean;
  language: string;
  dataRetentionDays: number;
  telemetry: boolean;
}

/**
 * Global config instance
 */
let globalConfig: ConsentLensConfig | null = null;
let configListeners: Array<(config: ConsentLensConfig) => void> = [];

/**
 * Initializes configuration from consentlens.config.json
 * Loads from disk (Node) or storage (extension)
 */
export async function initConfig(configPath?: string): Promise<ConsentLensConfig> {
  // In a real implementation, this would load from file/storage
  // For now, return default config
  const config = getDefaultConfig();
  globalConfig = config;
  notifyListeners(config);
  return config;
}

/**
 * Gets the current configuration
 */
export function getConfig(): ConsentLensConfig | null {
  return globalConfig;
}

/**
 * Updates configuration with partial merge
 */
export function updateConfig(partial: Partial<ConsentLensConfig>): ConsentLensConfig {
  if (!globalConfig) {
    throw new Error('Config not initialized. Call initConfig() first.');
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
    settings: { ...globalConfig.settings, ...partial.settings },
  };
  
  notifyListeners(globalConfig);
  return globalConfig;
}

/**
 * Resets configuration to defaults
 */
export function resetConfig(): ConsentLensConfig {
  globalConfig = getDefaultConfig();
  notifyListeners(globalConfig);
  return globalConfig;
}

/**
 * Subscribes to configuration changes
 */
export function onConfigChange(listener: (config: ConsentLensConfig) => void): () => void {
  configListeners.push(listener);
  return () => {
    const index = configListeners.indexOf(listener);
    if (index >= 0) configListeners.splice(index, 1);
  };
}

/**
 * Notifies all listeners of config change
 */
function notifyListeners(config: ConsentLensConfig): void {
  for (const listener of configListeners) {
    try {
      listener(config);
    } catch {
      // Ignore listener errors
    }
  }
}

/**
 * Gets default configuration
 */
function getDefaultConfig(): ConsentLensConfig {
  return {
    version: 1,
    adapters: [
      { type: 'oauth', enabled: true, priority: 10, options: {} },
      { type: 'browser-permission', enabled: true, priority: 20, options: {} },
      { type: 'cookie', enabled: true, priority: 30, options: {} },
      { type: 'policy', enabled: true, priority: 40, options: {} },
      { type: 'terms', enabled: true, priority: 50, options: {} },
    ],
    classifiers: [
      { name: 'default', enabled: true, options: {} },
    ],
    policyExtractors: [
      { name: 'default', enabled: true, options: {} },
    ],
    aiBackends: [
      { name: 'openjev', enabled: false, options: {} }, // Requires API key
    ],
    providers: [
      { id: 'google', enabled: true, options: {} },
      { id: 'github', enabled: true, options: {} },
      { id: 'microsoft', enabled: true, options: {} },
      { id: 'slack', enabled: true, options: {} },
      { id: 'discord', enabled: true, options: {} },
    ],
    rulePacks: [
      { name: 'balanced', enabled: true, source: 'builtin', path: '', options: {} },
      { name: 'strict', enabled: false, source: 'builtin', path: '', options: {} },
      { name: 'essential', enabled: false, source: 'builtin', path: '', options: {} },
      { name: 'no-ai-training', enabled: false, source: 'builtin', path: '', options: {} },
      { name: 'paranoid', enabled: false, source: 'builtin', path: '', options: {} },
    ],
    activeRulePack: 'balanced',
    settings: {
      theme: 'system',
      notifications: true,
      autoAnalyze: true,
      strictMode: false,
      language: 'en',
      dataRetentionDays: 90,
      telemetry: false,
    },
  };
}

/**
 * Registers all plugins from configuration
 * Called during application initialization
 */
export function registerPluginsFromConfig(
  config: ConsentLensConfig,
  adapters: Map<string, Adapter>,
  classifiers: Map<string, ClassifierFn>,
  policyExtractors: Map<string, PolicyExtractorFn>,
  aiBackends: Map<string, AIBackend>,
  providers: Map<string, ProviderConfigType>,
  rulePacks: Map<string, RulePack>
): void {
  // Register adapters
  for (const adapterConfig of config.adapters) {
    if (!adapterConfig.enabled) continue;
    const adapter = adapters.get(adapterConfig.type);
    if (adapter) {
      // AdapterRegistry handles priority
    }
  }
  
  // Register classifiers
  for (const classifierConfig of config.classifiers) {
    if (!classifierConfig.enabled) continue;
    const fn = classifiers.get(classifierConfig.name);
    if (fn) {
      // Classifier registry handles this
    }
  }
  
  // Register policy extractors
  for (const extractorConfig of config.policyExtractors) {
    if (!extractorConfig.enabled) continue;
    const fn = policyExtractors.get(extractorConfig.name);
    if (fn) {
      // Policy extractor registry handles this
    }
  }
  
  // Register AI backends
  for (const backendConfig of config.aiBackends) {
    if (!backendConfig.enabled) continue;
    const backend = aiBackends.get(backendConfig.name);
    if (backend) {
      // AI backend registry handles this
    }
  }
  
  // Register providers
  for (const providerConfig of config.providers) {
    if (!providerConfig.enabled) continue;
    const provider = providers.get(providerConfig.id);
    if (provider) {
      // Provider registry handles this
    }
  }
  
  // Set active rule pack
  const activePack = rulePacks.get(config.activeRulePack);
  if (activePack) {
    // Rule pack engine will use this
  }
}