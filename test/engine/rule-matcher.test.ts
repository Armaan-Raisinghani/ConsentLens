/**
 * Rule Matcher Tests - Comprehensive tests for ENGINE-03 and ENGINE-04 matching logic
 */

import { describe, it, expect } from 'vitest';
import { matchDomain, matchCapability, extractDomain, matchRule } from '../../src/engine/rule-matcher.js';
import { parseRule } from '../../src/engine/rule-parser.js';
import { createOAuthCapability, createCookieCapability, createBrowserPermissionCapability, createPolicyCapability, createTermsCapability } from '../../src/ir/capability.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthConsentEvent } from '../../src/ir/consent-event.js';
import { EvidenceSource, ExtractionMethod } from '../../src/shared/types.js';

describe('Rule Matcher - extractDomain', () => {
  it('should extract domain from full URL', () => {
    expect(extractDomain('https://drive.google.com/path')).toBe('drive.google.com');
    expect(extractDomain('http://example.com')).toBe('example.com');
    expect(extractDomain('https://sub.domain.example.com:8080/path')).toBe('sub.domain.example.com');
  });
  
  it('should return input if not a valid URL', () => {
    expect(extractDomain('drive.google.com')).toBe('drive.google.com');
    expect(extractDomain('localhost')).toBe('localhost');
  });
});

describe('Rule Matcher - Domain Matching (ENGINE-03)', () => {
  describe('Exact match', () => {
    it('should match exact domain', () => {
      expect(matchDomain('drive.google.com', 'https://drive.google.com')).toBe(true);
      expect(matchDomain('example.com', 'https://example.com')).toBe(true);
    });
    
    it('should be case-insensitive', () => {
      expect(matchDomain('DRIVE.GOOGLE.COM', 'https://drive.google.com')).toBe(true);
      expect(matchDomain('drive.google.com', 'https://DRIVE.GOOGLE.COM')).toBe(true);
    });
  });
  
  describe('Suffix match (uBlock semantics)', () => {
    it('should match exact domain', () => {
      expect(matchDomain('google.com', 'https://google.com')).toBe(true);
    });
    
    it('should match subdomain', () => {
      expect(matchDomain('google.com', 'https://drive.google.com')).toBe(true);
      expect(matchDomain('google.com', 'https://mail.google.com')).toBe(true);
      expect(matchDomain('google.com', 'https://a.b.google.com')).toBe(true);
    });
    
    it('should be case-insensitive', () => {
      expect(matchDomain('GOOGLE.COM', 'https://drive.google.com')).toBe(true);
    });
  });
  
  describe('Wildcard match: *.example.com', () => {
    it('should match subdomain', () => {
      expect(matchDomain('*.google.com', 'https://drive.google.com')).toBe(true);
      expect(matchDomain('*.google.com', 'https://mail.google.com')).toBe(true);
      expect(matchDomain('*.google.com', 'https://a.b.google.com')).toBe(true);
    });
    
    it('should NOT match exact domain', () => {
      expect(matchDomain('*.google.com', 'https://google.com')).toBe(false);
    });
    
    it('should NOT match unrelated domain', () => {
      expect(matchDomain('*.google.com', 'https://example.com')).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(matchDomain('*.GOOGLE.COM', 'https://drive.google.com')).toBe(true);
    });
  });
  
  describe('Exact match via full domain (no subdomain)', () => {
    it('should match exact domain when no subdomain exists', () => {
      expect(matchDomain('drive.google.com', 'https://drive.google.com')).toBe(true);
    });
    
    it('should also match subdomain per uBlock suffix semantics', () => {
      // In uBlock, example.com matches sub.example.com too
      expect(matchDomain('drive.google.com', 'https://sub.drive.google.com')).toBe(true);
    });
  });
  
  describe('Regex match: /pattern/flags', () => {
    it('should match simple regex', () => {
      expect(matchDomain('/google\\.com$/i', 'https://drive.google.com')).toBe(true);
      expect(matchDomain('/google\\.com$/i', 'https://google.com')).toBe(true);
    });
    
    it('should not match non-matching regex', () => {
      expect(matchDomain('/google\\.com$/i', 'https://example.com')).toBe(false);
    });
    
    it('should support case-insensitive flag', () => {
      expect(matchDomain('/GOOGLE\\.COM$/i', 'https://drive.google.com')).toBe(true);
    });
    
    it('should support multiple flags', () => {
      expect(matchDomain('/drive\\.google\\.com/gi', 'https://DRIVE.GOOGLE.COM')).toBe(true);
    });
    
    it('should handle complex regex', () => {
      expect(matchDomain('/^(drive|mail)\\.google\\.com$/i', 'https://drive.google.com')).toBe(true);
      expect(matchDomain('/^(drive|mail)\\.google\\.com$/i', 'https://mail.google.com')).toBe(true);
      expect(matchDomain('/^(drive|mail)\\.google\\.com$/i', 'https://calendar.google.com')).toBe(false);
    });
  });
});

