/**
 * Temporary Rules Tests
 * Tests for TemporaryRuleManager and DecisionEngine integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseRule } from '../../src/engine/rule-parser.js';
import { TemporaryRuleManager } from '../../src/engine/temporary-rules.js';
import { DecisionEngine } from '../../src/engine/decision-engine.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import { createConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthCapability, createCookieCapability } from '../../src/ir/capability.js';
import { ConsentType } from '../../src/shared/types.js';
import { createDOMEvidence } from '../../src/ir/evidence.js';
import { ExtractionMethod } from '../../src/shared/types.js';

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

describe('TemporaryRuleManager', () => {
  let manager: TemporaryRuleManager;
  let mockRule: ReturnType<typeof parseRule>;

  beforeEach(() => {
    manager = new TemporaryRuleManager();
    mockRule = parseRule('oauth.google@* = deny');
  });

  it('should add rule with session TTL', () => {
    const ruleId = manager.add(mockRule, 'session');
    
    expect(ruleId).toBeDefined();
    expect(typeof ruleId).toBe('string');
    
    const rule = manager.getRule(ruleId);
    expect(rule).toBeDefined();
    expect(rule!.ttlType).toBe('session');
    expect(rule!.expiresAt).toBe(Number.MAX_SAFE_INTEGER);
    expect(rule!.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it('should add rule with 1hr TTL', () => {
    const before = Date.now();
    const ruleId = manager.add(mockRule, '1hr');
    const after = Date.now();
    
    const rule = manager.getRule(ruleId);
    expect(rule).toBeDefined();
    expect(rule!.ttlType).toBe('1hr');
    expect(rule!.expiresAt).toBeGreaterThanOrEqual(before + 60 * 60 * 1000);
    expect(rule!.expiresAt).toBeLessThanOrEqual(after + 60 * 60 * 1000);
  });

  it('should add rule with 24hr TTL', () => {
    const before = Date.now();
    const ruleId = manager.add(mockRule, '24hr');
    const after = Date.now();
    
    const rule = manager.getRule(ruleId);
    expect(rule).toBeDefined();
    expect(rule!.ttlType).toBe('24hr');
    expect(rule!.expiresAt).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
    expect(rule!.expiresAt).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
  });

  it('should add rule with custom TTL', () => {
    const customMs = 30 * 60 * 1000; // 30 minutes
    const before = Date.now();
    const ruleId = manager.add(mockRule, 'custom', customMs);
    const after = Date.now();
    
    const rule = manager.getRule(ruleId);
    expect(rule).toBeDefined();
    expect(rule!.ttlType).toBe('custom');
    expect(rule!.expiresAt).toBeGreaterThanOrEqual(before + customMs);
    expect(rule!.expiresAt).toBeLessThanOrEqual(after + customMs);
  });

  it('should throw for custom TTL without customMs', () => {
    expect(() => manager.add(mockRule, 'custom')).toThrow('customMs is required');
  });

  it('should throw for custom TTL with negative customMs', () => {
    expect(() => manager.add(mockRule, 'custom', -100)).toThrow('must be non-negative');
  });

  it('should return only non-expired rules from getActive()', () => {
    vi.useFakeTimers();
    
    // Add a 1hr rule (active)
    const activeRule = parseRule('cookie.analytics@* = ask');
    const activeId = manager.add(activeRule, '1hr');
    
    // Add a custom rule with 0ms (expired immediately)
    const expiredRule = parseRule('cookie.advertising@* = deny');
    manager.add(expiredRule, 'custom', 0);
    
    // Advance time to ensure expiry
    vi.advanceTimersByTime(1);
    
    const active = manager.getActive();
    expect(active.length).toBe(1);
    expect(active[0]!.id).toBe(activeId);
    
    vi.useRealTimers();
  });

  it('should remove rule by id', () => {
    const ruleId = manager.add(mockRule, '1hr');
    expect(manager.getRule(ruleId)).toBeDefined();
    
    const removed = manager.remove(ruleId);
    expect(removed).toBe(true);
    expect(manager.getRule(ruleId)).toBeUndefined();
  });

  it('should return false when removing non-existent rule', () => {
    const removed = manager.remove('non-existent-id');
    expect(removed).toBe(false);
  });

  it('should clear all rules', () => {
    manager.add(parseRule('oauth.test1@* = allow'), '1hr');
    manager.add(parseRule('oauth.test2@* = deny'), '1hr');
    expect(manager.getActive().length).toBe(2);
    
    manager.clear();
    expect(manager.getActive().length).toBe(0);
  });

  it('should clear expired rules and return count', () => {
    vi.useFakeTimers();
    
    manager.add(parseRule('oauth.test1@* = allow'), '1hr');
    const expiredId = manager.add(parseRule('oauth.test2@* = deny'), 'custom', 0);
    
    vi.advanceTimersByTime(1);
    
    const removed = manager.clearExpired();
    expect(removed).toBe(1);
    expect(manager.getActive().length).toBe(1);
    expect(manager.getRule(expiredId)).toBeUndefined();
    
    vi.useRealTimers();
  });

  it('should return remaining time for active rule', () => {
    const ruleId = manager.add(mockRule, '1hr');
    const remaining = manager.getRemainingTime(ruleId);
    
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it('should return null for session rule remaining time', () => {
    const ruleId = manager.add(mockRule, 'session');
    const remaining = manager.getRemainingTime(ruleId);
    
    expect(remaining).toBeNull();
  });

  it('should return null for non-existent rule', () => {
    const remaining = manager.getRemainingTime('non-existent');
    expect(remaining).toBeNull();
  });

  it('should track session rules separately', () => {
    manager.add(parseRule('oauth.test1@* = allow'), 'session');
    manager.add(parseRule('oauth.test2@* = deny'), '1hr');
    
    // Both should be in getActive
    const active = manager.getActive();
    expect(active.length).toBe(2);
    
    // Clear should remove both
    manager.clear();
    expect(manager.getActive().length).toBe(0);
  });
});

describe('DecisionEngine with Temporary Rules', () => {
  let engine: DecisionEngine;
  let mockEvent: ConsentEvent;

  beforeEach(() => {
    engine = new DecisionEngine([], [], [], 'balanced');
    mockEvent = createMockEvent({
      capability: createOAuthCapability('google', ['profile']),
    });
  });

  it('should add temporary rule that affects decision', () => {
    // Base decision without temporary rule: oauth.*@* = ask (from balanced pack)
    const baseDecision = engine.decide(mockEvent);
    expect(baseDecision.decision).toBe('ask');
    
    // Add temporary rule: oauth.google@* = deny
    const tempRule = parseRule('oauth.google@* = deny');
    engine.addTemporaryRule(tempRule, '1hr');
    
    // Decision should now be deny
    const newDecision = engine.decide(mockEvent);
    expect(newDecision.decision).toBe('deny');
    expect(newDecision.matchedRule?.raw).toBe('oauth.google@* = deny');
    expect(newDecision.matchedLayer).toBe('user');
  });

  it('should remove temporary rule and restore original decision', () => {
    const tempRule = parseRule('oauth.google@* = deny');
    const ruleId = engine.addTemporaryRule(tempRule, '1hr');
    
    // Decision should be deny
    expect(engine.decide(mockEvent).decision).toBe('deny');
    
    // Remove temporary rule
    engine.removeTemporaryRule(ruleId);
    
    // Decision should be back to ask
    expect(engine.decide(mockEvent).decision).toBe('ask');
  });

  it('should get active temporary rules', () => {
    const rule1 = parseRule('oauth.google@* = deny');
    const rule2 = parseRule('cookie.analytics@* = allow');
    
    engine.addTemporaryRule(rule1, '1hr');
    engine.addTemporaryRule(rule2, '24hr');
    
    const tempRules = engine.getTemporaryRules();
    expect(tempRules.length).toBe(2);
  });

  it('should expire temporary rule and stop affecting decisions', () => {
    vi.useFakeTimers();
    
    const tempRule = parseRule('oauth.google@* = deny');
    engine.addTemporaryRule(tempRule, 'custom', 1000); // 1 second
    
    // Immediately: should be deny
    expect(engine.decide(mockEvent).decision).toBe('deny');
    
    // Advance time past expiry
    vi.advanceTimersByTime(2000);
    
    // Should be back to ask
    expect(engine.decide(mockEvent).decision).toBe('ask');
    
    vi.useRealTimers();
  });

  it('should integrate with user rules', () => {
    // Set a user rule
    const userRule = parseRule('oauth.facebook@* = allow');
    engine.setUserRules([userRule]);
    
    // Add temporary rule for different provider
    const tempRule = parseRule('oauth.google@* = deny');
    engine.addTemporaryRule(tempRule, '1hr');
    
    // Facebook event should be allow (user rule)
    const fbEvent = createMockEvent({
      capability: createOAuthCapability('facebook', ['profile']),
    });
    expect(engine.decide(fbEvent).decision).toBe('allow');
    
    // Google event should be deny (temporary rule)
    const googleEvent = createMockEvent({
      capability: createOAuthCapability('google', ['profile']),
    });
    expect(engine.decide(googleEvent).decision).toBe('deny');
  });

  it('should handle cookie temporary rules', () => {
    const cookieEvent = createMockEvent({
      website: 'http://tracker.com',
      consentType: ConsentType.Cookie,
      capability: createCookieCapability('advertising', 'tracker.com'),
    });
    
    // Base: cookie.advertising@* = deny (from balanced)
    expect(engine.decide(cookieEvent).decision).toBe('deny');
    
    // Add temporary allow for specific domain
    const tempRule = parseRule('cookie.advertising@tracker.com = allow');
    engine.addTemporaryRule(tempRule, '1hr');
    
    // Should now be allow
    expect(engine.decide(cookieEvent).decision).toBe('allow');
  });
});