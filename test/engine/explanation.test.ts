/**
 * Explanation Generator Tests
 * Tests for ExplanationGenerator and DecisionEngine integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseRule } from '../../src/engine/rule-parser.js';
import { ExplanationGenerator } from '../../src/engine/explanation.js';
import { DecisionEngine } from '../../src/engine/decision-engine.js';
import { createConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthCapability, createCookieCapability, createBrowserPermissionCapability, createPolicyCapability, createTermsCapability } from '../../src/ir/capability.js';
import { ConsentType } from '../../src/shared/types.js';
import { createDOMEvidence } from '../../src/ir/evidence.js';
import { ExtractionMethod } from '../../src/shared/types.js';
import type { EngineDecision, ParsedRule } from '../../src/engine/types.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';

// Helper to create a mock ConsentEvent
function createMockEvent(overrides: Partial<ConsentEvent> = {}): ConsentEvent {
  return createConsentEvent({
    website: 'http://example.com',
    consentType: ConsentType.OAuth,
    capability: createOAuthCapability('google', ['profile', 'email']),
    evidence: [createDOMEvidence({ selector: 'test', text: 'test', confidence: 1, extractionMethod: ExtractionMethod.TextContent })],
    ...overrides,
  });
}

// Helper to create a mock ParsedRule
function createMockRule(overrides: Partial<ParsedRule> = {}): ParsedRule {
  return {
    id: 'rule_mock',
    raw: 'oauth.google@* = deny',
    capabilityPattern: 'oauth.google',
    domainPattern: '*',
    action: 'deny',
    isException: false,
    precedenceLayer: 'user',
    ...overrides,
  };
}

// Helper to create a mock EngineDecision
function createMockDecision(overrides: Partial<EngineDecision> = {}): EngineDecision {
  return {
    decision: 'deny',
    matchedRule: createMockRule(),
    matchedLayer: 'user',
    explanation: "Layer 'user': matched rule \"oauth.google@* = deny\" → deny",
    confidence: 1.0,
    ...overrides,
  };
}

describe('ExplanationGenerator', () => {
  let generator: ExplanationGenerator;

  beforeEach(() => {
    generator = new ExplanationGenerator();
  });

  it('should generate explanation for user deny rule', () => {
    const event = createMockEvent({
      capability: createOAuthCapability('google', ['profile']),
    });
    
    const mockDecision = createMockDecision({
      decision: 'deny',
      matchedRule: createMockRule({ raw: 'oauth.google@drive.google.com = deny', capabilityPattern: 'oauth.google', domainPattern: 'drive.google.com' }),
      matchedLayer: 'user',
    });
    
    const explanation = generator.generate(mockDecision, event);
    
    expect(explanation.decision).toBe('deny');
    expect(explanation.matchedRule).toBe('oauth.google@drive.google.com = deny');
    expect(explanation.matchedLayer).toBe('user');
    expect(explanation.capability).toContain('OAuth: google');
    expect(explanation.domain).toBe('example.com');
    expect(explanation.action).toBe('deny');
    expect(explanation.confidence).toBe(1.0);
    expect(explanation.humanReadable).toContain('Blocked by your rule');
    expect(explanation.humanReadable).toContain('oauth.google@drive.google.com = deny');
    expect(explanation.humanReadable).toContain('user layer');
    expect(explanation.evidence.length).toBeGreaterThan(0);
  });

  it('should generate explanation for exception allow', () => {
    const exceptionDecision = createMockDecision({
      decision: 'allow',
      matchedLayer: 'exception',
      matchedRule: createMockRule({ raw: '@@cookie.analytics@analytics.example.com', capabilityPattern: 'cookie.analytics', domainPattern: 'analytics.example.com', isException: true, action: 'allow' }),
    });
    
    const event = createMockEvent({
      consentType: ConsentType.Cookie,
      capability: createCookieCapability('analytics', 'analytics.example.com'),
    });
    
    const explanation = generator.generate(exceptionDecision, event);
    
    expect(explanation.decision).toBe('allow');
    expect(explanation.matchedLayer).toBe('exception');
    expect(explanation.humanReadable).toContain('Exception rule');
    expect(explanation.humanReadable).toContain('@@cookie.analytics@analytics.example.com');
    expect(explanation.humanReadable).toContain('allow');
  });

  it('should generate explanation for pack rule (Balanced)', () => {
    const packDecision = createMockDecision({
      decision: 'ask',
      matchedLayer: 'defaults',
      matchedRule: createMockRule({ raw: 'cookie.analytics@* = ask', capabilityPattern: 'cookie.analytics', domainPattern: '*', action: 'ask', precedenceLayer: 'defaults' }),
    });
    
    const event = createMockEvent({
      consentType: ConsentType.Cookie,
      capability: createCookieCapability('analytics', 'example.com'),
    });
    
    const explanation = generator.generate(packDecision, event);
    
    expect(explanation.decision).toBe('ask');
    expect(explanation.matchedLayer).toBe('defaults');
    expect(explanation.humanReadable).toContain('Asked per defaults pack rule');
    expect(explanation.humanReadable).toContain('cookie.analytics@* = ask');
    expect(explanation.humanReadable).toContain('defaults layer');
  });

  it('should generate explanation for no match', () => {
    const noMatchDecision = createMockDecision({
      decision: 'ask',
      matchedRule: undefined,
      matchedLayer: 'defaults',
      explanation: 'No matching rules found in any layer',
      confidence: 0.5,
    });
    
    const event = createMockEvent({
      capability: createOAuthCapability('unknown', ['profile']),
    });
    
    const explanation = generator.generate(noMatchDecision, event);
    
    expect(explanation.decision).toBe('ask');
    expect(explanation.matchedRule).toBe('none');
    expect(explanation.humanReadable).toContain('no matching rule');
  });

  it('should include evidence from event in explanation', () => {
    const event = createMockEvent({
      evidence: [
        createDOMEvidence({ selector: 'button#oauth', text: 'Sign in with Google', confidence: 0.95, extractionMethod: ExtractionMethod.TextContent }),
        createDOMEvidence({ selector: 'body', text: 'OAuth flow detected', confidence: 0.8, extractionMethod: ExtractionMethod.Heuristic }),
      ],
    });
    
    const mockDecision = createMockDecision({ decision: 'deny' });
    const explanation = generator.generate(mockDecision, event);
    
    expect(explanation.evidence.length).toBe(2);
    expect(explanation.evidence[0]).toContain('button#oauth');
    expect(explanation.evidence[0]).toContain('Sign in with Google');
    expect(explanation.evidence[1]).toContain('OAuth flow detected');
  });

  it('should format capability strings correctly for all types', () => {
    const mockDecision = createMockDecision({ decision: 'deny' });
    
    const testCases = [
      { capability: createOAuthCapability('google', ['profile', 'email']), expected: 'OAuth: google' },
      { capability: createCookieCapability('analytics', '_ga'), expected: 'Cookie: analytics (_ga)' },
      { capability: createBrowserPermissionCapability('geolocation'), expected: 'Browser Permission: geolocation' },
      { capability: createPolicyCapability('data-collection'), expected: 'Policy: data-collection' },
      { capability: createTermsCapability('arbitration'), expected: 'Terms: arbitration' },
    ];
    
    for (const { capability, expected } of testCases) {
      const event = createMockEvent({ capability });
      const explanation = generator.generate(mockDecision, event);
      expect(explanation.capability).toContain(expected);
    }
  });

  it('should generate structured details', () => {
    const event = createMockEvent({
      capability: createOAuthCapability('google', ['profile']),
    });
    
    const mockDecision = createMockDecision({
      decision: 'deny',
      matchedRule: createMockRule({ raw: 'oauth.google@drive.google.com = deny', capabilityPattern: 'oauth.google', domainPattern: 'drive.google.com' }),
      matchedLayer: 'user',
    });
    
    const details = generator.generateDetails(mockDecision, event);
    
    expect(details.length).toBe(1);
    const detail = details[0]!;
    expect(detail.ruleType).toBe('user');
    expect(detail.ruleString).toBe('oauth.google@drive.google.com = deny');
    expect(detail.layer).toBe('user');
    expect(detail.reason).toContain('Layer');
  });

  it('should generate structured details for no match', () => {
    const noMatchDecision = createMockDecision({
      decision: 'ask',
      matchedRule: undefined,
      matchedLayer: 'defaults',
      explanation: 'No matching rules found in any layer',
      confidence: 0.5,
    });
    
    const event = createMockEvent({});
    const details = generator.generateDetails(noMatchDecision, event);
    
    expect(details.length).toBe(1);
    const detail = details[0]!;
    expect(detail.ruleType).toBe('defaults');
    expect(detail.ruleString).toBe('(no matching rule)');
  });
});

describe('DecisionEngine with Explanation', () => {
  let engine: DecisionEngine;
  let mockEvent: ConsentEvent;

  beforeEach(() => {
    engine = new DecisionEngine([], [], [], 'balanced');
    mockEvent = createMockEvent({
      capability: createOAuthCapability('google', ['profile']),
    });
  });

  it('should return decision and explanation from decideWithExplanation', () => {
    const result = engine.decideWithExplanation(mockEvent);
    
    expect(result.decision).toBeDefined();
    expect(result.decision.decision).toBeDefined();
    expect(result.explanation).toBeDefined();
    expect(result.explanation.humanReadable).toBeDefined();
    expect(result.explanation.humanReadable.length).toBeGreaterThan(0);
    expect(result.explanation.matchedRule).toBeDefined();
    expect(result.explanation.matchedLayer).toBeDefined();
    expect(result.explanation.capability).toBeDefined();
    expect(result.explanation.domain).toBeDefined();
    expect(result.explanation.confidence).toBeGreaterThan(0);
  });

  it('should show user deny rule explanation', () => {
    const userRule = parseRule('oauth.google@* = deny');
    engine.setUserRules([userRule]);
    
    const result = engine.decideWithExplanation(mockEvent);
    
    expect(result.decision.decision).toBe('deny');
    expect(result.explanation.humanReadable).toContain('Blocked by your rule');
    expect(result.explanation.humanReadable).toContain('oauth.google@* = deny');
    expect(result.explanation.matchedLayer).toBe('user');
  });

  it('should show pack rule explanation (Balanced)', () => {
    const result = engine.decideWithExplanation(mockEvent);
    
    // Balanced pack: oauth.*@* = ask
    expect(result.decision.decision).toBe('ask');
    expect(result.explanation.humanReadable).toContain('Asked per');
    expect(result.explanation.humanReadable).toContain('defaults');
    expect(result.explanation.matchedRule).toContain('oauth');
  });

  it('should show cookie analytics ask explanation', () => {
    const cookieEvent = createMockEvent({
      consentType: ConsentType.Cookie,
      capability: createCookieCapability('analytics', 'example.com'),
    });
    
    const result = engine.decideWithExplanation(cookieEvent);
    
    expect(result.decision.decision).toBe('ask');
    expect(result.explanation.humanReadable).toContain('Asked per');
    expect(result.explanation.matchedRule).toContain('cookie.analytics');
  });

  it('should show cookie advertising deny explanation', () => {
    const cookieEvent = createMockEvent({
      consentType: ConsentType.Cookie,
      capability: createCookieCapability('advertising', 'example.com'),
    });
    
    const result = engine.decideWithExplanation(cookieEvent);
    
    expect(result.decision.decision).toBe('deny');
    expect(result.explanation.humanReadable).toContain('Blocked by');
    expect(result.explanation.matchedRule).toContain('cookie.advertising');
  });

  it('should include evidence in explanation', () => {
    const eventWithEvidence = createMockEvent({
      evidence: [
        createDOMEvidence({ selector: 'iframe[src*="google"]', text: 'Google OAuth', confidence: 0.9, extractionMethod: ExtractionMethod.Attribute }),
      ],
    });
    
    const result = engine.decideWithExplanation(eventWithEvidence);
    
    expect(result.explanation.evidence.length).toBeGreaterThan(0);
    expect(result.explanation.evidence[0]).toContain('iframe');
  });

  it('should create decision record with explanation data', () => {
    const record = engine.createDecisionRecord(mockEvent);
    
    expect(record.matchedRule).toBeDefined();
    expect(record.confidence).toBeGreaterThan(0);
    expect(record.provenance.engine).toBe('deterministic-policy-engine');
    expect(record.provenance.version).toBe('0.1.0');
  });

  it('should handle temporary rule explanation', () => {
    const tempRule = parseRule('oauth.google@* = allow');
    engine.addTemporaryRule(tempRule, '1hr');
    
    const result = engine.decideWithExplanation(mockEvent);
    
    expect(result.decision.decision).toBe('allow');
    expect(result.explanation.humanReadable).toContain('Allowed by');
    expect(result.explanation.matchedRule).toBe('oauth.google@* = allow');
    expect(result.explanation.matchedLayer).toBe('user'); // Temporary rules are in user layer
  });
});