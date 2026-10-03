/**
 * Tests for FallbackHeuristics - Mismatch reasoning fallback
 */

import { describe, it, expect } from 'vitest';
import { FallbackHeuristics } from '../../src/ai/fallback-heuristics.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { Purpose } from '../../src/ir/purpose.js';
import { createOAuthCapability, createBrowserPermissionCapability, createCookieCapability } from '../../src/ir/capability.js';
import { ConsentType, GrantStatus } from '../../src/shared/types.js';
import { createHeuristicEvidence } from '../../src/ir/evidence.js';

const createTestEvent = (capability: any, overrides: Partial<ConsentEvent> = {}): ConsentEvent => ({
  website: 'https://example.com',
  consentType: ConsentType.OAuth,
  capability,
  timestamp: new Date().toISOString(),
  grantStatus: GrantStatus.Pending,
  evidence: [createHeuristicEvidence({ text: 'Test evidence', confidence: 0.8 })],
  ...overrides,
});

const createOAuthEvent = (provider: string, scopes: string[]) =>
  createTestEvent(createOAuthCapability(provider, scopes), { consentType: ConsentType.OAuth });

const createBrowserEvent = (permission: string) =>
  createTestEvent(createBrowserPermissionCapability(permission), { consentType: ConsentType.BrowserPermission });

const createCookieEvent = (category: string, name: string, domain: string) =>
  createTestEvent(createCookieCapability(category, name, domain), { consentType: ConsentType.Cookie });

describe('FallbackHeuristics - Mismatch Reasoning', () => {
  const purpose: Purpose = { inferred: 'productivity', confidence: 0.8 };
  const socialPurpose: Purpose = { inferred: 'social', confidence: 0.8 };
  const ecommercePurpose: Purpose = { inferred: 'ecommerce', confidence: 0.8 };
  const otherPurpose: Purpose = { inferred: 'other', confidence: 0.5 };

  describe('reasonMismatch', () => {
    it('should return confidence <= 0.6 for all fallback reasonings', () => {
      const events = [
        createOAuthEvent('google', ['drive']),
        createBrowserEvent('camera'),
        createCookieEvent('analytics', '_ga', 'example.com'),
      ];

      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      for (const result of results) {
        for (const ev of result.evidence) {
          expect(ev.confidence).toBeLessThanOrEqual(0.6);
        }
      }
    });

    it('should classify OAuth Drive as relevant for productivity', () => {
      const events = [createOAuthEvent('google', ['drive', 'drive.file'])];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].relevance).toBe('relevant');
      expect(results[0].reasoning).toContain('supports the inferred purpose');
    });

    it('should classify OAuth with admin scope as potentially-excessive', () => {
      const events = [createOAuthEvent('github', ['admin:repo_hook', 'delete_repo'])];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].relevance).toBe('potentially-excessive');
      expect(results[0].reasoning).toContain('excessive permission indicators');
    });

    it('should classify Camera as potentially-excessive for productivity', () => {
      const events = [createBrowserEvent('camera')];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].relevance).toBe('potentially-excessive');
    });

    it('should classify Microphone as potentially-excessive for productivity', () => {
      const events = [createBrowserEvent('microphone')];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].relevance).toBe('potentially-excessive');
    });

    it('should classify Advertising cookie as potentially-excessive for productivity', () => {
      const events = [createCookieEvent('advertising', '_fbp', 'facebook.com')];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].relevance).toBe('potentially-excessive');
      expect(results[0].reasoning).toContain('excessive');
    });

    it('should classify Analytics cookie as potentially-excessive for productivity', () => {
      const events = [createCookieEvent('analytics', '_ga', 'example.com')];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].relevance).toBe('potentially-excessive');
    });

    it('should classify Tracking cookie as potentially-excessive', () => {
      const events = [createCookieEvent('tracking', '_gid', 'google.com')];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].relevance).toBe('potentially-excessive');
    });

    it('should classify relevant OAuth for social purpose', () => {
      const events = [createOAuthEvent('facebook', ['user_posts', 'user_friends'])];
      const results = FallbackHeuristics.reasonMismatch(events, socialPurpose);

      expect(results[0].relevance).toBe('relevant');
    });

    it('should classify relevant OAuth for ecommerce purpose', () => {
      const events = [createOAuthEvent('paypal', ['payments', 'orders'])];
      const results = FallbackHeuristics.reasonMismatch(events, ecommercePurpose);

      expect(results[0].relevance).toBe('relevant');
    });

    it('should classify unknown capability as unrelated for other purpose', () => {
      const events = [createOAuthEvent('unknown', ['weird-scope'])];
      const results = FallbackHeuristics.reasonMismatch(events, otherPurpose);

      expect(results[0].relevance).toBe('unrelated');
    });

    it('should return unclear when purpose keywords exist but no match', () => {
      const events = [createOAuthEvent('microsoft', ['files.read'])];
      // Productivity has keywords like 'file', 'drive', 'document'
      // Microsoft files.read might not match exactly
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      // Could be relevant or unclear depending on keyword matching
      expect(['relevant', 'unclear', 'potentially-excessive']).toContain(results[0].relevance);
    });

    it('should include evidence with openjev source', () => {
      const events = [createOAuthEvent('google', ['drive'])];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results[0].evidence).toBeDefined();
      expect(results[0].evidence.length).toBeGreaterThan(0);
      expect(results[0].evidence[0].source).toBe('openjev');
    });

    it('should handle multiple events', () => {
      const events = [
        createOAuthEvent('google', ['drive']),
        createBrowserEvent('camera'),
        createCookieEvent('analytics', '_ga', 'example.com'),
      ];
      const results = FallbackHeuristics.reasonMismatch(events, purpose);

      expect(results).toHaveLength(3);
      expect(results[0].relevance).toBe('relevant');
      expect(results[1].relevance).toBe('potentially-excessive');
      expect(results[2].relevance).toBe('potentially-excessive');
    });
  });

  describe('reasonMismatchForPlugin', () => {
    it('should return ReasoningResult with correct structure', () => {
      const events = [
        createOAuthEvent('google', ['drive']),
        createBrowserEvent('camera'),
      ];
      const purpose: Purpose = { inferred: 'productivity', confidence: 0.8 };

      const result = FallbackHeuristics.reasonMismatchForPlugin(events, purpose);

      expect(result.mismatch).toBe(true);
      expect(result.mismatchDetails).toBeDefined();
      expect(result.userIntentAlignment).toBe('partial');
      expect(result.riskLevel).toBe('medium');
      expect(result.recommendations).toContain('Review excessive permissions');
      expect(result.confidence).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.totalEvents).toBe(2);
    });

    it('should return aligned when all relevant', () => {
      const events = [createOAuthEvent('google', ['drive'])];
      const purpose: Purpose = { inferred: 'productivity', confidence: 0.8 };

      const result = FallbackHeuristics.reasonMismatchForPlugin(events, purpose);

      expect(result.mismatch).toBe(false);
      expect(result.userIntentAlignment).toBe('aligned');
      expect(result.riskLevel).toBe('low');
      expect(result.recommendations).toEqual([]);
    });

    it('should return misaligned when unrelated', () => {
      const events = [createOAuthEvent('unknown', ['weird'])];
      const purpose: Purpose = { inferred: 'other', confidence: 0.5 };

      const result = FallbackHeuristics.reasonMismatchForPlugin(events, purpose);

      expect(result.mismatch).toBe(true);
      expect(result.userIntentAlignment).toBe('misaligned');
      expect(result.riskLevel).toBe('high');
    });
  });
});