/**
 * Precedence Engine Tests - Tests for 4-layer evaluation and exception handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseRule, parseRules } from '../../src/engine/rule-parser.js';
import { PrecedenceEngine } from '../../src/engine/precedence-engine.js';
import { createOAuthConsentEvent, createConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthCapability, createCookieCapability, createBrowserPermissionCapability, createPolicyCapability, createTermsCapability } from '../../src/ir/capability.js';
import { EvidenceSource, ExtractionMethod, ConsentType, GrantStatus } from '../../src/shared/types.js';
import type { ConsentEvent, RuleSet } from '../../src/ir/consent-event.js';
import type { RuleSet as EngineRuleSet } from '../../src/engine/types.js';

function createMockEvent(overrides: Partial<ConsentEvent> = {}): ConsentEvent {
  return createConsentEvent({
    website: 'https://example.com',
    consentType: ConsentType.Cookie,
    capability: createCookieCapability('analytics'),
    evidence: [{
      source: EvidenceSource.DOM,
      selector: 'test',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.DataAttribute,
      extractedAt: new Date().toISOString(),
    }],
    timestamp: new Date().toISOString(),
    grantStatus: GrantStatus.Pending,
    ...overrides,
  });
}

function createOAuthEvent(website: string, provider: string): ConsentEvent {
  return createOAuthConsentEvent({
    website,
    provider,
    scope: ['profile', 'email'],
    evidence: [{
      source: EvidenceSource.DOM,
      selector: 'test',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.DataAttribute,
      extractedAt: new Date().toISOString(),
    }],
    userAction: 'clicked-sign-in-button',
  });
}

function createRuleSet(layer: EngineRuleSet['layer'], ruleStrings: string[]): EngineRuleSet {
  return {
    layer,
    rules: ruleStrings.map(s => parseRule(s)),
  };
}

describe('PrecedenceEngine - 4-Layer Evaluation', () => {
  let engine: PrecedenceEngine;

  beforeEach(() => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('trusted', []),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);
  });

  it('should return ask when no rules in any layer', () => {
    const event = createMockEvent();
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('ask');
    expect(decision.explanation).toBe('No matching rules found in any layer');
    expect(decision.confidence).toBe(0.5);
  });

  it('should apply user layer rules first (highest precedence)', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['cookie.analytics@example.com = deny']),
      createRuleSet('trusted', ['cookie.analytics@example.com = allow']),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('deny');
    expect(decision.matchedLayer).toBe('user');
    expect(decision.explanation).toContain('Layer \'user\'');
  });

  it('should apply trusted layer when user layer has no match', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['cookie.advertising@example.com = deny']),
      createRuleSet('trusted', ['cookie.analytics@example.com = allow']),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('allow');
    expect(decision.matchedLayer).toBe('trusted');
  });

  it('should apply community layer when user and trusted have no match', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['cookie.advertising@example.com = deny']),
      createRuleSet('trusted', ['cookie.marketing@example.com = deny']),
      createRuleSet('community', ['cookie.analytics@example.com = allow']),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('allow');
    expect(decision.matchedLayer).toBe('community');
  });

  it('should apply defaults layer when no other layer matches', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('trusted', []),
      createRuleSet('community', []),
      createRuleSet('defaults', ['cookie.analytics@example.com = deny']),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('deny');
    expect(decision.matchedLayer).toBe('defaults');
  });

  it('should apply first-match-wins within same layer', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', [
        'cookie.analytics@example.com = deny',
        'cookie.analytics@example.com = allow', // Should not be reached
      ]),
      createRuleSet('trusted', []),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('deny');
    expect(decision.matchedRule?.raw).toBe('cookie.analytics@example.com = deny');
  });
});

describe('PrecedenceEngine - Exception Handling (@@)', () => {
  let engine: PrecedenceEngine;

  beforeEach(() => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('trusted', []),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);
  });

  it('should override higher-precedence deny with exception for matching capability@domain', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['cookie.analytics@example.com = deny']),
      createRuleSet('trusted', ['@@cookie.analytics@example.com']), // Exception in trusted
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('allow');
    expect(decision.matchedLayer).toBe('exception');
    expect(decision.explanation).toContain('Exception rule');
    expect(decision.explanation).toContain('overrides deny from layer');
    expect(decision.confidence).toBe(0.9);
  });

  it('should NOT override user deny for different capability', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['cookie.analytics@example.com = deny']),
      createRuleSet('trusted', ['@@cookie.advertising@example.com']), // Different capability
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('deny');
    expect(decision.matchedLayer).toBe('user');
  });

  it('should NOT override user deny for different domain', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['cookie.analytics@example.com = deny']),
      createRuleSet('trusted', ['@@cookie.analytics@other.com']), // Different domain
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('deny');
    expect(decision.matchedLayer).toBe('user');
  });

  it('should allow exception to work when no deny rule exists (implicit allow)', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('trusted', ['@@cookie.analytics@example.com']),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('allow');
    expect(decision.matchedLayer).toBe('exception');
  });

  it('should prioritize non-exception match over exception in same layer', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', [
        'cookie.analytics@example.com = allow',
        '@@cookie.analytics@example.com', // Exception after allow - should not matter
      ]),
      createRuleSet('trusted', []),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('allow');
    expect(decision.matchedLayer).toBe('user');
    expect(decision.matchedRule?.raw).toBe('cookie.analytics@example.com = allow');
  });

  it('should allow exception in defaults to override deny in community', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('trusted', []),
      createRuleSet('community', ['cookie.analytics@example.com = deny']),
      createRuleSet('defaults', ['@@cookie.analytics@example.com']),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const event = createMockEvent({ website: 'https://example.com' });
    const decision = engine.evaluate(event);

    expect(decision.decision).toBe('allow');
    expect(decision.matchedLayer).toBe('exception');
  });
});

describe('PrecedenceEngine - Cross-layer with exceptions', () => {
  let engine: PrecedenceEngine;

  it('should handle complex multi-layer scenario', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['oauth.google@drive.google.com = deny']),
      createRuleSet('trusted', ['@@oauth.google@drive.google.com']),
      createRuleSet('community', ['cookie.*@google.com = deny']),
      createRuleSet('defaults', ['cookie.essential@* = allow']),
    ];
    engine = new PrecedenceEngine(ruleSets);

    // Test OAuth event - user deny overridden by trusted exception
    const oauthEvent = createOAuthEvent('https://drive.google.com', 'google');
    const oauthDecision = engine.evaluate(oauthEvent);
    expect(oauthDecision.decision).toBe('allow');
    expect(oauthDecision.matchedLayer).toBe('exception');

    // Test cookie event - community deny applies (no exception)
    const cookieEvent = createMockEvent({
      website: 'https://maps.google.com',
      consentType: ConsentType.Cookie,
      capability: createCookieCapability('analytics'),
    });
    const cookieDecision = engine.evaluate(cookieEvent);
    expect(cookieDecision.decision).toBe('deny');
    expect(cookieDecision.matchedLayer).toBe('community');
  });

  it('should work with all 5 ConsentEvent types', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('trusted', [
        '@@oauth.google@drive.google.com',
        '@@browser-permission.geolocation@maps.google.com',
        '@@cookie.analytics@analytics.google.com',
        '@@policy.data-sharing@google.com',
        '@@terms.arbitration@google.com',
      ]),
      createRuleSet('community', []),
      createRuleSet('defaults', [
        'oauth.google@drive.google.com = deny',
        'browser-permission.geolocation@maps.google.com = deny',
        'cookie.analytics@analytics.google.com = deny',
        'policy.data-sharing@google.com = deny',
        'terms.arbitration@google.com = deny',
      ]),
    ];
    engine = new PrecedenceEngine(ruleSets);

    // OAuth
    const oauthEvent = createOAuthEvent('https://drive.google.com', 'google');
    expect(engine.evaluate(oauthEvent).decision).toBe('allow');

    // Browser permission
    const browserEvent = createConsentEvent({
      website: 'https://maps.google.com',
      consentType: ConsentType.BrowserPermission,
      capability: createBrowserPermissionCapability('geolocation'),
      evidence: [{ source: EvidenceSource.DOM, selector: 'test', confidence: 0.9, extractionMethod: ExtractionMethod.DataAttribute, extractedAt: new Date().toISOString() }],
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
    });
    expect(engine.evaluate(browserEvent).decision).toBe('allow');

    // Cookie
    const cookieEvent = createConsentEvent({
      website: 'https://analytics.google.com',
      consentType: ConsentType.Cookie,
      capability: createCookieCapability('analytics'),
      evidence: [{ source: EvidenceSource.DOM, selector: 'test', confidence: 0.9, extractionMethod: ExtractionMethod.DataAttribute, extractedAt: new Date().toISOString() }],
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
    });
    expect(engine.evaluate(cookieEvent).decision).toBe('allow');

    // Policy
    const policyEvent = createConsentEvent({
      website: 'https://google.com',
      consentType: ConsentType.Policy,
      capability: createPolicyCapability('data-sharing'),
      evidence: [{ source: EvidenceSource.DOM, selector: 'test', confidence: 0.9, extractionMethod: ExtractionMethod.DataAttribute, extractedAt: new Date().toISOString() }],
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
    });
    expect(engine.evaluate(policyEvent).decision).toBe('allow');

    // Terms
    const termsEvent = createConsentEvent({
      website: 'https://google.com',
      consentType: ConsentType.Terms,
      capability: createTermsCapability('arbitration'),
      evidence: [{ source: EvidenceSource.DOM, selector: 'test', confidence: 0.9, extractionMethod: ExtractionMethod.DataAttribute, extractedAt: new Date().toISOString() }],
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
    });
    expect(engine.evaluate(termsEvent).decision).toBe('allow');
  });
});

describe('PrecedenceEngine - Constructor validation', () => {
  it('should throw when layers are in wrong order', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('trusted', []), // Wrong: trusted first
      createRuleSet('user', []),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    expect(() => new PrecedenceEngine(ruleSets)).toThrow('RuleSets must be ordered by precedence');
  });

  it('should throw when layer is missing', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('community', []), // Missing trusted
      createRuleSet('defaults', []),
    ];
    expect(() => new PrecedenceEngine(ruleSets)).toThrow('RuleSets must be ordered by precedence');
  });
});

describe('PrecedenceEngine - getRulesForLayer', () => {
  let engine: PrecedenceEngine;

  it('should return rules for specific layer', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', ['cookie.analytics@example.com = deny']),
      createRuleSet('trusted', ['@@cookie.analytics@example.com']),
      createRuleSet('community', []),
      createRuleSet('defaults', ['cookie.essential@* = allow']),
    ];
    engine = new PrecedenceEngine(ruleSets);

    const userRules = engine.getRulesForLayer('user');
    expect(userRules).toHaveLength(1);
    expect(userRules[0].raw).toBe('cookie.analytics@example.com = deny');

    const trustedRules = engine.getRulesForLayer('trusted');
    expect(trustedRules).toHaveLength(1);
    expect(trustedRules[0].raw).toBe('@@cookie.analytics@example.com');

    const defaultsRules = engine.getRulesForLayer('defaults');
    expect(defaultsRules).toHaveLength(1);
    expect(defaultsRules[0].raw).toBe('cookie.essential@* = allow');
  });

  it('should return empty array for empty layer', () => {
    const ruleSets: EngineRuleSet[] = [
      createRuleSet('user', []),
      createRuleSet('trusted', []),
      createRuleSet('community', []),
      createRuleSet('defaults', []),
    ];
    engine = new PrecedenceEngine(ruleSets);

    expect(engine.getRulesForLayer('community')).toHaveLength(0);
  });
});