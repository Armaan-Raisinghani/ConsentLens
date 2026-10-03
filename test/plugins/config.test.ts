/**
 * Config Plugin Tests - per PLUGIN-07
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ConsentLensConfig } from '../../src/plugins/config-schema.js';
import {
  initConfig,
  getConfig,
  updateConfig,
  resetConfig,
  onConfigChange,
  registerPluginsFromConfig,
  AdapterConfig,
  ClassifierConfig,
  PolicyExtractorConfig,
  AIBackendConfig,
  ProviderConfig as ProviderConfigEntry,
  RulePackConfig,
  UserSettings,
} from '../../src/plugins/config-plugin.js';

describe('Config Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initConfig', () => {
    it('should initialize and return default config', async () => {
      const config = await initConfig();
      
      expect(config).toBeDefined();
      expect(config.version).toBe(1);
      expect(config.adapters).toHaveLength(5);
      expect(config.classifiers).toHaveLength(1);
      expect(config.policyExtractors).toHaveLength(1);
      expect(config.aiBackends).toHaveLength(1);
      expect(config.providers).toHaveLength(5);
      expect(config.rulePacks).toHaveLength(5);
      expect(config.activeRulePack).toBe('balanced');
      expect(config.settings.theme).toBe('system');
    });

    it('should set global config', async () => {
      await initConfig();
      const config = getConfig();
      expect(config).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return config after init', async () => {
      await initConfig();
      const config = getConfig();
      expect(config).not.toBeNull();
      expect(config!.version).toBe(1);
    });
  });

  describe('updateConfig', () => {
    it('should merge partial config', async () => {
      await initConfig();
      const updated = updateConfig({
        activeRulePack: 'strict',
        settings: { strictMode: true },
      });
      
      expect(updated.activeRulePack).toBe('strict');
      expect(updated.settings.strictMode).toBe(true);
      expect(updated.settings.theme).toBe('system'); // preserved
    });

    it('should append adapters array', async () => {
      await initConfig();
      const updated = updateConfig({
        adapters: [{ type: 'custom', enabled: true, priority: 60 }],
      });
      
      expect(updated.adapters).toHaveLength(6);
      expect(updated.adapters[5].type).toBe('custom');
    });
  });

  describe('resetConfig', () => {
    it('should reset to default config', async () => {
      await initConfig();
      updateConfig({ activeRulePack: 'strict' });
      
      const reset = resetConfig();
      expect(reset.activeRulePack).toBe('balanced');
    });
  });

  describe('onConfigChange', () => {
    it('should notify listeners on config change', async () => {
      await initConfig();
      const listener = vi.fn();
      const unsubscribe = onConfigChange(listener);
      
      updateConfig({ activeRulePack: 'strict' });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ activeRulePack: 'strict' }));
      
      unsubscribe();
      updateConfig({ activeRulePack: 'essential' });
      expect(listener).toHaveBeenCalledTimes(1); // Not called again after unsubscribe
    });
  });

  describe('registerPluginsFromConfig', () => {
    it('should accept config and registries without throwing', () => {
      const config: ConsentLensConfig = {
        version: 1,
        adapters: [
          { type: 'oauth', enabled: true, priority: 10 },
          { type: 'custom', enabled: false, priority: 100 },
        ],
        classifiers: [
          { name: 'default', enabled: true },
        ],
        policyExtractors: [
          { name: 'default', enabled: true },
        ],
        aiBackends: [
          { name: 'openjev', enabled: false },
        ],
        providers: [
          { id: 'google', enabled: true },
        ],
        rulePacks: [
          { name: 'balanced', enabled: true, source: 'builtin' },
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
      
      const adapters = new Map<string, any>();
      const classifiers = new Map<string, any>();
      const policyExtractors = new Map<string, any>();
      const aiBackends = new Map<string, any>();
      const providers = new Map<string, any>();
      const rulePacks = new Map<string, any>();
      
      expect(() => registerPluginsFromConfig(
        config,
        adapters,
        classifiers,
        policyExtractors,
        aiBackends,
        providers,
        rulePacks
      )).not.toThrow();
    });
  });

  describe('Config types', () => {
    it('should allow AdapterConfig with optional fields', () => {
      const adapterConfig: AdapterConfig = {
        type: 'oauth',
        enabled: true,
        priority: 10,
        options: { custom: 'value' },
      };
      
      expect(adapterConfig.type).toBe('oauth');
      expect(adapterConfig.enabled).toBe(true);
      expect(adapterConfig.priority).toBe(10);
      expect(adapterConfig.options).toEqual({ custom: 'value' });
    });

    it('should allow ClassifierConfig', () => {
      const classifierConfig: ClassifierConfig = {
        name: 'custom-classifier',
        enabled: true,
        options: { threshold: 0.8 },
      };
      
      expect(classifierConfig.name).toBe('custom-classifier');
      expect(classifierConfig.options).toEqual({ threshold: 0.8 });
    });

    it('should allow PolicyExtractorConfig', () => {
      const extractorConfig: PolicyExtractorConfig = {
        name: 'custom-extractor',
        enabled: true,
        options: { language: 'en' },
      };
      
      expect(extractorConfig.name).toBe('custom-extractor');
      expect(extractorConfig.options).toEqual({ language: 'en' });
    });

    it('should allow AIBackendConfig', () => {
      const backendConfig: AIBackendConfig = {
        name: 'local-llm',
        enabled: false,
        options: { model: 'llama-3' },
      };
      
      expect(backendConfig.name).toBe('local-llm');
      expect(backendConfig.options).toEqual({ model: 'llama-3' });
    });

    it('should allow ProviderConfigEntry', () => {
      const providerConfig: ProviderConfigEntry = {
        id: 'custom-provider',
        enabled: true,
        options: { region: 'us-east-1' },
      };
      
      expect(providerConfig.id).toBe('custom-provider');
      expect(providerConfig.options).toEqual({ region: 'us-east-1' });
    });

    it('should allow RulePackConfig', () => {
      const rulePackConfig: RulePackConfig = {
        name: 'custom-pack',
        enabled: true,
        source: 'local',
        path: './rule-pack.json',
        options: { strict: true },
      };
      
      expect(rulePackConfig.name).toBe('custom-pack');
      expect(rulePackConfig.source).toBe('local');
      expect(rulePackConfig.path).toBe('./rule-pack.json');
    });

    it('should allow UserSettings with all fields', () => {
      const settings: UserSettings = {
        theme: 'dark',
        notifications: false,
        autoAnalyze: false,
        strictMode: true,
        language: 'fr',
        dataRetentionDays: 30,
        telemetry: true,
      };
      
      expect(settings.theme).toBe('dark');
      expect(settings.notifications).toBe(false);
      expect(settings.strictMode).toBe(true);
      expect(settings.language).toBe('fr');
      expect(settings.dataRetentionDays).toBe(30);
      expect(settings.telemetry).toBe(true);
    });
  });
});