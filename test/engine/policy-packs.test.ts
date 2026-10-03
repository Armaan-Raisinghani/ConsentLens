/**
 * Policy Packs Tests - Tests for 5 built-in policy packs and rule set creation
 */

import { describe, it, expect } from 'vitest';
import {
  BUILTIN_PACKS,
  getPack,
  getAllPacks,
  createRuleSetsFromPacks,
  createFullRuleSets,
} from '../../src/engine/policy-packs.js';
import { parseRule } from '../../src/engine/rule-parser.js';
import type { RuleSet } from '../../src/engine/types.js';

describe('Policy Packs - Built-in Packs', () => {
  it('should have exactly 5 built-in packs', () => {
    expect(BUILTIN_PACKS).toHaveLength(5);
  });

  it('should have correct pack IDs', () => {
    const ids = BUILTIN_PACKS.map(p => p.id).sort();
    expect(ids).toEqual(['balanced', 'essential', 'no-ai-training', 'paranoid', 'strict']);
  });

  it('should have required fields for each pack', () => {
    for (const pack of BUILTIN_PACKS) {
      expect(pack.id).toBeTypeOf('string');
      expect(pack.name).toBeTypeOf('string');
      expect(pack.description).toBeTypeOf('string');
      expect(pack.version).toBeTypeOf('string');
      expect(Array.isArray(pack.rules)).toBe(true);
      expect(pack.layer).toMatch(/^(trusted|defaults)$/);
      expect(pack.rules.length).toBeGreaterThan(0);
    }
  });

  describe('Balanced pack', () => {
    const pack = BUILTIN_PACKS.find(p => p.id === 'balanced')!;

    it('should have correct layer', () => {
      expect(pack.layer).toBe('defaults');
    });

    it('should allow essential cookies', () => {
      const rule = pack.rules.find(r => r.includes('cookie.essential@* = allow'));
      expect(rule).toBeDefined();
    });

    it('should ask for analytics cookies', () => {
      const rule = pack.rules.find(r => r.includes('cookie.analytics@* = ask'));
      expect(rule).toBeDefined();
    });

    it('should deny advertising cookies', () => {
      const rule = pack.rules.find(r => r.includes('cookie.advertising@* = deny'));
      expect(rule).toBeDefined();
    });

    it('should ask for OAuth', () => {
      const rule = pack.rules.find(r => r.includes('oauth.*@* = ask'));
      expect(rule).toBeDefined();
    });

    it('should ask for browser permissions', () => {
      const rule = pack.rules.find(r => r.includes('browser-permission.*@* = ask'));
      expect(rule).toBeDefined();
    });

    it('should ask for policy and terms', () => {
      expect(pack.rules.some(r => r.includes('policy.*@* = ask'))).toBe(true);
      expect(pack.rules.some(r => r.includes('terms.*@* = ask'))).toBe(true);
    });
  });

  describe('Strict pack', () => {
    const pack = BUILTIN_PACKS.find(p => p.id === 'strict')!;

    it('should have correct layer', () => {
      expect(pack.layer).toBe('defaults');
    });

    it('should deny all cookies except essential', () => {
      expect(pack.rules.some(r => r.includes('cookie.*@* = deny'))).toBe(true);
      expect(pack.rules.some(r => r.includes('cookie.essential@* = allow'))).toBe(true);
    });

    it('should deny all OAuth', () => {
      expect(pack.rules.some(r => r.includes('oauth.*@* = deny'))).toBe(true);
    });

    it('should deny sensitive browser permissions', () => {
      expect(pack.rules.some(r => r.includes('browser-permission.location@* = deny'))).toBe(true);
      expect(pack.rules.some(r => r.includes('browser-permission.camera@* = deny'))).toBe(true);
      expect(pack.rules.some(r => r.includes('browser-permission.microphone@* = deny'))).toBe(true);
    });

    it('should ask for other browser permissions', () => {
      expect(pack.rules.some(r => r.includes('browser-permission.*@* = ask'))).toBe(true);
    });

    it('should deny AI training', () => {
      expect(pack.rules.some(r => r.includes('policy.ai-training@* = deny'))).toBe(true);
    });
  });

  describe('Essential pack', () => {
    const pack = BUILTIN_PACKS.find(p => p.id === 'essential')!;

    it('should have correct layer', () => {
      expect(pack.layer).toBe('defaults');
    });

    it('should allow only essential cookies', () => {
      expect(pack.rules.some(r => r.includes('cookie.essential@* = allow'))).toBe(true);
    });

    it('should deny everything else', () => {
      expect(pack.rules.some(r => r.includes('*@* = deny'))).toBe(true);
    });
  });

  describe('No AI Training pack', () => {
    const pack = BUILTIN_PACKS.find(p => p.id === 'no-ai-training')!;

    it('should have trusted layer (higher than defaults)', () => {
      expect(pack.layer).toBe('trusted');
    });

    it('should deny AI training policies', () => {
      expect(pack.rules.some(r => r.includes('policy.ai-training@* = deny'))).toBe(true);
    });

    it('should deny data sharing for AI', () => {
      expect(pack.rules.some(r => r.includes('policy.data-sharing.ai@* = deny'))).toBe(true);
    });

    it('should not have catch-all deny (inherits from Balanced)', () => {
      expect(pack.rules.some(r => r.includes('*@* = deny'))).toBe(false);
    });
  });

  describe('Paranoid pack', () => {
    const pack = BUILTIN_PACKS.find(p => p.id === 'paranoid')!;

    it('should have correct layer', () => {
      expect(pack.layer).toBe('defaults');
    });

    it('should deny all with no exceptions', () => {
      expect(pack.rules.some(r => r.includes('*@* = deny'))).toBe(true);
      // Should not have any allow rules
      expect(pack.rules.some(r => r.includes('= allow'))).toBe(false);
      expect(pack.rules.some(r => r.includes('= ask'))).toBe(false);
    });
  });
});

