/**
 * Rule Pack JSON Schema - per PLUGIN-05
 * Defines the standardized format for community rule packs
 */

import { z } from 'zod';

/**
 * Capability pattern for rule matching
 * Supports wildcards and structured matching
 */
export interface CapabilityPattern {
  type?: string;           // 'oauth', 'cookie', 'browser-permission', 'policy', 'terms', or '*' for all
  provider?: string;       // For OAuth: 'google', 'github', etc. or '*'
  scope?: string;          // For OAuth: specific scope or '*'
  permission?: string;     // For browser permissions: 'geolocation', 'camera', etc. or '*'
  category?: string;       // For cookies: 'essential', 'analytics', 'advertising', etc. or '*'
  practice?: string;       // For policies: practice type or '*'
  clause?: string;         // For terms: clause type or '*'
  custom?: Record<string, string | string[]>; // Additional custom pattern fields
}

/**
 * Domain pattern for rule matching
 */
export interface DomainPattern {
  domains?: string[];      // Exact domain matches (e.g., 'google.com')
  domainSuffixes?: string[]; // Suffix matches (e.g., '.google.com' matches 'analytics.google.com')
  domainPatterns?: string[]; // Regex patterns for domain matching
  excludeDomains?: string[];  // Domains to exclude
  excludePatterns?: string[]; // Regex patterns to exclude
}

/**
 * Rule action
 */
export type RuleAction = 'allow' | 'ask' | 'deny';

/**
 * Rule layer for precedence
 */
export type RuleLayer = 'user' | 'trusted' | 'community' | 'default';

/**
 * Single rule definition
 */
export interface Rule {
  /** Unique rule ID */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Capability pattern to match */
  capability: CapabilityPattern;
  /** Domain pattern to match */
  domain: DomainPattern;
  /** Action to take */
  action: RuleAction;
  /** Layer for precedence */
  layer: RuleLayer;
  /** Time-to-live in seconds (optional, for temporary rules) */
  ttl?: number;
  /** Optional comment/description */
  comment?: string;
  /** Rule metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Rule pack metadata
 */
export interface RulePackMetadata {
  /** Pack name */
  name: string;
  /** Semantic version */
  version: string;
  /** Author/organization */
  author: string;
  /** Description */
  description: string;
  /** Optional dependencies on other packs */
  dependencies?: string[];
  /** Minimum engine version required */
  minEngineVersion?: string;
  /** Tags for categorization */
  tags?: string[];
  /** License */
  license?: string;
  /** Homepage URL */
  homepage?: string;
  /** Repository URL */
  repository?: string;
}

/**
 * Complete rule pack structure
 */
export interface RulePack {
  metadata: RulePackMetadata;
  rules: Rule[];
}

/**
 * Zod schema for CapabilityPattern
 */
export const CapabilityPatternSchema = z.object({
  type: z.string().optional() as any,
  provider: z.string().optional() as any,
  scope: z.string().optional() as any,
  permission: z.string().optional() as any,
  category: z.string().optional() as any,
  practice: z.string().optional() as any,
  clause: z.string().optional() as any,
  custom: z.optional(z.record(z.union([z.string(), z.array(z.string())]))) as any,
});

/**
 * Zod schema for DomainPattern
 */
export const DomainPatternSchema = z.object({
  domains: z.array(z.string()).optional(),
  domainSuffixes: z.array(z.string()).optional(),
  domainPatterns: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
});

/**
 * Zod schema for Rule
 */
export const RuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  capability: CapabilityPatternSchema,
  domain: DomainPatternSchema,
  action: z.enum(['allow', 'ask', 'deny']),
  layer: z.enum(['user', 'trusted', 'community', 'default']),
  ttl: z.optional(z.number().int().positive()) as any,
  comment: z.optional(z.string()) as any,
  metadata: z.optional(z.record(z.unknown())) as any,
});

/**
 * Zod schema for RulePackMetadata
 */
export const RulePackMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/), // SemVer
  author: z.string().min(1),
  description: z.string().min(1),
  dependencies: z.array(z.string()).optional(),
  minEngineVersion: z.string().optional(),
  tags: z.array(z.string()).optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
});

/**
 * Zod schema for RulePack
 */
