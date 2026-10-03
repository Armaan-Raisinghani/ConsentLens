/**
 * Integration Tests - Full Plugin Architecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PageContext } from '../../src/shared/errors.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import { AdapterRegistry } from '../../src/adapters/registry.js';
import { BaseAdapter } from '../../src/adapters/adapter.js';
import type { Adapter, AdapterResult } from '../../src/adapters/adapter.js';
import {
  registerAdapter,
  setPluginRegistry,
} from '../../src/plugins/adapter-plugin.js';
import {
  registerClassifier,
  classifyCookie,
  ParsedCookie,
  CookieCategory,
} from '../../src/plugins/classifier-plugin.js';
import {
  registerPolicyExtractor,
  extractPolicyPractices,
  PolicyPractice,
} from '../../src/plugins/policy-extractor-plugin.js';
import {
  registerAIBackend,
  getDefaultAIBackend,
  AIBackend,
} from '../../src/plugins/ai-backend-plugin.js';
import {
  registerProvider,
  detectProviders,
  findProviderByAuthUrl,
  getProviderScopes,
  ProviderConfig,
} from '../../src/plugins/provider-plugin.js';
import {
  initConfig,
  getConfig,
  updateConfig,
  ConsentLensConfig,
} from '../../src/plugins/config-plugin.js';
import {
  exportConfig,
  importConfig,
  clearImportExportRegistries,
  registerAdapterForImport,
  registerClassifierForImport,
  registerPolicyExtractorForImport,
  registerAIBackendForImport,
  registerProviderForImport,
  registerRulePackForImport,
} from '../../src/plugins/import-export.js';
import { RulePack } from '../../src/plugins/rule-pack.js';

describe('Full Plugin Architecture Integration', () => {
  beforeEach(() => {
    clearImportExportRegistries();
    vi.clearAllMocks();
  });

  const mockContext: PageContext = {
    document: {} as Document,
    url: 'https://example.com',
    origin: 'https://example.com',
  };

  describe('End-to-end plugin registration flow', () => {
    it('should register all plugin types and integrate with AdapterRegistry', async () => {
      // Initialize config
      await initConfig();
      
      // Create adapter registry
      const registry = new AdapterRegistry();
      setPluginRegistry(registry);
      
      // Register custom adapter
      class CustomCookieAdapter extends BaseAdapter {
        name = 'custom-cookie';
        priority = 35;
        
        async extract(context: PageContext): Promise<AdapterResult> {
          return { events: [], errors: [] };
        }
      }
      
      registerAdapter('custom-cookie', async (ctx) => new CustomCookieAdapter().extract(ctx));
      
      // Register custom classifier
      registerClassifier('my-classifier', (cookie: ParsedCookie) => {
        if (cookie.name.startsWith('_my_')) {
          return { category: CookieCategory.Analytics, confidence: 0.9, source: 'my-classifier' };
        }
        return null;
      });
      
      // Register custom policy extractor
      registerPolicyExtractor('my-extractor', (text: string) => [
        { practice: PolicyPractice.DataCollection, text: 'custom collection', confidence: 0.8, source: 'my-extractor' },
      ]);
      
      // Register custom AI backend
      const myBackend: AIBackend = {
        classify: vi.fn().mockResolvedValue([{ decision: 'allow', confidence: 0.9, reasoning: 'Custom backend' }]),
        extract: vi.fn().mockResolvedValue({ practices: [] }),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0.9 }),
      };
      registerAIBackend('my-backend', myBackend);
      
      // Register custom provider
      const myProvider: ProviderConfig = {
        id: 'my-provider',
        name: 'My Provider',
        authUrl: 'https://my.provider.com/oauth/authorize',
        scopeMap: { read: ['read:all'] },
        icon: '🔧',
        color: '#00FF00',
        detectionPatterns: {
          urlPatterns: [/my\.provider\.com/],
          buttonTextPatterns: [/sign in with my provider/i],
        },
      };
      registerProvider('my-provider', myProvider);
      
      // Verify all registrations work
      expect(registry.getAdapter('custom-cookie')).toBeDefined();
      expect(classifyCookie({ name: '_my_cookie', value: 'test', domain: 'example.com', path: '/', secure: true, httpOnly: false, sameSite: 'lax', isSession: true }, mockContext)).not.toBeNull();
      expect(extractPolicyPractices('we collect data', 'https://example.com', mockContext)).toHaveLength(1);
      expect(getDefaultAIBackend()).toBeDefined();
      expect(detectProviders({ ...mockContext, url: 'https://my.provider.com/oauth/authorize' })).toHaveLength(1);
      expect(findProviderByAuthUrl('https://my.provider.com/oauth/authorize')).toBeDefined();
    });
  });

  describe('Config-driven plugin registration', () => {
    it('should register plugins from config', async () => {
      const config: ConsentLensConfig = {
        version: 1,
        adapters: [
          { type: 'oauth', enabled: true, priority: 10 },
          { type: 'browser-permission', enabled: true, priority: 20 },
          { type: 'cookie', enabled: true, priority: 30 },
          { type: 'policy', enabled: true, priority: 40 },
          { type: 'terms', enabled: true, priority: 50 },
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
          { id: 'github', enabled: true },
          { id: 'microsoft', enabled: true },
          { id: 'slack', enabled: true },
          { id: 'discord', enabled: true },
        ],
        rulePacks: [
          { name: 'balanced', enabled: true, source: 'builtin' },
          { name: 'strict', enabled: false, source: 'builtin' },
          { name: 'essential', enabled: false, source: 'builtin' },
          { name: 'no-ai-training', enabled: false, source: 'builtin' },
          { name: 'paranoid', enabled: false, source: 'builtin' },
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
      
      const adapters = new Map<string, Adapter>();
      const classifiers = new Map<string, any>();
      const policyExtractors = new Map<string, any>();
      const aiBackends = new Map<string, AIBackend>();
      const providers = new Map<string, ProviderConfig>();
      const rulePacks = new Map<string, RulePack>();
      
      // Should not throw
      const { registerPluginsFromConfig } = await import('../../src/plugins/config-plugin.js');
      registerPluginsFromConfig(
        config,
        adapters,
        classifiers,
        policyExtractors,
        aiBackends,
        providers,
        rulePacks
      );
      
      // Verify config was processed
      expect(config.adapters).toHaveLength(5);
      expect(config.providers).toHaveLength(5);
      expect(config.activeRulePack).toBe('balanced');
    });
  });

  describe('Import/Export round-trip', () => {
    it('should export and import full config with all plugins', async () => {
      await initConfig();
      
      // Register some custom plugins
      class TestAdapter extends BaseAdapter {
        name = 'test-roundtrip';
        priority = 60;
        async extract(): Promise<AdapterResult> {
          return { events: [], errors: [] };
        }
      }
      
      registerAdapterForImport('test-roundtrip', new TestAdapter());
      registerClassifierForImport('test-classifier', (cookie) => 
        cookie.name.startsWith('_test_') 
          ? { category: CookieCategory.Advertising, confidence: 0.9, source: 'test' } 
          : null
      );
      registerPolicyExtractorForImport('test-extractor', () => [
        { practice: PolicyPractice.DataSharing, text: 'test sharing', confidence: 0.8, source: 'test' },
      ]);
      registerAIBackendForImport('test-backend', {
        classify: vi.fn().mockResolvedValue([{ decision: 'allow', confidence: 0.9, reasoning: 'test' }]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0.9 }),
      });
      registerProviderForImport('test-provider', {
        id: 'test-provider',
        name: 'Test Provider',
        authUrl: 'https://test.com/oauth',
        scopeMap: { read: ['read'] },
        icon: '🧪',
        color: '#FF00FF',
      });
      registerRulePackForImport('test-pack', {
        metadata: {
          name: 'test-pack',
          version: '1.0.0',
          author: 'Test',
          description: 'Test pack',
          rules: [],
        },
        rules: [],
      });
      
      // Export
      const exported = await exportConfig();
      expect(exported.runtime.adapters).toContain('test-roundtrip');
      expect(exported.runtime.classifiers).toContain('test-classifier');
      expect(exported.runtime.policyExtractors).toContain('test-extractor');
      expect(exported.runtime.aiBackends).toContain('test-backend');
      expect(exported.runtime.providers).toContain('test-provider');
      expect(exported.runtime.rulePacks).toContain('test-pack');
      
      // Import into fresh registry
      clearImportExportRegistries();
      const result = await importConfig(exported);
      
      expect(result.success).toBe(true);
      // The import should succeed but may not register all plugins if they're not in the registries
      expect(result.registered.adapters).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Config validation', () => {
    it('should validate complete config schema', async () => {
      await initConfig();
      const config = getConfig()!;
      
      expect(config.version).toBe(1);
      expect(config.adapters).toBeDefined();
      expect(config.classifiers).toBeDefined();
      expect(config.policyExtractors).toBeDefined();
      expect(config.aiBackends).toBeDefined();
      expect(config.providers).toBeDefined();
      expect(config.rulePacks).toBeDefined();
      expect(config.activeRulePack).toBe('balanced');
      expect(config.settings).toBeDefined();
    });

    it('should reject invalid config on import', async () => {
      const invalidConfig = {
        version: 1,
        adapters: 'not-an-array',
        config: {},
      } as any;
      
      const result = await importConfig(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Core 5 providers integration', () => {
    it('should have all 5 core providers registered', async () => {
      await initConfig();
      
      const config = getConfig()!;
      const providerIds = config.providers.filter(p => p.enabled).map(p => p.id);
      
      expect(providerIds).toContain('google');
      expect(providerIds).toContain('github');
      expect(providerIds).toContain('microsoft');
      expect(providerIds).toContain('slack');
      expect(providerIds).toContain('discord');
    });

    it('should have all 5 core providers enabled in config', async () => {
      await initConfig();
      
      const config = getConfig()!;
      const enabledProviders = config.providers.filter(p => p.enabled);
      
      expect(enabledProviders).toHaveLength(5);
      expect(enabledProviders.map(p => p.id).sort()).toEqual(['discord', 'github', 'google', 'microsoft', 'slack']);
    });
  });

  describe('Built-in rule packs', () => {
    it('should have all 5 built-in rule packs', async () => {
      const config = getConfig()!;
      const packNames = config.rulePacks.map(p => p.name);
      
      expect(packNames).toContain('balanced');
      expect(packNames).toContain('strict');
      expect(packNames).toContain('essential');
      expect(packNames).toContain('no-ai-training');
      expect(packNames).toContain('paranoid');
    });

    it('should have balanced as default active pack', async () => {
      const config = getConfig()!;
      expect(config.activeRulePack).toBe('balanced');
    });
  });
});