describe('Rule Matcher - Capability Matching (ENGINE-04)', () => {
  describe('Full wildcard: *', () => {
    it('should match any capability', () => {
      expect(matchCapability('*', createOAuthCapability('google', ['profile']))).toBe(true);
      expect(matchCapability('*', createCookieCapability('analytics'))).toBe(true);
      expect(matchCapability('*', createBrowserPermissionCapability('geolocation'))).toBe(true);
      expect(matchCapability('*', createPolicyCapability('data-collection'))).toBe(true);
      expect(matchCapability('*', createTermsCapability('arbitration'))).toBe(true);
    });
  });
  
  describe('Category wildcard: type.*', () => {
    it('should match any oauth capability', () => {
      expect(matchCapability('oauth.*', createOAuthCapability('google', ['profile']))).toBe(true);
      expect(matchCapability('oauth.*', createOAuthCapability('github', ['repo']))).toBe(true);
      expect(matchCapability('oauth.*', createCookieCapability('analytics'))).toBe(false);
    });
    
    it('should match any cookie capability', () => {
      expect(matchCapability('cookie.*', createCookieCapability('analytics'))).toBe(true);
      expect(matchCapability('cookie.*', createCookieCapability('marketing'))).toBe(true);
      expect(matchCapability('cookie.*', createOAuthCapability('google', ['profile']))).toBe(false);
    });
    
    it('should match any browser-permission capability', () => {
      expect(matchCapability('browser-permission.*', createBrowserPermissionCapability('geolocation'))).toBe(true);
      expect(matchCapability('browser-permission.*', createBrowserPermissionCapability('notifications'))).toBe(true);
    });
    
    it('should match any policy capability', () => {
      expect(matchCapability('policy.*', createPolicyCapability('data-collection'))).toBe(true);
    });
    
    it('should match any terms capability', () => {
      expect(matchCapability('terms.*', createTermsCapability('arbitration'))).toBe(true);
    });
  });
  
  describe('Provider wildcard: type.provider.*', () => {
    it('should match any google oauth capability', () => {
      expect(matchCapability('oauth.google.*', createOAuthCapability('google', ['profile']))).toBe(true);
      expect(matchCapability('oauth.google.*', createOAuthCapability('google', ['drive.readonly']))).toBe(true);
      expect(matchCapability('oauth.google.*', createOAuthCapability('github', ['repo']))).toBe(false);
    });
    
    it('should match any cookie category', () => {
      expect(matchCapability('cookie.analytics.*', createCookieCapability('analytics', '_ga'))).toBe(true);
      expect(matchCapability('cookie.analytics.*', createCookieCapability('analytics', '_gid'))).toBe(true);
      expect(matchCapability('cookie.analytics.*', createCookieCapability('marketing', '_fbp'))).toBe(false);
    });
  });
  
  describe('Exact match: type.provider', () => {
    it('should match exact oauth capability', () => {
      expect(matchCapability('oauth.google', createOAuthCapability('google', ['profile']))).toBe(true);
      expect(matchCapability('oauth.google', createOAuthCapability('github', ['repo']))).toBe(false);
    });
    
    it('should match exact browser-permission capability', () => {
      expect(matchCapability('browser-permission.geolocation', createBrowserPermissionCapability('geolocation'))).toBe(true);
      expect(matchCapability('browser-permission.geolocation', createBrowserPermissionCapability('notifications'))).toBe(false);
    });
    
    it('should match exact cookie capability', () => {
      expect(matchCapability('cookie.analytics', createCookieCapability('analytics'))).toBe(true);
      expect(matchCapability('cookie.analytics', createCookieCapability('marketing'))).toBe(false);
    });
    
    it('should match exact policy capability', () => {
      expect(matchCapability('policy.data-collection', createPolicyCapability('data-collection'))).toBe(true);
    });
    
    it('should match exact terms capability', () => {
      expect(matchCapability('terms.arbitration', createTermsCapability('arbitration'))).toBe(true);
    });
  });
  
  describe('Exact match with scope: type.provider.scope', () => {
    it('should match oauth capability with specific scope', () => {
      const cap = createOAuthCapability('google', ['drive.readonly', 'profile']);
      expect(matchCapability('oauth.google.drive', cap)).toBe(true);
      expect(matchCapability('oauth.google.profile', cap)).toBe(true);
      expect(matchCapability('oauth.google.unknown', cap)).toBe(false);
    });
  });
  
  describe('Exact match with cookie name: type.category.name', () => {
    it('should match cookie capability with specific name', () => {
      const cap = createCookieCapability('analytics', '_ga', 'google.com');
      expect(matchCapability('cookie.analytics._ga', cap)).toBe(true);
      expect(matchCapability('cookie.analytics._gid', cap)).toBe(false);
    });
  });
});

