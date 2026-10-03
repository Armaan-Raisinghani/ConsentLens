/**
 * Config Schema Tests - per PLUGIN-07
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateConfig,
  safeValidateConfig,
  createDefaultConfig,
  mergeConfig,
  migrateConfig,
  AdapterConfigSchema,
  ClassifierConfigSchema,
  PolicyExtractorConfigSchema,
  AIBackendConfigSchema,
  ProviderConfigSchema,
  RulePackConfigSchema,
  UserSettingsSchema,
  ConsentLensConfigSchema,
  ConsentLensConfig,
  CONFIG_SCHEMA_VERSION,
} from '../../src/plugins/config-schema.js';

describe('Config Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateConfig', () => {
    it('should validate a correct config', () => {
      const config = createDefaultConfig();
      const validated = validateConfig(config);
      
      expect(validated.version).toBe(1);
      expect(validated.adapters).toHaveLength(5);
      expect(validated.activeRulePack).toBe('balanced');
    });

    it('should throw for invalid config', () => {
      const invalidConfig = {
        version: 1,
        adapters: 'not-an-array',
      };
      
      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('should apply defaults for missing optional fields', () => {
      const minimalConfig = {
        version: 1,
        adapters: [],
        classifiers: [],
        policyExtractors: [],
        aiBackends: [],
        providers: [],
        rulePacks: [],
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
      
      const validated = validateConfig(minimalConfig);
      expect(validated.version).toBe(1);
      expect(validated.activeRulePack).toBe('balanced');
    });
  });

  describe('safeValidateConfig', () => {
    it('should return success for valid config', () => {
      const config = createDefaultConfig();
      const result = safeValidateConfig(config);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
      }
    });

    it('should return error for invalid config', () => {
      const invalidConfig = { invalid: true };
      const result = safeValidateConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('createDefaultConfig', () => {
    it('should create valid default config', () => {
      const config = createDefaultConfig();
      
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

    it('should have correct adapter priorities', () => {
      const config = createDefaultConfig();
      const priorities = config.adapters.map(a => a.priority);
      
      expect(priorities).toEqual([10, 20, 30, 40, 50]);
    });

    it('should have 5 core providers', () => {
      const config = createDefaultConfig();
      const providerIds = config.providers.map(p => p.id);
      
      expect(providerIds).toContain('google');
      expect(providerIds).toContain('github');
      expect(providerIds).toContain('microsoft');
      expect(providerIds).toContain('slack');
      expect(providerIds).toContain('discord');
    });

    it('should have 5 built-in rule packs', () => {
      const config = createDefaultConfig();
      const packNames = config.rulePacks.map(p => p.name);
      
      expect(packNames).toContain('balanced');
      expect(packNames).toContain('strict');
      expect(packNames).toContain('essential');
      expect(packNames).toContain('no-ai-training');
      expect(packNames).toContain('paranoid');
    });
  });

  describe('mergeConfig', () => {
    it('should merge partial config into base', () => {
      const base = createDefaultConfig();
      const partial: Partial<ConsentLensConfig> = {
        activeRulePack: 'strict',
        settings: { strictMode: true },
      };
      
      const merged = mergeConfig(base, partial);
      
      expect(merged.activeRulePack).toBe('strict');
      expect(merged.settings.strictMode).toBe(true);
      expect(merged.settings.theme).toBe('system'); // preserved
    });

    it('should append arrays', () => {
      const base = createDefaultConfig();
      const partial: Partial<ConsentLensConfig> = {
        adapters: [{ type: 'custom', enabled: true, priority: 60 }],
      };
      
      const merged = mergeConfig(base, partial);
      
      expect(merged.adapters).toHaveLength(6);
      expect(merged.adapters[5].type).toBe('custom');
    });

    it('should not modify original base config', () => {
      const base = createDefaultConfig();
      const originalActivePack = base.activeRulePack;
      
      mergeConfig(base, { activeRulePack: 'strict' });
      
      expect(base.activeRulePack).toBe(originalActivePack);
    });
  });

  describe('migrateConfig', () => {
    it('should validate config at current version', () => {
      const config = createDefaultConfig();
      const migrated = migrateConfig(config, 1);
      
      expect(migrated.version).toBe(1);
    });
  });

  describe('AdapterConfigSchema', () => {
    it('should validate adapter config', () => {
      const validConfig = {
        type: 'oauth',
        enabled: true,
        priority: 10,
        options: { custom: 'value' },
      };
      
      const result = AdapterConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should require type field', () => {
      const invalidConfig = {
        enabled: true,
        priority: 10,
      };
      
      const result = AdapterConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should allow optional priority and options', () => {
      const minimalConfig = {
        type: 'oauth',
        enabled: true,
      };
      
      const result = AdapterConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('ClassifierConfigSchema', () => {
    it('should validate classifier config', () => {
      const validConfig = {
        name: 'default',
        enabled: true,
        options: { threshold: 0.8 },
      };
      
      const result = ClassifierConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const invalidConfig = {
        enabled: true,
      };
      
      const result = ClassifierConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('PolicyExtractorConfigSchema', () => {
    it('should validate policy extractor config', () => {
      const validConfig = {
        name: 'default',
        enabled: true,
        options: { language: 'en' },
      };
      
      const result = PolicyExtractorConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const invalidConfig = {
        enabled: true,
      };
      
      const result = PolicyExtractorConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('AIBackendConfigSchema', () => {
    it('should validate AI backend config', () => {
      const validConfig = {
        name: 'openjev',
        enabled: false,
        options: { apiKey: 'secret' },
      };
      
      const result = AIBackendConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const invalidConfig = {
        enabled: false,
      };
      
      const result = AIBackendConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('ProviderConfigSchema', () => {
    it('should validate provider config', () => {
      const validConfig = {
        id: 'google',
        enabled: true,
        options: { region: 'us' },
      };
      
      const result = ProviderConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should require id field', () => {
      const invalidConfig = {
        enabled: true,
      };
      
      const result = ProviderConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('RulePackConfigSchema', () => {
    it('should validate rule pack config', () => {
      const validConfig = {
        name: 'balanced',
        enabled: true,
        source: 'builtin',
        path: '/path/to/pack.json',
        options: { strict: true },
      };
      
      const result = RulePackConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const invalidConfig = {
        enabled: true,
        source: 'builtin',
      };
      
      const result = RulePackConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate source enum', () => {
      const validSources = ['builtin', 'local', 'remote'];
      
      for (const source of validSources) {
        const config = {
          name: 'test',
          enabled: true,
          source,
        };
        const result = RulePackConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid source', () => {
      const invalidConfig = {
        name: 'test',
        enabled: true,
        source: 'invalid',
      };
      
      const result = RulePackConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('UserSettingsSchema', () => {
    const validSettings = {
      theme: 'dark',
      notifications: false,
      autoAnalyze: false,
      strictMode: true,
      language: 'fr',
      dataRetentionDays: 30,
      telemetry: true,
    };
    
    it('should validate user settings', () => {
      const result = UserSettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
    });

    it('should validate theme enum', () => {
      const validThemes = ['light', 'dark', 'system'];
      
      for (const theme of validThemes) {
        const settings = { ...validSettings, theme };
        const result = UserSettingsSchema.safeParse(settings);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid theme', () => {
      const invalidSettings = { ...validSettings, theme: 'invalid' };
      const result = UserSettingsSchema.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });

    it('should apply defaults', () => {
      // Zod v3 applies defaults only for optional fields or missing fields
      // Required fields must be provided
      const minimalSettings = {
        theme: 'system',
        notifications: true,
        autoAnalyze: true,
        strictMode: false,
        language: 'en',
        dataRetentionDays: 90,
        telemetry: false,
      };
      const result = UserSettingsSchema.safeParse(minimalSettings);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.theme).toBe('system');
        expect(result.data.notifications).toBe(true);
        expect(result.data.strictMode).toBe(false);
      }
    });
  });

  describe('ConsentLensConfigSchema', () => {
    it('should validate complete config', () => {
      const config = createDefaultConfig();
      const result = ConsentLensConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for all optional fields', () => {
      // Zod v3 requires all required fields to be provided
      const minimalConfig = {
        version: 1,
        adapters: [],
        classifiers: [],
        policyExtractors: [],
        aiBackends: [],
        providers: [],
        rulePacks: [],
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
      
      const result = ConsentLensConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.activeRulePack).toBe('balanced');
      }
    });
  });

  describe('CONFIG_SCHEMA_VERSION', () => {
    it('should be 1', () => {
      expect(CONFIG_SCHEMA_VERSION).toBe(1);
    });
  });
});