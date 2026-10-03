/**
 * Rule Parser Tests - Comprehensive tests for all ENGINE-01/03/04/05 syntax variants
 */

import { describe, it, expect } from 'vitest';
import { parseRule, parseRules } from '../../src/engine/rule-parser.js';
import type { ParsedRule } from '../../src/engine/types.js';

describe('Rule Parser - Basic Rules', () => {
  it('should parse basic rule: capability@domain = action', () => {
    const rule = parseRule('oauth.google@drive.google.com = deny');
    
    expect(rule.capabilityPattern).toBe('oauth.google');
    expect(rule.domainPattern).toBe('drive.google.com');
    expect(rule.action).toBe('deny');
    expect(rule.isException).toBe(false);
    expect(rule.raw).toBe('oauth.google@drive.google.com = deny');
  });
  
  it('should parse rule with allow action', () => {
    const rule = parseRule('cookie.analytics@example.com = allow');
    
    expect(rule.action).toBe('allow');
  });
  
  it('should parse rule with ask action', () => {
    const rule = parseRule('browser-permission.geolocation@example.com = ask');
    
    expect(rule.action).toBe('ask');
  });
  
  it('should handle extra whitespace', () => {
    const rule = parseRule('  oauth.google  @  drive.google.com  =  deny  ');
    
    expect(rule.capabilityPattern).toBe('oauth.google');
    expect(rule.domainPattern).toBe('drive.google.com');
    expect(rule.action).toBe('deny');
  });
});

describe('Rule Parser - Exception Rules', () => {
  it('should parse exception rule: @@capability@domain', () => {
    const rule = parseRule('@@oauth.google@drive.google.com');
    
    expect(rule.isException).toBe(true);
    expect(rule.action).toBe('allow'); // Implied allow for exceptions
    expect(rule.capabilityPattern).toBe('oauth.google');
    expect(rule.domainPattern).toBe('drive.google.com');
  });
  
  it('should parse exception with whitespace', () => {
    const rule = parseRule('  @@  cookie.analytics@example.com  ');
    
    expect(rule.isException).toBe(true);
    expect(rule.action).toBe('allow');
  });
});

describe('Rule Parser - Domain Patterns', () => {
  it('should parse exact domain', () => {
    const rule = parseRule('oauth.google@drive.google.com = deny');
    
    expect(rule.domainPattern).toBe('drive.google.com');
  });
  
  it('should parse suffix domain (example.com matches sub.example.com)', () => {
    const rule = parseRule('oauth.google@google.com = deny');
    
    expect(rule.domainPattern).toBe('google.com');
  });
  
  it('should parse wildcard domain: *.example.com', () => {
    const rule = parseRule('oauth.google@*.google.com = deny');
    
    expect(rule.domainPattern).toBe('*.google.com');
  });
  
  it('should parse regex domain: /pattern/flags', () => {
    const rule = parseRule('oauth.google@/drive\\.google\\.com/i = deny');
    
    expect(rule.domainPattern).toBe('/drive\\.google\\.com/i');
  });
  
  it('should parse regex domain with flags', () => {
    const rule = parseRule('oauth.google@/google\\.com$/i = deny');
    
    expect(rule.domainPattern).toBe('/google\\.com$/i');
  });
});

describe('Rule Parser - Capability Patterns', () => {
  it('should parse exact oauth capability', () => {
    const rule = parseRule('oauth.google@drive.google.com = deny');
    
    expect(rule.capabilityPattern).toBe('oauth.google');
  });
  
  it('should parse category wildcard: cookie.*', () => {
    const rule = parseRule('cookie.*@example.com = deny');
    
    expect(rule.capabilityPattern).toBe('cookie.*');
  });
  
  it('should parse provider wildcard: oauth.google.*', () => {
    const rule = parseRule('oauth.google.*@drive.google.com = deny');
    
    expect(rule.capabilityPattern).toBe('oauth.google.*');
  });
  
  it('should parse browser-permission capability', () => {
    const rule = parseRule('browser-permission.geolocation@example.com = ask');
    
    expect(rule.capabilityPattern).toBe('browser-permission.geolocation');
  });
  
  it('should parse policy capability', () => {
    const rule = parseRule('policy.data-collection@example.com = deny');
    
    expect(rule.capabilityPattern).toBe('policy.data-collection');
  });
  
  it('should parse terms capability', () => {
    const rule = parseRule('terms.arbitration@example.com = ask');
    
    expect(rule.capabilityPattern).toBe('terms.arbitration');
  });
  
  it('should parse full wildcard capability', () => {
    const rule = parseRule('*@example.com = deny');
    
    expect(rule.capabilityPattern).toBe('*');
  });
});

