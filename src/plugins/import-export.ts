/**
 * Config Import/Export API - per PLUGIN-08
 * Full configuration portability via exportConfig() and importConfig()
 */

import type { ConsentLensConfig } from './config-schema.js';
import type { RulePack } from './rule-pack.js';
import type { ProviderConfig } from './provider-plugin.js';
import type { AIBackend } from './ai-backend-plugin.js';
import type { ClassifierFn } from './classifier-plugin.js';
import type { PolicyExtractorFn } from './policy-extractor-plugin.js';
import type { Adapter } from '../adapters/adapter.js';
import type { PageContext } from '../shared/errors.js';

/**
 * Exported configuration structure (serializable)
 */
export interface ExportedConfig {
  version: number;
  exportedAt: string;
  exportedBy: string;
  config: ConsentLensConfig;
  // Runtime registrations (not in config file but needed for full restore)
  runtime: {
    adapters: string[]; // adapter type names
    classifiers: string[]; // classifier names
    policyExtractors: string[]; // extractor names
    aiBackends: string[]; // backend names
    providers: string[]; // provider IDs
    rulePacks: string[]; // rule pack names
  };
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  config: ConsentLensConfig;
  registered: {
    adapters: number;
    classifiers: number;
    policyExtractors: number;
    aiBackends: number;
    providers: number;
    rulePacks: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Global registries for runtime plugin registration
 */
const adapterRegistry = new Map<string, Adapter>();
const classifierRegistry = new Map<string, ClassifierFn>();
const policyExtractorRegistry = new Map<string, PolicyExtractorFn>();
const aiBackendRegistry = new Map<string, AIBackend>();
const providerRegistry = new Map<string, ProviderConfig>();
const rulePackRegistry = new Map<string, RulePack>();

/**
 * Registers an adapter for import/export
 */
export function registerAdapterForImport(type: string, adapter: Adapter): void {
  adapterRegistry.set(type, adapter);
}

/**
 * Registers a classifier for import/export
 */
export function registerClassifierForImport(name: string, fn: ClassifierFn): void {
  classifierRegistry.set(name, fn);
}

/**
 * Registers a policy extractor for import/export
 */
export function registerPolicyExtractorForImport(name: string, fn: PolicyExtractorFn): void {
  policyExtractorRegistry.set(name, fn);
}

/**
 * Registers an AI backend for import/export
 */
export function registerAIBackendForImport(name: string, backend: AIBackend): void {
  aiBackendRegistry.set(name, backend);
}

/**
 * Registers a provider for import/export
 */
export function registerProviderForImport(id: string, config: ProviderConfig): void {
  providerRegistry.set(id, config);
}

/**
 * Registers a rule pack for import/export
 */
export function registerRulePackForImport(name: string, pack: RulePack): void {
  rulePackRegistry.set(name, pack);
}

/**
 * Exports the complete configuration including runtime registrations
 */
export async function exportConfig(): Promise<ExportedConfig> {
  const { getConfig } = await import('./config-plugin.js');
  const { createDefaultConfig } = await import('./config-schema.js');
  const config = getConfig() ?? createDefaultConfig();
  
  return {
    version: config.version,
    exportedAt: new Date().toISOString(),
    exportedBy: 'ConsentLens',
    config,
    runtime: {
      adapters: [...adapterRegistry.keys()],
      classifiers: [...classifierRegistry.keys()],
      policyExtractors: [...policyExtractorRegistry.keys()],
      aiBackends: [...aiBackendRegistry.keys()],
      providers: [...providerRegistry.keys()],
      rulePacks: [...rulePackRegistry.keys()],
    },
  };
}

/**
 * Imports and validates a configuration
 * Registers all plugins, providers, and rule packs
 */
export async function importConfig(json: ExportedConfig | string): Promise<ImportResult> {
  const { createDefaultConfig } = await import('./config-schema.js');
  const { validateConfig } = await import('./config-schema.js');
  const { registerAdapter } = await import('./adapter-plugin.js');
  const { registerClassifier } = await import('./classifier-plugin.js');
  const { registerPolicyExtractor } = await import('./policy-extractor-plugin.js');
  const { registerAIBackend } = await import('./ai-backend-plugin.js');
  const { registerProvider } = await import('./provider-plugin.js');
  const { initConfig, updateConfig } = await import('./config-plugin.js');
  
  const result: ImportResult = {
    success: false,
    config: createDefaultConfig(),
    registered: {
      adapters: 0,
      classifiers: 0,
      policyExtractors: 0,
      aiBackends: 0,
      providers: 0,
      rulePacks: 0,
    },
    warnings: [],
    errors: [],
  };
  
  let exportedConfig: ExportedConfig;
  
  try {
    // Parse if string
    if (typeof json === 'string') {
      exportedConfig = JSON.parse(json);
    } else {
      exportedConfig = json;
    }
    
    // Validate structure
    if (!exportedConfig.config || !exportedConfig.version) {
      result.errors.push('Invalid config format: missing config or version');
      return result;
    }
    
    // Validate config schema
    const validation = validateConfig(exportedConfig.config);
    result.config = validation;
    
    // Version migration if needed
    if (exportedConfig.version < 1) {
      result.warnings.push(`Config version ${exportedConfig.version} is old, migrated to v1`);
    }
    
    // Register adapters
    for (const type of exportedConfig.runtime.adapters) {
      const adapter = adapterRegistry.get(type);
      if (adapter) {
        try {
          registerAdapter(type, async (context: PageContext) => adapter.extract(context));
          result.registered.adapters++;
        } catch (err) {
          result.warnings.push(`Failed to register adapter '${type}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Adapter '${type}' not found in registry`);
      }
    }
    
    // Register classifiers
    for (const name of exportedConfig.runtime.classifiers) {
      const fn = classifierRegistry.get(name);
      if (fn) {
        try {
          registerClassifier(name, fn);
          result.registered.classifiers++;
        } catch (err) {
          result.warnings.push(`Failed to register classifier '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Classifier '${name}' not found in registry`);
      }
    }
    
    // Register policy extractors
    for (const name of exportedConfig.runtime.policyExtractors) {
      const fn = policyExtractorRegistry.get(name);
      if (fn) {
        try {
          registerPolicyExtractor(name, fn);
          result.registered.policyExtractors++;
        } catch (err) {
          result.warnings.push(`Failed to register policy extractor '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Policy extractor '${name}' not found in registry`);
      }
    }
    
    // Register AI backends
    for (const name of exportedConfig.runtime.aiBackends) {
      const backend = aiBackendRegistry.get(name);
      if (backend) {
        try {
          registerAIBackend(name, backend);
          result.registered.aiBackends++;
        } catch (err) {
          result.warnings.push(`Failed to register AI backend '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`AI backend '${name}' not found in registry`);
      }
    }
    
    // Register providers
    for (const id of exportedConfig.runtime.providers) {
      const provider = providerRegistry.get(id);
      if (provider) {
        try {
          registerProvider(id, provider);
          result.registered.providers++;
        } catch (err) {
          result.warnings.push(`Failed to register provider '${id}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Provider '${id}' not found in registry`);
      }
    }
    
    // Register rule packs
    for (const name of exportedConfig.runtime.rulePacks) {
      const pack = rulePackRegistry.get(name);
      if (pack) {
        try {
          // Rule packs are validated on import
          const { validateRulePack } = await import('./rule-pack.js');
          validateRulePack(pack);
          result.registered.rulePacks++;
        } catch (err) {
          result.warnings.push(`Failed to register rule pack '${name}': ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        result.warnings.push(`Rule pack '${name}' not found in registry`);
      }
    }
    
    // Initialize config plugin with imported config
    await initConfig();
    updateConfig(result.config);
    
    result.success = true;
    
  } catch (err) {
    result.errors.push(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  return result;
}

/**
 * Validates an exported config without importing
 */
export async function validateExport(json: ExportedConfig | string): Promise<
  | { valid: true; config: ConsentLensConfig }
  | { valid: false; errors: string[] }
> {
  try {
    const { validateConfig } = await import('./config-schema.js');
    const exportedConfig = typeof json === 'string' ? JSON.parse(json) : json;
    
    if (!exportedConfig.config || !exportedConfig.version) {
      return { valid: false, errors: ['Invalid config format: missing config or version'] };
    }
    
    const config = validateConfig(exportedConfig.config);
    
    return { valid: true, config };
  } catch (err) {
    return { valid: false, errors: [`Validation failed: ${err instanceof Error ? err.message : String(err)}`] };
  }
}

/**
 * Creates a minimal export (config only, no runtime)
 */
export async function exportConfigMinimal(): Promise<ConsentLensConfig> {
  const { getConfig } = await import('./config-plugin.js');
  const { createDefaultConfig } = await import('./config-schema.js');
  return getConfig() ?? createDefaultConfig();
}

/**
 * Checks if two configs are equivalent (for round-trip testing)
 */
export function configsEquivalent(a: ConsentLensConfig, b: ConsentLensConfig): boolean {
  // Compare core config (excluding timestamps and runtime)
  const aNormalized = { ...a };
  const bNormalized = { ...b };
  
  // Remove version from comparison as it may differ
  delete (aNormalized as any).version;
  delete (bNormalized as any).version;
  
  return JSON.stringify(aNormalized) === JSON.stringify(bNormalized);
}

/**
 * Clears all runtime registries (for testing)
 */
export function clearImportExportRegistries(): void {
  adapterRegistry.clear();
  classifierRegistry.clear();
  policyExtractorRegistry.clear();
  aiBackendRegistry.clear();
  providerRegistry.clear();
  rulePackRegistry.clear();
}