describe('Policy Packs - getPack and getAllPacks', () => {
  it('should return pack by ID', () => {
    const pack = getPack('balanced');
    expect(pack).toBeDefined();
    expect(pack!.id).toBe('balanced');
  });

  it('should return undefined for unknown ID', () => {
    const pack = getPack('unknown-pack');
    expect(pack).toBeUndefined();
  });

  it('should return all packs', () => {
    const packs = getAllPacks();
    expect(packs).toHaveLength(5);
    expect(packs).not.toBe(BUILTIN_PACKS); // Should be a copy
  });
});

describe('Policy Packs - createRuleSetsFromPacks', () => {
  it('should create RuleSets with correct layer assignment', () => {
    const ruleSets = createRuleSetsFromPacks(['balanced', 'strict']);

    expect(ruleSets).toHaveLength(1); // Both are defaults layer
    expect(ruleSets[0].layer).toBe('defaults');
    expect(ruleSets[0].rules.length).toBeGreaterThan(0);
  });

  it('should separate trusted and defaults layers', () => {
    const ruleSets = createRuleSetsFromPacks(['no-ai-training', 'balanced']);

    expect(ruleSets).toHaveLength(2);
    expect(ruleSets[0].layer).toBe('trusted');
    expect(ruleSets[1].layer).toBe('defaults');
  });

  it('should parse rules into ParsedRule objects', () => {
    const ruleSets = createRuleSetsFromPacks(['balanced']);

    for (const ruleSet of ruleSets) {
      for (const rule of ruleSet.rules) {
        expect(rule.id).toBeDefined();
        expect(rule.raw).toBeDefined();
        expect(rule.capabilityPattern).toBeDefined();
        expect(rule.domainPattern).toBeDefined();
        expect(['allow', 'ask', 'deny']).toContain(rule.action);
        expect(typeof rule.isException).toBe('boolean');
        expect(rule.precedenceLayer).toBe(ruleSet.layer);
      }
    }
  });

  it('should throw on unknown pack ID', () => {
    expect(() => createRuleSetsFromPacks(['unknown-pack'])).toThrow('Unknown policy pack');
  });

  it('should handle empty pack list', () => {
    const ruleSets = createRuleSetsFromPacks([]);
    expect(ruleSets).toHaveLength(0);
  });

  it('should maintain rule order within pack', () => {
    const ruleSets = createRuleSetsFromPacks(['balanced']);
    const rules = ruleSets[0].rules;

    // First non-comment rule should be cookie.essential@* = allow
    const firstRule = rules.find(r => !r.raw.startsWith('!'));
    expect(firstRule?.raw).toBe('cookie.essential@* = allow');
  });
});