export const RulePackSchema = z.object({
  metadata: RulePackMetadataSchema,
  rules: z.array(RuleSchema).min(1),
});

/**
 * Type inferred from RulePackSchema
 */
export type RulePackValidated = z.infer<typeof RulePackSchema>;

/**
 * Validates a rule pack against the JSON schema
 * Returns validated rule pack or throws with detailed errors
 */
export function validateRulePack(data: unknown): RulePackValidated {
  return RulePackSchema.parse(data);
}

/**
 * Validates a rule pack safely (returns result object)
 */
export function safeValidateRulePack(data: unknown): 
  | { success: true; data: RulePackValidated }
  | { success: false; error: z.ZodError } {
  const result = RulePackSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Creates a minimal rule pack
 */
export function createRulePack(params: {
  name: string;
  version: string;
  author: string;
  description: string;
  rules: Rule[];
  dependencies?: string[];
  minEngineVersion?: string;
  tags?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
}): RulePack {
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
      repository: params.repository,
    },
    rules: params.rules,
  };
}

/**
 * Built-in rule packs
 */
export const BUILTIN_RULE_PACKS: Record<string, RulePack> = {
  balanced: createRulePack({
    name: 'balanced',
    version: '1.0.0',
    author: 'ConsentLens',
    description: 'Balanced privacy protection - allows essential, asks for analytics/ads, denies tracking',
    rules: [
      {
        id: 'allow-essential-cookies',
        name: 'Allow Essential Cookies',
        capability: { type: 'cookie', category: 'essential' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'allow-functional-cookies',
        name: 'Allow Functional Cookies',
        capability: { type: 'cookie', category: 'functional' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'allow-security-cookies',
        name: 'Allow Security Cookies',
        capability: { type: 'cookie', category: 'security' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'ask-analytics-cookies',
        name: 'Ask for Analytics Cookies',
        capability: { type: 'cookie', category: 'analytics' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'ask-personalization-cookies',
        name: 'Ask for Personalization Cookies',
        capability: { type: 'cookie', category: 'personalization' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'deny-advertising-cookies',
        name: 'Deny Advertising Cookies',
        capability: { type: 'cookie', category: 'advertising' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'deny-unknown-cookies',
        name: 'Deny Unknown Cookies',
        capability: { type: 'cookie', category: 'unknown' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'allow-oauth-core',
        name: 'Allow Core OAuth Providers',
        capability: { type: 'oauth', provider: '*' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'ask-browser-permissions',
        name: 'Ask for Browser Permissions',
        capability: { type: 'browser-permission', permission: '*' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'ask-policy-data-sharing',
        name: 'Ask for Data Sharing Practices',
        capability: { type: 'policy', practice: 'data-sharing' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'deny-policy-data-selling',
        name: 'Deny Data Selling',
        capability: { type: 'policy', practice: 'data-selling' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'ask-policy-ai-training',
        name: 'Ask for AI Training',
        capability: { type: 'policy', practice: 'ai-training' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'deny-terms-arbitration',
        name: 'Deny Mandatory Arbitration',
        capability: { type: 'terms', clause: 'arbitration' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'deny-terms-content-license',
        name: 'Deny Broad Content Licensing',
        capability: { type: 'terms', clause: 'content-licensing' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
    ],
  }),
  
  strict: createRulePack({
    name: 'strict',
    version: '1.0.0',
    author: 'ConsentLens',
    description: 'Strict privacy protection - denies all non-essential by default',
    rules: [
      {
        id: 'allow-essential-only',
        name: 'Allow Only Essential',
        capability: { type: 'cookie', category: 'essential' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'allow-security-only',
        name: 'Allow Security Cookies',
        capability: { type: 'cookie', category: 'security' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'deny-all-other-cookies',
        name: 'Deny All Other Cookies',
        capability: { type: 'cookie' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'ask-all-oauth',
        name: 'Ask for All OAuth',
        capability: { type: 'oauth' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'ask-all-permissions',
        name: 'Ask for All Browser Permissions',
        capability: { type: 'browser-permission' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'deny-data-sharing',
        name: 'Deny Data Sharing',
        capability: { type: 'policy', practice: 'data-sharing' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'deny-ai-training',
        name: 'Deny AI Training',
        capability: { type: 'policy', practice: 'ai-training' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'deny-all-terms-high',
        name: 'Deny High Severity Terms',
        capability: { type: 'terms' },
        domain: {},
        action: 'deny',
        layer: 'default',
        metadata: { severityFilter: 'high' },
      },
    ],
  }),
  
  essential: createRulePack({
    name: 'essential',
    version: '1.0.0',
    author: 'ConsentLens',
    description: 'Minimal protection - only blocks known malicious patterns',
    rules: [
      {
        id: 'allow-all-cookies',
        name: 'Allow All Cookies',
        capability: { type: 'cookie' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'allow-all-oauth',
        name: 'Allow All OAuth',
        capability: { type: 'oauth' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'ask-permissions',
        name: 'Ask for Browser Permissions',
        capability: { type: 'browser-permission' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'deny-data-selling',
        name: 'Deny Data Selling',
        capability: { type: 'policy', practice: 'data-selling' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
    ],
  }),
  
  'no-ai-training': createRulePack({
    name: 'no-ai-training',
    version: '1.0.0',
    author: 'ConsentLens',
    description: 'Blocks AI training data collection while allowing other functionality',
    rules: [
      {
        id: 'allow-most-cookies',
        name: 'Allow Most Cookies',
        capability: { type: 'cookie', category: '*' },
        domain: {},
        action: 'allow',
        layer: 'default',
        metadata: { excludeCategories: ['advertising'] },
      },
      {
        id: 'deny-advertising-cookies',
        name: 'Deny Advertising Cookies',
        capability: { type: 'cookie', category: 'advertising' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'allow-oauth',
        name: 'Allow OAuth',
        capability: { type: 'oauth' },
        domain: {},
        action: 'allow',
        layer: 'default',
      },
      {
        id: 'ask-permissions',
        name: 'Ask for Browser Permissions',
        capability: { type: 'browser-permission' },
        domain: {},
        action: 'ask',
        layer: 'default',
      },
      {
        id: 'deny-ai-training-policy',
        name: 'Deny AI Training in Policies',
        capability: { type: 'policy', practice: 'ai-training' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'deny-ai-training-terms',
        name: 'Deny AI Training in Terms',
        capability: { type: 'terms', clause: 'ai-training' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
    ],
  }),
  
  paranoid: createRulePack({
    name: 'paranoid',
    version: '1.0.0',
    author: 'ConsentLens',
    description: 'Maximum privacy - denies everything except explicitly allowed',
    rules: [
      {
        id: 'deny-all-by-default',
        name: 'Deny All by Default',
        capability: {},
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'allow-session-cookies',
        name: 'Allow Session Cookies Only',
        capability: { type: 'cookie', category: 'essential' },
        domain: {},
        action: 'allow',
        layer: 'user',
      },
      {
        id: 'ask-oauth-trusted',
        name: 'Ask for Trusted OAuth Only',
        capability: { type: 'oauth', provider: 'google' },
        domain: {},
        action: 'ask',
        layer: 'user',
      },
      {
        id: 'ask-oauth-trusted-github',
        name: 'Ask for Trusted OAuth Only (GitHub)',
        capability: { type: 'oauth', provider: 'github' },
        domain: {},
        action: 'ask',
        layer: 'user',
      },
      {
        id: 'ask-oauth-trusted-microsoft',
        name: 'Ask for Trusted OAuth Only (Microsoft)',
        capability: { type: 'oauth', provider: 'microsoft' },
        domain: {},
        action: 'ask',
        layer: 'user',
      },
      {
        id: 'deny-all-other-oauth',
        name: 'Deny Other OAuth',
        capability: { type: 'oauth' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'ask-permissions-minimal',
        name: 'Ask for Minimal Permissions',
        capability: { type: 'browser-permission', permission: 'notifications' },
        domain: {},
        action: 'ask',
        layer: 'user',
      },
      {
        id: 'deny-all-policy',
        name: 'Deny All Policy Practices',
        capability: { type: 'policy' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
      {
        id: 'deny-all-terms',
        name: 'Deny All Terms Clauses',
        capability: { type: 'terms' },
        domain: {},
        action: 'deny',
        layer: 'default',
      },
    ],
  }),
};