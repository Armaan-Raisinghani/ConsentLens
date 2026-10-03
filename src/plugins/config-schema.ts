/**
 * ConsentLens Config Schema - per PLUGIN-07
 * Single unified configuration schema with Zod validation
 */

import { z } from 'zod';
import type { RulePack } from './rule-pack.js';

/**
 * Adapter configuration
 */
export const AdapterConfigSchema = z.object({
  type: z.string().min(1),
  enabled: z.boolean(),
  priority: z.number().int().optional(),
  options: z.record(z.unknown()).optional(),
});

/**
 * Classifier configuration
 */
export const ClassifierConfigSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  options: z.record(z.unknown()).optional(),
});

/**
 * Policy extractor configuration
 */
export const PolicyExtractorConfigSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  options: z.record(z.unknown()).optional(),
});

/**
 * AI backend configuration
 */
export const AIBackendConfigSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  options: z.record(z.unknown()).optional(),
});

/**
 * Provider configuration
 */
export const ProviderConfigSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  options: z.record(z.unknown()).optional(),
});

/**
 * Rule pack configuration
 */
export const RulePackConfigSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  source: z.enum(['builtin', 'local', 'remote']),
  path: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

/**
 * User settings
 */
export const UserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  notifications: z.boolean(),
  autoAnalyze: z.boolean(),
  strictMode: z.boolean(),
  language: z.string(),
  dataRetentionDays: z.number().int().positive(),
  telemetry: z.boolean(),
}).default({
  theme: 'system',
  notifications: true,
  autoAnalyze: true,
  strictMode: false,
  language: 'en',
  dataRetentionDays: 90,
  telemetry: false,
});

/**
 * Complete ConsentLens configuration schema
 */
export const ConsentLensConfigSchema = z.object({
  version: z.number().int().positive(),
  adapters: z.array(AdapterConfigSchema),
  classifiers: z.array(ClassifierConfigSchema),
  policyExtractors: z.array(PolicyExtractorConfigSchema),
  aiBackends: z.array(AIBackendConfigSchema),
  providers: z.array(ProviderConfigSchema),
  rulePacks: z.array(RulePackConfigSchema),
  activeRulePack: z.string(),
  settings: UserSettingsSchema,
}).default({
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
});

/**
 * Type inferred from ConsentLensConfigSchema
 */
export type ConsentLensConfig = z.infer<typeof ConsentLensConfigSchema>;

/**
 * Validates a ConsentLens configuration
 * Returns validated config or throws with detailed errors
 */
export function validateConfig(data: unknown): ConsentLensConfig {
  return ConsentLensConfigSchema.parse(data);
}

/**
 * Validates a ConsentLens configuration safely
 */
export function safeValidateConfig(data: unknown): 
  | { success: true; data: ConsentLensConfig }
  | { success: false; error: z.ZodError } {
  const result = ConsentLensConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Creates a default ConsentLens configuration
 */
export function createDefaultConfig(): ConsentLensConfig {
  return ConsentLensConfigSchema.parse({
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
  });
}

/**
 * Merges a partial config into a base config
 */
export function mergeConfig(base: ConsentLensConfig, partial: Partial<ConsentLensConfig>): ConsentLensConfig {
  const merged = {
    ...base,
    ...partial,
    adapters: partial.adapters ? [...base.adapters, ...partial.adapters] : base.adapters,
    classifiers: partial.classifiers ? [...base.classifiers, ...partial.classifiers] : base.classifiers,
    policyExtractors: partial.policyExtractors ? [...base.policyExtractors, ...partial.policyExtractors] : base.policyExtractors,
    aiBackends: partial.aiBackends ? [...base.aiBackends, ...partial.aiBackends] : base.aiBackends,
    providers: partial.providers ? [...base.providers, ...partial.providers] : base.providers,
    rulePacks: partial.rulePacks ? [...base.rulePacks, ...partial.rulePacks] : base.rulePacks,
    settings: { ...base.settings, ...partial.settings },
  };
  return ConsentLensConfigSchema.parse(merged);
}

/**
 * Migration function for future config versions
 */
export function migrateConfig(data: unknown, fromVersion: number): ConsentLensConfig {
  // For now, just validate at current version
  // In future, add migration logic based on fromVersion
  return validateConfig(data);
}

/**
 * Configuration schema version
 */
export const CONFIG_SCHEMA_VERSION = 1;