describe('Policy Packs - createFullRuleSets', () => {
  it('should create 4 layers in correct order', () => {
    const ruleSets = createFullRuleSets([], [], [], 'balanced');

    expect(ruleSets).toHaveLength(4);
    expect(ruleSets[0].layer).toBe('user');
    expect(ruleSets[1].layer).toBe('trusted');
    expect(ruleSets[2].layer).toBe('community');
    expect(ruleSets[3].layer).toBe('defaults');
  });

  it('should include user rules in user layer', () => {
    const userRule = parseRule('cookie.analytics@example.com = deny');
    const ruleSets = createFullRuleSets([userRule], [], [], 'balanced');

    expect(ruleSets[0].rules).toHaveLength(1);
    expect(ruleSets[0].rules[0].raw).toBe('cookie.analytics@example.com = deny');
    expect(ruleSets[0].rules[0].precedenceLayer).toBe('user');
  });

  it('should include trusted packs in trusted layer', () => {
    const ruleSets = createFullRuleSets([], ['no-ai-training'], [], 'balanced');

    const trustedRules = ruleSets[1].rules;
    expect(trustedRules.length).toBeGreaterThan(0);
    expect(trustedRules.every(r => r.precedenceLayer === 'trusted')).toBe(true);
    // Should have AI training deny from no-ai-training pack
    expect(trustedRules.some(r => r.capabilityPattern === 'policy.ai-training')).toBe(true);
  });

  it('should include community packs in community layer', () => {
    const ruleSets = createFullRuleSets([], [], ['balanced'], 'strict');

    const communityRules = ruleSets[2].rules;
    expect(communityRules.length).toBeGreaterThan(0);
    expect(communityRules.every(r => r.precedenceLayer === 'community')).toBe(true);
  });

  it('should use specified default pack', () => {
    const ruleSets = createFullRuleSets([], [], [], 'strict');

    const defaultsRules = ruleSets[3].rules;
    expect(defaultsRules.some(r => r.raw.includes('cookie.*@* = deny'))).toBe(true);
    expect(defaultsRules.some(r => r.raw.includes('oauth.*@* = deny'))).toBe(true);
  });

  it('should default to balanced when no default pack specified', () => {
    const ruleSets = createFullRuleSets([], [], [], 'balanced');

    const defaultsRules = ruleSets[3].rules;
    expect(defaultsRules.some(r => r.raw.includes('cookie.essential@* = allow'))).toBe(true);
    expect(defaultsRules.some(r => r.raw.includes('cookie.analytics@* = ask'))).toBe(true);
  });
});

describe('Policy Packs - Rule Syntax Validity', () => {
  it('should have valid syntax for all rules in all packs', () => {
    for (const pack of BUILTIN_PACKS) {
      for (const ruleString of pack.rules) {
        const trimmed = ruleString.trim();
        if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) {
          continue; // Skip comments
        }

        // Should not throw
        const rule = parseRule(ruleString);
        expect(rule).toBeDefined();
        expect(rule.capabilityPattern).toBeDefined();
        expect(rule.domainPattern).toBeDefined();
      }
    }
  });

  it('should have no duplicate rule IDs within a pack', () => {
    for (const pack of BUILTIN_PACKS) {
      const ruleStrings = pack.rules.filter(r => r.trim() && !r.trim().startsWith('!') && !r.trim().startsWith('#'));
      const ids = new Set<string>();
      
      for (const ruleString of ruleStrings) {
        const rule = parseRule(ruleString);
        expect(ids.has(rule.id)).toBe(false);
        ids.add(rule.id);
      }
    }
  });
});