describe('Rule Parser - Comments', () => {
  it('should skip lines starting with !', () => {
    const rules = parseRules(`
! This is a comment
oauth.google@drive.google.com = deny
`);
    
    expect(rules).toHaveLength(1);
    expect(rules[0].raw).toBe('oauth.google@drive.google.com = deny');
  });
  
  it('should skip lines starting with #', () => {
    const rules = parseRules(`
# This is a comment
oauth.google@drive.google.com = deny
`);
    
    expect(rules).toHaveLength(1);
  });
  
  it('should handle inline comments with #', () => {
    const rule = parseRule('oauth.google@drive.google.com = deny # block google oauth');
    
    expect(rule.raw).toBe('oauth.google@drive.google.com = deny');
    expect(rule.action).toBe('deny');
  });
  
  it('should handle inline comments with whitespace', () => {
    const rule = parseRule('oauth.google@drive.google.com = deny  # comment');
    
    expect(rule.raw).toBe('oauth.google@drive.google.com = deny');
  });
});

describe('Rule Parser - Empty Lines', () => {
  it('should skip empty lines', () => {
    const rules = parseRules(`
oauth.google@drive.google.com = deny

cookie.*@example.com = allow
`);
    
    expect(rules).toHaveLength(2);
  });
  
  it('should skip whitespace-only lines', () => {
    const rules = parseRules(`
oauth.google@drive.google.com = deny
   
cookie.*@example.com = allow
`);
    
    expect(rules).toHaveLength(2);
  });
});

describe('Rule Parser - Multi-line parseRules', () => {
  it('should parse multiple rules', () => {
    const text = `
! Comment line
oauth.google@drive.google.com = deny
cookie.*@example.com = allow
@@oauth.github@github.com
browser-permission.geolocation@maps.google.com = ask
`;
    
    const rules = parseRules(text);
    
    expect(rules).toHaveLength(4);
    expect(rules[0].raw).toBe('oauth.google@drive.google.com = deny');
    expect(rules[1].raw).toBe('cookie.*@example.com = allow');
    expect(rules[2].raw).toBe('@@oauth.github@github.com');
    expect(rules[3].raw).toBe('browser-permission.geolocation@maps.google.com = ask');
  });
});

describe('Rule Parser - Error Handling', () => {
  it('should throw on missing = separator', () => {
    expect(() => parseRule('oauth.google@drive.google.com')).toThrow('missing \'=\' separator');
  });
  
  it('should throw on missing @ separator', () => {
    expect(() => parseRule('oauth.google = deny')).toThrow('missing \'@\' separator');
  });
  
  it('should throw on empty capability pattern', () => {
    expect(() => parseRule('@drive.google.com = deny')).toThrow('empty capability pattern');
  });
  
  it('should throw on empty domain pattern', () => {
    expect(() => parseRule('oauth.google@ = deny')).toThrow('empty domain pattern');
  });
  
  it('should throw on invalid action', () => {
    expect(() => parseRule('oauth.google@drive.google.com = invalid')).toThrow('invalid action');
  });
  
  it('should throw on unknown capability type', () => {
    expect(() => parseRule('unknown.type@drive.google.com = deny')).toThrow('unknown capability type');
  });
  
  it('should throw on wildcard not at end', () => {
    expect(() => parseRule('oauth.*.google@drive.google.com = deny')).toThrow('wildcard * must be at the end');
  });
  
  it('should throw on invalid regex pattern', () => {
    expect(() => parseRule('oauth.google@/[invalid/i = deny')).toThrow('invalid regex');
  });
  
  it('should throw on invalid regex flag', () => {
    expect(() => parseRule('oauth.google@/pattern/x = deny')).toThrow('invalid regex');
  });
  
  it('should throw on domain pattern without dot', () => {
    expect(() => parseRule('oauth.google@localhost = deny')).toThrow('domain pattern should contain a dot');
  });
  
  it('should include line number in multi-line parse error', () => {
    const text = `
oauth.google@drive.google.com = deny
invalid rule
cookie.*@example.com = allow
`;
    
    expect(() => parseRules(text)).toThrow('Line 3:');
  });
});

describe('Rule Parser - Edge Cases', () => {
  it('should handle regex with = in pattern', () => {
    const rule = parseRule('oauth.google@/pattern=with=equals/i = deny');
    
    expect(rule.domainPattern).toBe('/pattern=with=equals/i');
    expect(rule.action).toBe('deny');
  });
  
  it('should handle complex capability pattern', () => {
    const rule = parseRule('oauth.google.drive@drive.google.com = deny');
    
    expect(rule.capabilityPattern).toBe('oauth.google.drive');
  });
  
  it('should generate unique IDs for different rules', () => {
    const rule1 = parseRule('oauth.google@drive.google.com = deny');
    const rule2 = parseRule('oauth.google@drive.google.com = allow');
    
    expect(rule1.id).not.toBe(rule2.id);
  });
  
  it('should generate same ID for identical rules', () => {
    const rule1 = parseRule('oauth.google@drive.google.com = deny');
    const rule2 = parseRule('oauth.google@drive.google.com = deny');
    
    expect(rule1.id).toBe(rule2.id);
  });
  
  it('should default precedenceLayer to user', () => {
    const rule = parseRule('oauth.google@drive.google.com = deny');
    
    expect(rule.precedenceLayer).toBe('user');
  });
});