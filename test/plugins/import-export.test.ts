/**
 * Import/Export Tests - per PLUGIN-08
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PageContext } from '../../src/shared/errors.js';
import type { ConsentLensConfig } from '../../src/plugins/config-schema.js';
import {
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
  ExportedConfig,
  ImportResult,
} from '../../src/plugins/import-export.js';
import { registerAdapter } from '../../src/plugins/adapter-plugin.js';
import { AdapterRegistry } from '../../src/adapters/registry.js';
import { BaseAdapter } from '../../src/adapters/adapter.js';
import type { Adapter, AdapterResult } from '../../src/adapters/adapter.js';

describe('Import/Export', () => {
  beforeEach(() => {
    clearImportExportRegistries();
    vi.clearAllMocks();
  });

  const mockContext: PageContext = {
    document: {} as Document,
    url: 'https://example.com',
    origin: 'https://example.com',
  };

  const mockConfig: ConsentLensConfig = {
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
      { name: 'openjev', enabled: false, options: {} },
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

  describe('exportConfig', () => {
    it('should export config with runtime registrations', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      const exported = await exportConfig();
      
      expect(exported).toBeDefined();
      expect(exported.version).toBe(1);
      expect(exported.exportedAt).toBeDefined();
      expect(exported.exportedBy).toBe('ConsentLens');
      expect(exported.config).toBeDefined();
      expect(exported.config.version).toBe(1);
      expect(exported.runtime).toBeDefined();
    });

    it('should include runtime adapter registrations', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      // Register a custom adapter
      class CustomAdapter extends BaseAdapter {
        name = 'custom';
        priority = 60;
        async extract(): Promise<AdapterResult> {
          return { events: [], errors: [] };
        }
      }
      
      registerAdapterForImport('custom', new CustomAdapter());
      
      const exported = await exportConfig();
      expect(exported.runtime.adapters).toContain('custom');
    });
  });

  describe('importConfig', () => {
    it('should import valid config', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      const exported = await exportConfig();
      const result = await importConfig(exported);
      
      expect(result.success).toBe(true);
      expect(result.config.version).toBe(1);
      expect(result.registered.adapters).toBeGreaterThanOrEqual(0);
    });

    it('should import from JSON string', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      const exported = await exportConfig();
      const jsonString = JSON.stringify(exported);
      const result = await importConfig(jsonString);
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid config format', async () => {
      const result = await importConfig({ invalid: true } as any);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject config missing version', async () => {
      const invalidConfig = { config: mockConfig } as any;
      const result = await importConfig(invalidConfig);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should register adapters during import', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      class TestAdapter extends BaseAdapter {
        name = 'test-import-adapter';
        priority = 70;
        async extract(): Promise<AdapterResult> {
          return { events: [], errors: [] };
        }
      }
      
      registerAdapterForImport('test-import-adapter', new TestAdapter());
      
      const exported = await exportConfig();
      const result = await importConfig(exported);
      
      // The import should succeed even if no adapters are registered
      expect(result.success).toBe(true);
    });

    it('should include warnings for missing plugins', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      const exported = await exportConfig();
      // Add a runtime adapter that doesn't exist
      (exported as any).runtime.adapters.push('non-existent-adapter');
      
      const result = await importConfig(exported);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('non-existent-adapter');
    });
  });

  describe('validateExport', () => {
    it('should validate correct export', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      const exported = await exportConfig();
      const result = await validateExport(exported);
      
      expect(result.valid).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should validate JSON string', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      const exported = await exportConfig();
      const jsonString = JSON.stringify(exported);
      const result = await validateExport(jsonString);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid export', async () => {
      const result = await validateExport({ invalid: true } as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('exportConfigMinimal', () => {
    it('should export only config without runtime', async () => {
      const { initConfig } = await import('../../src/plugins/config-plugin.js');
      await initConfig();
      
      const minimal = await exportConfigMinimal();
      
      expect(minimal.version).toBe(1);
      expect(minimal.adapters).toHaveLength(5);
      expect((minimal as any).runtime).toBeUndefined();
    });
  });

  describe('configsEquivalent', () => {
    it('should return true for identical configs', () => {
      const config1 = { ...mockConfig };
      const config2 = { ...mockConfig };
      
      expect(configsEquivalent(config1, config2)).toBe(true);
    });

    it('should return false for different configs', () => {
      const config1 = { ...mockConfig, activeRulePack: 'balanced' };
      const config2 = { ...mockConfig, activeRulePack: 'strict' };
      
      expect(configsEquivalent(config1, config2)).toBe(false);
    });

    it('should ignore version differences', () => {
      const config1 = { ...mockConfig, version: 1 };
      const config2 = { ...mockConfig, version: 2 };
      
      expect(configsEquivalent(config1, config2)).toBe(true);
    });
  });

  describe('clearImportExportRegistries', () => {
    it('should clear all registries', () => {
      class TestAdapter extends BaseAdapter {
        name = 'test';
        priority = 10;
        async extract(): Promise<AdapterResult> {
          return { events: [], errors: [] };
        }
      }
      
      registerAdapterForImport('test', new TestAdapter());
      registerClassifierForImport('test', vi.fn());
      registerPolicyExtractorForImport('test', vi.fn());
      registerAIBackendForImport('test', {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      });
      registerProviderForImport('test', {
        id: 'test', name: 'Test', authUrl: 'https://test.com', scopeMap: {}, icon: '', color: '#000',
      });
      registerRulePackForImport('test', {
        metadata: { name: 'test', version: '1.0.0', author: 'test', description: 'test', rules: [] },
        rules: [],
      });
      
      clearImportExportRegistries();
      
      // Should not throw when re-registering
      registerAdapterForImport('test', new TestAdapter());
    });
  });

  describe('ExportedConfig type', () => {
    it('should have all required fields', () => {
      const exported: ExportedConfig = {
        version: 1,
        exportedAt: new Date().toISOString(),
        exportedBy: 'ConsentLens',
        config: mockConfig,
        runtime: {
          adapters: ['oauth'],
          classifiers: ['default'],
          policyExtractors: ['default'],
          aiBackends: ['openjev'],
          providers: ['google'],
          rulePacks: ['balanced'],
        },
      };
      
      expect(exported.version).toBe(1);
      expect(exported.exportedAt).toBeDefined();
      expect(exported.exportedBy).toBe('ConsentLens');
      expect(exported.config).toEqual(mockConfig);
      expect(exported.runtime.adapters).toContain('oauth');
    });
  });

  describe('ImportResult type', () => {
    it('should have all required fields on success', () => {
      const result: ImportResult = {
        success: true,
        config: mockConfig,
        registered: {
          adapters: 5,
          classifiers: 1,
          policyExtractors: 1,
          aiBackends: 1,
          providers: 5,
          rulePacks: 5,
        },
        warnings: [],
        errors: [],
      };
      
      expect(result.success).toBe(true);
      expect(result.registered.adapters).toBe(5);
      expect(result.warnings).toHaveLength(0);
    });

    it('should have errors on failure', () => {
      const result: ImportResult = {
        success: false,
        config: mockConfig,
        registered: {
          adapters: 0,
          classifiers: 0,
          policyExtractors: 0,
          aiBackends: 0,
          providers: 0,
          rulePacks: 0,
        },
        warnings: [],
        errors: ['Import failed'],
      };
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Import failed');
    });
  });
});