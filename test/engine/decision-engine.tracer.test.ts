/**
 * Tracer Test: One rule end-to-end — parser → matcher → decision
 * Verifies the complete data flow: rule string → parsed AST → domain/capability match → decision
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseRule } from '../../src/engine/rule-parser.js';
import { matchRule } from '../../src/engine/rule-matcher.js';
import { DecisionEngine } from '../../src/engine/decision-engine.js';
import { createOAuthConsentEvent } from '../../src/ir/consent-event.js';
import { EvidenceSource, ExtractionMethod } from '../../src/shared/types.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { ParsedRule } from '../../src/engine/types.js';
import { isOAuthCapability } from '../../src/ir/capability.js';

describe('DecisionEngine Tracer: oauth.google@drive.google.com = deny', () => {
  let rule: ParsedRule;
  let event: ConsentEvent;
  let engine: DecisionEngine;
  
  beforeEach(() => {
    // Parse the tracer rule
    rule = parseRule('oauth.google@drive.google.com = deny');
    
    // Create a ConsentEvent for Google OAuth with drive.readonly scope
    event = createOAuthConsentEvent({
      website: 'https://drive.google.com',
      provider: 'google',
      scope: ['https://www.googleapis.com/auth/drive.readonly', 'profile', 'email'],
      evidence: [{
        source: EvidenceSource.DOM,
        selector: 'a[href*="accounts.google.com"]',
        url: 'https://accounts.google.com/o/oauth2/auth?scope=drive.readonly',
        text: 'Sign in with Google',
        confidence: 0.95,
        extractionMethod: ExtractionMethod.DataAttribute,
        extractedAt: new Date().toISOString(),
      }],
      userAction: 'clicked-sign-in-button',
    });
    
    // Create engine with the single rule
    engine = new DecisionEngine([rule]);
  });
  
  it('should parse the rule correctly', () => {
    expect(rule.raw).toBe('oauth.google@drive.google.com = deny');
    expect(rule.capabilityPattern).toBe('oauth.google');
    expect(rule.domainPattern).toBe('drive.google.com');
    expect(rule.action).toBe('deny');
    expect(rule.isException).toBe(false);
    expect(rule.precedenceLayer).toBe('user');
    expect(rule.id).toBeDefined();
  });
  
  it('should create ConsentEvent with correct capability', () => {
    expect(event.website).toBe('https://drive.google.com');
    expect(event.consentType).toBe('oauth');
    expect(event.capability.type).toBe('oauth');
    expect(isOAuthCapability(event.capability)).toBe(true);
    if (isOAuthCapability(event.capability)) {
      expect(event.capability.provider).toBe('google');
      expect(event.capability.scope).toContain('https://www.googleapis.com/auth/drive.readonly');
    }
    expect(event.oauthScope).toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(event.grantStatus).toBe('pending');
    expect(event.evidence.length).toBeGreaterThan(0);
  });
  
  it('should match domain exactly', () => {
    const result = matchRule(rule, event);
    
    expect(result.domainMatched).toBe(true);
    expect(result.capabilityMatched).toBe(true);
    expect(result.matched).toBe(true);
    expect(result.rule.raw).toBe('oauth.google@drive.google.com = deny');
  });
  
  it('should produce deny decision with correct explanation', () => {
    const decision = engine.decide(event);
    
    expect(decision.decision).toBe('deny');
    expect(decision.matchedRule).toBeDefined();
    expect(decision.matchedRule!.raw).toBe('oauth.google@drive.google.com = deny');
    expect(decision.explanation).toContain('oauth.google@drive.google.com = deny');
    expect(decision.explanation).toContain('deny');
    expect(decision.confidence).toBe(1.0);
  });
  
  it('should return ask for non-matching event', () => {
    // Create event for different domain
    const otherEvent = createOAuthConsentEvent({
      website: 'https://github.com',
      provider: 'google',
      scope: ['profile', 'email'],
      evidence: [{
        source: EvidenceSource.DOM,
        selector: 'a[href*="accounts.google.com"]',
        confidence: 0.9,
        extractionMethod: ExtractionMethod.DataAttribute,
        extractedAt: new Date().toISOString(),
      }],
      userAction: 'clicked-sign-in-button',
    });
    
    const decision = engine.decide(otherEvent);
    
    expect(decision.decision).toBe('ask');
    expect(decision.matchedRule).toBeUndefined();
    expect(decision.explanation).toBe('No matching rules found');
    expect(decision.confidence).toBe(0.5);
  });
  
  it('should return ask for non-matching capability', () => {
    // Create event for GitHub OAuth (different provider)
    const githubEvent = createOAuthConsentEvent({
      website: 'https://drive.google.com',
      provider: 'github',
      scope: ['read:user', 'user:email'],
      evidence: [{
        source: EvidenceSource.DOM,
        selector: 'a[href*="github.com/login/oauth"]',
        confidence: 0.9,
        extractionMethod: ExtractionMethod.DataAttribute,
        extractedAt: new Date().toISOString(),
      }],
      userAction: 'clicked-sign-in-button',
    });
    
    const decision = engine.decide(githubEvent);
    
    expect(decision.decision).toBe('ask');
    expect(decision.matchedRule).toBeUndefined();
  });
});