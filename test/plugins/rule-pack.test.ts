/**
 * Rule Pack Tests - per PLUGIN-05
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateRulePack,
  safeValidateRulePack,
  createRulePack,
  RulePack,
  Rule,
  CapabilityPattern,
  DomainPattern,
  RuleAction,
  RuleLayer,
  RulePackMetadata,
  BUILTIN_RULE_PACKS,
  CapabilityPatternSchema,
  DomainPatternSchema,
  RuleSchema,
  RulePackMetadataSchema,
  RulePackSchema,
} from '../../src/plugins/rule-pack.js';

describe('Rule Pack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRulePack', () => {
    it('should validate a correct rule pack', () => {
      const rulePack: RulePack = {
        metadata: {
          name: 'test-pack',
          version: '1.0.0',
          author: 'Test Author',
          description: 'A test rule pack',
        },
        rules: [
          {
            id: 'rule-1',
            name: 'Allow Essential Cookies',
            capability: { type: 'cookie', category: 'essential' },
            domain: {},
            action: 'allow',
            layer: 'default',
          },
        ],
      };
      
      const validated = validateRulePack(rulePack);
      expect(validated.metadata.name).toBe('test-pack');
      expect(validated.rules).toHaveLength(1);
    });

    it('should throw for invalid rule pack', () => {
      const invalidPack = {
        metadata: {
          name: 'test-pack',
          version: '1.0.0',
          author: 'Test Author',
          description: 'A test rule pack',
        },
        rules: [
          {
            id: 'rule-1',
            name: 'Invalid Rule',
            capability: {},
            domain: {},
            action: 'invalid-action',
            layer: 'default',
          },
        ],
      };
      
      expect(() => validateRulePack(invalidPack)).toThrow();
    });
  });

  describe('safeValidateRulePack', () => {
    it('should return success for valid rule pack', () => {
      const rulePack: RulePack = {
        metadata: {
          name: 'test-pack',
          version: '1.0.0',
          author: 'Test Author',
          description: 'A test rule pack',
        },
        rules: [
          {
            id: 'rule-1',
            name: 'Allow Essential Cookies',
            capability: { type: 'cookie', category: 'essential' },
            domain: {},
            action: 'allow',
            layer: 'default',
          },
        ],
      };
      
      const result = safeValidateRulePack(rulePack);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.name).toBe('test-pack');
      }
    });

    it('should return error for invalid rule pack', () => {
      const invalidPack = {
        metadata: {
          name: 'test-pack',
          version: 'invalid-version',
          author: 'Test Author',
          description: 'A test rule pack',
        },
        rules: [],
      };
      
      const result = safeValidateRulePack(invalidPack);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('createRulePack', () => {
    it('should create a minimal rule pack', () => {
      const rulePack = createRulePack({
        name: 'minimal',
        version: '1.0.0',
        author: 'Test',
        description: 'Minimal pack',
        rules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            capability: { type: 'cookie', category: 'essential' },
            domain: {},
            action: 'allow',
            layer: 'default',
          },
        ],
      });
      
      expect(rulePack.metadata.name).toBe('minimal');
      expect(rulePack.metadata.version).toBe('1.0.0');
      expect(rulePack.rules).toHaveLength(1);
    });

    it('should include optional metadata fields', () => {
      const rulePack = createRulePack({
        name: 'with-metadata',
        version: '2.0.0',
        author: 'Test',
        description: 'Pack with metadata',
        rules: [],
        dependencies: ['base-pack'],
        minEngineVersion: '1.0.0',
        tags: ['privacy', 'strict'],
        license: 'MIT',
        homepage: 'https://example.com',
        repository: 'https://github.com/example/repo',
      });
      
      expect(rulePack.metadata.dependencies).toEqual(['base-pack']);
      expect(rulePack.metadata.minEngineVersion).toBe('1.0.0');
      expect(rulePack.metadata.tags).toEqual(['privacy', 'strict']);
      expect(rulePack.metadata.license).toBe('MIT');
      expect(rulePack.metadata.homepage).toBe('https://example.com');
      expect(rulePack.metadata.repository).toBe('https://github.com/example/repo');
    });
  });

  describe('CapabilityPattern', () => {
    it('should allow all optional fields', () => {
      const pattern: CapabilityPattern = {
        type: 'oauth',
        provider: 'google',
        scope: 'drive.read',
        permission: 'geolocation',
        category: 'analytics',
        practice: 'data-collection',
        clause: 'arbitration',
        custom: { customField: 'value' },
      };
      
      expect(pattern.type).toBe('oauth');
      expect(pattern.provider).toBe('google');
      expect(pattern.scope).toBe('drive.read');
      expect(pattern.custom).toEqual({ customField: 'value' });
    });

    it('should work with minimal fields', () => {
      const pattern: CapabilityPattern = {
        type: 'cookie',
      };
      
      expect(pattern.type).toBe('cookie');
    });
  });

  describe('DomainPattern', () => {
    it('should allow all domain matching fields', () => {
      const pattern: DomainPattern = {
        domains: ['example.com', 'test.com'],
        domainSuffixes: ['.google.com', '.github.com'],
        domainPatterns: ['^.*\\.example\\.com$'],
        excludeDomains: ['exclude.example.com'],
        excludePatterns: ['^internal\\..*$'],
      };
      
      expect(pattern.domains).toHaveLength(2);
      expect(pattern.domainSuffixes).toHaveLength(2);
      expect(pattern.excludeDomains).toContain('exclude.example.com');
    });
  });

  describe('Rule', () => {
    it('should have all required fields', () => {
      const rule: Rule = {
        id: 'rule-1',
        name: 'Test Rule',
        capability: { type: 'oauth', provider: 'google' },
        domain: { domains: ['example.com'] },
        action: 'allow',
        layer: 'user',
        ttl: 3600,
        comment: 'Test comment',
        metadata: { priority: 10 },
      };
      
      expect(rule.id).toBe('rule-1');
      expect(rule.action).toBe('allow');
      expect(rule.layer).toBe('user');
      expect(rule.ttl).toBe(3600);
      expect(rule.comment).toBe('Test comment');
      expect(rule.metadata).toEqual({ priority: 10 });
    });

    it('should allow all action values', () => {
      const actions: RuleAction[] = ['allow', 'ask', 'deny'];
      
      for (const action of actions) {
        const rule: Rule = {
          id: `rule-${action}`,
          name: `Rule ${action}`,
          capability: { type: 'cookie' },
          domain: {},
          action,
          layer: 'default',
        };
        expect(rule.action).toBe(action);
      }
    });

    it('should allow all layer values', () => {
      const layers: RuleLayer[] = ['user', 'trusted', 'community', 'default'];
      
      for (const layer of layers) {
        const rule: Rule = {
          id: `rule-${layer}`,
          name: `Rule ${layer}`,
          capability: { type: 'cookie' },
          domain: {},
          action: 'allow',
          layer,
        };
        expect(rule.layer).toBe(layer);
      }
    });
  });

  describe('RulePackMetadata', () => {
    it('should have all required fields', () => {
      const metadata: RulePackMetadata = {
        name: 'test-pack',
        version: '1.2.3',
        author: 'Author',
        description: 'Description',
      };
      
      expect(metadata.name).toBe('test-pack');
      expect(metadata.version).toBe('1.2.3');
      expect(metadata.author).toBe('Author');
      expect(metadata.description).toBe('Description');
    });

    it('should validate SemVer version', () => {
      const validVersions = ['1.0.0', '2.1.3', '1.0.0-alpha', '1.0.0+build.1', '1.0.0-beta.2+exp.sha.5114f85'];
      
      for (const version of validVersions) {
        const metadata: RulePackMetadata = {
          name: 'test',
          version,
          author: 'Test',
          description: 'Test',
        };
        expect(metadata.version).toBe(version);
      }
    });
  });

  describe('Built-in Rule Packs', () => {
    it('should have all 5 built-in packs', () => {
      expect(BUILTIN_RULE_PACKS.balanced).toBeDefined();
      expect(BUILTIN_RULE_PACKS.strict).toBeDefined();
      expect(BUILTIN_RULE_PACKS.essential).toBeDefined();
      expect(BUILTIN_RULE_PACKS['no-ai-training']).toBeDefined();
      expect(BUILTIN_RULE_PACKS.paranoid).toBeDefined();
    });

    it('should have valid metadata for each pack', () => {
      for (const [name, pack] of Object.entries(BUILTIN_RULE_PACKS)) {
        expect(pack.metadata.name).toBe(name);
        expect(pack.metadata.version).toMatch(/^\d+\.\d+\.\d+/);
        expect(pack.metadata.author).toBe('ConsentLens');
        expect(pack.metadata.description).toBeTruthy();
        expect(pack.rules.length).toBeGreaterThan(0);
      }
    });

    describe('Balanced pack', () => {
      it('should have expected rules', () => {
        const pack = BUILTIN_RULE_PACKS.balanced;
        const ruleIds = pack.rules.map(r => r.id);
        
        expect(ruleIds).toContain('allow-essential-cookies');
        expect(ruleIds).toContain('allow-functional-cookies');
        expect(ruleIds).toContain('deny-advertising-cookies');
        expect(ruleIds).toContain('allow-oauth-core');
        expect(ruleIds).toContain('deny-policy-data-selling');
        expect(ruleIds).toContain('deny-terms-arbitration');
      });

      it('should have allow, ask, and deny actions', () => {
        const pack = BUILTIN_RULE_PACKS.balanced;
        const actions = pack.rules.map(r => r.action);
        
        expect(actions).toContain('allow');
        expect(actions).toContain('ask');
        expect(actions).toContain('deny');
      });
    });

    describe('Strict pack', () => {
      it('should default to deny for most things', () => {
        const pack = BUILTIN_RULE_PACKS.strict;
        const denyRules = pack.rules.filter(r => r.action === 'deny');
        expect(denyRules.length).toBeGreaterThan(pack.rules.filter(r => r.action === 'allow').length);
      });
    });

    describe('Essential pack', () => {
      it('should be permissive', () => {
        const pack = BUILTIN_RULE_PACKS.essential;
        const allowRules = pack.rules.filter(r => r.action === 'allow');
        expect(allowRules.length).toBeGreaterThan(0);
      });
    });

    describe('No-AI-Training pack', () => {
      it('should deny AI training', () => {
        const pack = BUILTIN_RULE_PACKS['no-ai-training'];
        const aiTrainingRules = pack.rules.filter(r => 
          r.capability.practice === 'ai-training' && r.action === 'deny'
        );
        expect(aiTrainingRules.length).toBeGreaterThan(0);
      });
    });

    describe('Paranoid pack', () => {
      it('should deny by default', () => {
        const pack = BUILTIN_RULE_PACKS.paranoid;
        const denyDefault = pack.rules.find(r => 
          Object.keys(r.capability).length === 0 && r.action === 'deny'
        );
        expect(denyDefault).toBeDefined();
      });
    });
  });

  describe('Zod Schemas', () => {
    it('should validate CapabilityPatternSchema', () => {
      const validPattern = { type: 'oauth', provider: 'google' };
      const result = CapabilityPatternSchema.safeParse(validPattern);
      expect(result.success).toBe(true);
    });

    it('should validate DomainPatternSchema', () => {
      const validPattern = { domains: ['example.com'] };
      const result = DomainPatternSchema.safeParse(validPattern);
      expect(result.success).toBe(true);
    });

    it('should validate RuleSchema', () => {
      const validRule = {
        id: 'rule-1',
        name: 'Test Rule',
        capability: { type: 'cookie' },
        domain: {},
        action: 'allow',
        layer: 'default',
      };
      const result = RuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });

    it('should validate RulePackMetadataSchema', () => {
      const validMetadata = {
        name: 'test-pack',
        version: '1.0.0',
        author: 'Test',
        description: 'Test pack',
      };
      const result = RulePackMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should validate RulePackSchema', () => {
      const validPack = {
        metadata: {
          name: 'test-pack',
          version: '1.0.0',
          author: 'Test',
          description: 'Test pack',
        },
        rules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            capability: { type: 'cookie' },
            domain: {},
            action: 'allow',
            layer: 'default',
          },
        ],
      };
      const result = RulePackSchema.safeParse(validPack);
      expect(result.success).toBe(true);
    });
  });
});