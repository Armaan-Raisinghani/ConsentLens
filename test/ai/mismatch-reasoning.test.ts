/**
 * Tests for MismatchReasoningEngine
 */

import { describe, it, expect, vi } from 'vitest';
import { MismatchReasoningEngine } from '../../src/ai/mismatch-reasoning.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { PurposeInference } from '../../src/ai/types.js';
import { createOAuthCapability, createBrowserPermissionCapability, createCookieCapability } from '../../src/ir/capability.js';
import { ConsentType, GrantStatus } from '../../src/shared/types.js';
import { createHeuristicEvidence } from '../../src/ir/evidence.js';

// Mock OpenJevClient
const createMockOpenJevClient = (response: any) => {
  const mockClient = {
    request: vi.fn().mockResolvedValue(response),
  } as unknown as OpenJevClient;
  return mockClient;
};

// Create test consent events
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

describe('MismatchReasoningEngine', () => {
  const purposeInference: PurposeInference = {
    inferred: 'productivity',
    confidence: 0.85,
    evidence: [],
  };

  describe('with OpenJevClient', () => {
    it('should classify OAuth Drive as relevant for productivity purpose', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          relevance: {
            type: 'choice',
            choice: 'relevant',
            confidence: 0.9,
            probabilities: { relevant: 0.9, unclear: 0.05, 'potentially-excessive': 0.03, unrelated: 0.02 },
          },
        },
        usage: { input_tokens: 200, output_tokens: 100 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new MismatchReasoningEngine(mockClient);
      const events = [createOAuthEvent('google', ['drive', 'drive.file'])];

      const result = await engine.reason(events, purposeInference);

      expect(result).toHaveLength(1);
      expect(result[0].relevance).toBe('relevant');
      expect(result[0].reasoning).toContain('directly supports');
      expect(result[0].reasoning).toContain('productivity');
      expect(result[0].evidence).toBeDefined();
      expect(result[0].evidence.length).toBeGreaterThan(0);
      expect(mockClient.request).toHaveBeenCalledOnce();
    });

    it('should classify Camera permission as potentially-excessive for productivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          relevance: {
            type: 'choice',
            choice: 'potentially-excessive',
            confidence: 0.85,
            probabilities: { relevant: 0.1, unclear: 0.1, 'potentially-excessive': 0.85, unrelated: 0.05 },
          },
        },
        usage: { input_tokens: 200, output_tokens: 100 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new MismatchReasoningEngine(mockClient);
      const events = [createBrowserEvent('camera')];

      const result = await engine.reason(events, purposeInference);

      expect(result[0].relevance).toBe('potentially-excessive');
      expect(result[0].reasoning).toContain('broader permissions');
    });

    it('should classify Advertising cookie as unrelated for productivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          relevance: {
            type: 'choice',
            choice: 'unrelated',
            confidence: 0.88,
            probabilities: { relevant: 0.02, unclear: 0.05, 'potentially-excessive': 0.1, unrelated: 0.88 },
          },
        },
        usage: { input_tokens: 200, output_tokens: 100 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new MismatchReasoningEngine(mockClient);
      const events = [createCookieEvent('advertising', '_fbp', 'facebook.com')];

      const result = await engine.reason(events, purposeInference);

      expect(result[0].relevance).toBe('unrelated');
      expect(result[0].reasoning).toContain('unnecessary');
    });

    it('should classify Analytics cookie as unclear for productivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          relevance: {
            type: 'choice',
            choice: 'unclear',
            confidence: 0.7,
            probabilities: { relevant: 0.2, unclear: 0.7, 'potentially-excessive': 0.05, unrelated: 0.05 },
          },
        },
        usage: { input_tokens: 200, output_tokens: 100 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new MismatchReasoningEngine(mockClient);
      const events = [createCookieEvent('analytics', '_ga', 'example.com')];

      const result = await engine.reason(events, purposeInference);

      expect(result[0].relevance).toBe('unclear');
      expect(result[0].reasoning).toContain('ambiguous');
    });

    it('should handle multiple events with different classifications', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          relevance: {
            type: 'choice',
            choice: 'relevant',
            confidence: 0.9,
            probabilities: { relevant: 0.9, unclear: 0.05, 'potentially-excessive': 0.03, unrelated: 0.02 },
          },
        },
        usage: { input_tokens: 200, output_tokens: 100 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new MismatchReasoningEngine(mockClient);
      const events = [
        createOAuthEvent('google', ['drive']),
        createOAuthEvent('github', ['repo']),
        createBrowserEvent('notifications'),
      ];

      const result = await engine.reason(events, purposeInference);

      expect(result).toHaveLength(3);
      // All get the same mock response, so all should be relevant
      for (const r of result) {
        expect(r.relevance).toBe('relevant');
      }
    });

    it('should include purpose evidence in result evidence', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          relevance: {
            type: 'choice',
            choice: 'relevant',
            confidence: 0.9,
            probabilities: { relevant: 0.9, unclear: 0.05, 'potentially-excessive': 0.03, unrelated: 0.02 },
          },
        },
        usage: { input_tokens: 200, output_tokens: 100 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new MismatchReasoningEngine(mockClient);
      
      const purposeWithEvidence: PurposeInference = {
        inferred: 'productivity',
        confidence: 0.85,
        evidence: [
          { source: 'dom', selector: 'h1', textSpan: { start: 0, end: 10 }, confidence: 0.8 },
        ],
      };
      
      const events = [createOAuthEvent('google', ['drive'])];
      const result = await engine.reason(events, purposeWithEvidence);

      // Should include purpose evidence
      expect(result[0].evidence.some(e => e.source === 'dom')).toBe(true);
      // Should include OpenJev evidence
      expect(result[0].evidence.some(e => e.source === 'openjev')).toBe(true);
    });

    it('should fall back to heuristics when OpenJev fails', async () => {
      const mockClient = createMockOpenJevClient(Promise.reject(new Error('Network error')));
      const engine = new MismatchReasoningEngine(mockClient);
      const events = [createOAuthEvent('google', ['drive'])];

      const result = await engine.reason(events, purposeInference);

      expect(result).toHaveLength(1);
      expect(result[0].relevance).toBeDefined();
      expect(engine.getMode()).toBe('fallback');
    });

    it('should return fallback mode when no OpenJevClient provided', async () => {
      const engine = new MismatchReasoningEngine();
      const events = [createOAuthEvent('google', ['drive'])];

      const result = await engine.reason(events, purposeInference);

      expect(result).toHaveLength(1);
      expect(engine.getMode()).toBe('fallback');
    });
  });

  describe('fallback heuristics (no OpenJevClient)', () => {
    it('should classify OAuth Drive as relevant for productivity', async () => {
      const engine = new MismatchReasoningEngine();
      const events = [createOAuthEvent('google', ['drive', 'drive.file'])];

      const result = await engine.reason(events, purposeInference);

      expect(result[0].relevance).toBe('relevant');
      expect(result[0].reasoning).toContain('supports the inferred purpose');
    });

    it('should classify Camera as potentially-excessive for productivity', async () => {
      const engine = new MismatchReasoningEngine();
      const events = [createBrowserEvent('camera')];

      const result = await engine.reason(events, purposeInference);

      expect(result[0].relevance).toBe('potentially-excessive');
    });

    it('should classify Advertising cookie as potentially-excessive for productivity', async () => {
      const engine = new MismatchReasoningEngine();
      const events = [createCookieEvent('advertising', '_fbp', 'facebook.com')];

      const result = await engine.reason(events, purposeInference);

      expect(result[0].relevance).toBe('potentially-excessive');
      expect(result[0].reasoning).toContain('excessive');
    });

    it('should classify unknown capability as unrelated when no purpose keywords', async () => {
      const engine = new MismatchReasoningEngine();
      const events = [createOAuthEvent('unknown', ['weird-scope'])];
      const otherPurpose: PurposeInference = { inferred: 'other', confidence: 0.5, evidence: [] };

      const result = await engine.reason(events, otherPurpose);

      expect(result[0].relevance).toBe('unrelated');
    });

    it('should have confidence <= 0.6 for fallback', async () => {
      const engine = new MismatchReasoningEngine();
      const events = [createOAuthEvent('google', ['drive'])];

      const result = await engine.reason(events, purposeInference);

      for (const ev of result[0].evidence) {
        expect(ev.confidence).toBeLessThanOrEqual(0.6);
      }
    });
  });

  describe('least-privilege estimation (AI-06)', () => {
    it('should return minimal capabilities for productivity', () => {
      const engine = new MismatchReasoningEngine();
      const minimal = engine.estimateLeastPrivilege({ inferred: 'productivity', confidence: 0.8, evidence: [] });
      
      expect(minimal).toContain('oauth:google:drive');
      expect(minimal).toContain('oauth:google:docs');
    });

    it('should return minimal capabilities for social', () => {
      const engine = new MismatchReasoningEngine();
      const minimal = engine.estimateLeastPrivilege({ inferred: 'social', confidence: 0.8, evidence: [] });
      
      expect(minimal).toContain('oauth:facebook:profile');
    });

    it('should return empty array for unknown purpose', () => {
      const engine = new MismatchReasoningEngine();
      const minimal = engine.estimateLeastPrivilege({ inferred: 'unknown', confidence: 0.5, evidence: [] });
      
      expect(minimal).toEqual([]);
    });
  });

  describe('cross-source summary (AI-07)', () => {
    it('should generate summary with relevant capabilities', () => {
      const engine = new MismatchReasoningEngine();
      const reasonings = [
        { capability: createOAuthCapability('google', ['drive']), relevance: 'relevant' as const, reasoning: 'test', evidence: [] },
        { capability: createOAuthCapability('github', ['repo']), relevance: 'relevant' as const, reasoning: 'test', evidence: [] },
      ];
      const purpose: PurposeInference = { inferred: 'productivity', confidence: 0.85, evidence: [] };

      const summary = engine.generateCrossSourceSummary(reasonings, purpose);

      expect(summary).toContain('productivity');
      expect(summary).toContain('2 capability');
      expect(summary).toContain('support this purpose');
    });

    it('should include excessive/unrelated warnings in summary', () => {
      const engine = new MismatchReasoningEngine();
      const reasonings = [
        { capability: createOAuthCapability('google', ['drive']), relevance: 'relevant' as const, reasoning: 'test', evidence: [] },
        { capability: createBrowserEvent('camera').capability, relevance: 'potentially-excessive' as const, reasoning: 'test', evidence: [] },
        { capability: createCookieEvent('advertising', '_fbp', 'facebook.com').capability, relevance: 'unrelated' as const, reasoning: 'test', evidence: [] },
      ];
      const purpose: PurposeInference = { inferred: 'productivity', confidence: 0.85, evidence: [] };

      const summary = engine.generateCrossSourceSummary(reasonings, purpose);

      expect(summary).toContain('excessive');
      expect(summary).toContain('unrelated');
      expect(summary).toContain('Review excessive or unrelated permissions');
    });
  });
});