describe('Rule Matcher - Full Rule Matching (matchRule)', () => {
  const createTestEvent = (website: string, capability: any): ConsentEvent => {
    return createOAuthConsentEvent({
      website,
      provider: 'google',
      scope: ['profile'],
      evidence: [{
        source: EvidenceSource.DOM,
        confidence: 0.9,
        extractionMethod: ExtractionMethod.DataAttribute,
        extractedAt: new Date().toISOString(),
      }],
      userAction: 'test',
    });
  };
  
  it('should match exact domain and exact capability', () => {
    const rule = parseRule('oauth.google@drive.google.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
    expect(result.domainMatched).toBe(true);
    expect(result.capabilityMatched).toBe(true);
  });
  
  it('should match suffix domain and exact capability', () => {
    const rule = parseRule('oauth.google@google.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
    expect(result.domainMatched).toBe(true);
  });
  
  it('should match wildcard domain and exact capability', () => {
    const rule = parseRule('oauth.google@*.google.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
    expect(result.domainMatched).toBe(true);
  });
  
  it('should NOT match wildcard domain for exact domain', () => {
    const rule = parseRule('oauth.google@*.google.com = deny');
    const event = createTestEvent('https://google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(false);
    expect(result.domainMatched).toBe(false);
  });
  
  it('should match regex domain', () => {
    const rule = parseRule('oauth.google@/drive\\.google\\.com/i = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
    expect(result.domainMatched).toBe(true);
  });
  
  it('should match category wildcard capability', () => {
    const rule = parseRule('oauth.*@drive.google.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
    expect(result.capabilityMatched).toBe(true);
  });
  
  it('should match provider wildcard capability', () => {
    const rule = parseRule('oauth.google.*@drive.google.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['drive.readonly']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
    expect(result.capabilityMatched).toBe(true);
  });
  
  it('should match full wildcard capability', () => {
    const rule = parseRule('*@drive.google.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
    expect(result.capabilityMatched).toBe(true);
  });
  
  it('should return false for non-matching domain', () => {
    const rule = parseRule('oauth.google@github.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(false);
    expect(result.domainMatched).toBe(false);
  });
  
  it('should return false for non-matching capability', () => {
    const rule = parseRule('oauth.github@drive.google.com = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(false);
    expect(result.capabilityMatched).toBe(false);
  });
  
  it('should handle case-insensitive domain matching', () => {
    const rule = parseRule('oauth.google@DRIVE.GOOGLE.COM = deny');
    const event = createTestEvent('https://drive.google.com', createOAuthCapability('google', ['profile']));
    
    const result = matchRule(rule, event);
    
    expect(result.matched).toBe(true);
  });
});

describe('Rule Matcher - Edge Cases', () => {
  it('should handle invalid regex gracefully', () => {
    expect(matchDomain('/[invalid/', 'example.com')).toBe(false);
  });
  
  it('should handle malformed wildcard', () => {
    expect(matchDomain('*.', 'example.com')).toBe(false);
  });
  
  it('should handle empty pattern', () => {
    expect(matchDomain('', 'example.com')).toBe(false);
  });
});