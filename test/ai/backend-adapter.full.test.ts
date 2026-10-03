/**
 * Tests for OpenJevAIBackend - full integration test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenJevAIBackend, initializeOpenJevBackend, getDefaultOpenJevBackend, resetDefaultOpenJevBackend } from '../../src/ai/backend-adapter.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import { clearAIBackends, getAIBackend } from '../../src/plugins/ai-backend-plugin.js';
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

describe('OpenJevAIBackend - Full Integration', () => {
  beforeEach(() => {
    clearAIBackends();
    resetDefaultOpenJevBackend();
  });

  describe('classify()', () => {
    it('should classify events using OpenJevClient when available', async () => {
      const mockClient = {
        classifyBatch: vi.fn().mockResolvedValue([
          {
            decision: 'allow',
            decisionConfidence: 0.8,
            excessiveness: 'minimal',
            excessivenessConfidence: 0.7,
            purposeMatch: 'relevant',
            purposeMatchConfidence: 0.75,
            sensitivity: 'low',
            sensitivityScore: 0,
            evidence: [],
          },
        ]),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const events = [createOAuthEvent('google', ['profile'])];
      const results = await backend.classify(events);

      expect(results).toHaveLength(1);
      expect(results[0].decision).toBe('allow');
      expect(results[0].excessiveness).toBe('none');
      expect(results[0].purposeMatch).toBe(true);
      expect(mockClient.classifyBatch).toHaveBeenCalledWith(events);
    });

    it('should fall back to heuristics when OpenJevClient fails', async () => {
      const mockClient = {
        classifyBatch: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const events = [createOAuthEvent('google', ['profile'])];
      const results = await backend.classify(events);

      expect(results).toHaveLength(1);
      expect(results[0].decision).toBeDefined();
      expect(backend.getMode()).toBe('fallback');
    });

    it('should use fallback when no OpenJevClient provided', async () => {
      const backend = new OpenJevAIBackend();
      const events = [createOAuthEvent('google', ['profile'])];
      const results = await backend.classify(events);

      expect(results).toHaveLength(1);
      expect(backend.getMode()).toBe('fallback');
    });
  });

  describe('extract() - policy', () => {
    it('should extract policy data using PolicyExtractionEngine', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          model: 'openjev-latest',
          answers: {
            practices: { type: 'choice', choice: 'collection', confidence: 0.85, probabilities: { collection: 0.9, sharing: 0.8, selling: 0.1, 'ai-training': 0.2 } },
            purposes: { type: 'choice', choice: 'service-provision', confidence: 0.8, probabilities: { 'service-provision': 0.85, analytics: 0.6, marketing: 0.3, personalization: 0.2, security: 0.4, legal: 0.5 } },
            thirdParties: { type: 'choice', choice: 'service-providers', confidence: 0.75, probabilities: { 'service-providers': 0.8, partners: 0.3, affiliates: 0.2, advertisers: 0.1, analytics: 0.4 } },
            aiTraining: { type: 'noul', noul: 0.15 },
            retention: { type: 'choice', choice: 'indefinite', confidence: 0.7, probabilities: { indefinite: 0.6 } },
          },
          usage: { input_tokens: 500, output_tokens: 200 },
        }),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const policyText = 'We collect your data and share with service providers. We use analytics to improve.';
      const result = await backend.extract(policyText, 'policy', { url: 'https://example.com/privacy' });

      expect(result.practices).toBeDefined();
      expect(result.practices.length).toBeGreaterThan(0);
      expect(result.purposes).toBeDefined();
      expect(result.metadata?.aiTraining).toBe(false);
      expect(mockClient.request).toHaveBeenCalled();
    });

    it('should fall back to heuristics when OpenJev fails', async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const policyText = 'We collect your data and share with service providers.';
      const result = await backend.extract(policyText, 'policy', { url: 'https://example.com/privacy' });

      expect(result.practices).toBeDefined();
      expect(backend.getPolicyEngine().getMode()).toBe('fallback');
    });
  });

  describe('extract() - terms', () => {
    it('should extract terms clauses using TermsExtractionEngine', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
          model: 'openjev-latest',
          answers: {
            arbitration: { type: 'choice', choice: 'present', confidence: 0.9, probabilities: { present: 0.9, absent: 0.1 } },
            'auto-renewal': { type: 'choice', choice: 'absent', confidence: 0.8, probabilities: { present: 0.2, absent: 0.8 } },
            liability: { type: 'choice', choice: 'present', confidence: 0.85, probabilities: { present: 0.85, absent: 0.15 } },
            'content-license': { type: 'choice', choice: 'absent', confidence: 0.7, probabilities: { present: 0.3, absent: 0.7 } },
            termination: { type: 'choice', choice: 'present', confidence: 0.8, probabilities: { present: 0.8, absent: 0.2 } },
            'governing-law': { type: 'choice', choice: 'present', confidence: 0.75, probabilities: { present: 0.75, absent: 0.25 } },
          },
          usage: { input_tokens: 500, output_tokens: 200 },
        }),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const termsText = 'Arbitration clause here. Limitation of liability applies. Terms can be terminated. Governing law is California.';
      const result = await backend.extract(termsText, 'terms', { url: 'https://example.com/terms' });

      expect(result.clauses).toBeDefined();
      expect(result.clauses.length).toBe(4); // arbitration, liability, termination, governing-law
      const clauseTypes = result.clauses.map(c => c.type);
      expect(clauseTypes).toContain('arbitration');
      expect(clauseTypes).toContain('liability');
      expect(clauseTypes).toContain('termination');
      expect(clauseTypes).toContain('governing-law');
      expect(clauseTypes).not.toContain('auto-renewal');
      expect(mockClient.request).toHaveBeenCalled();
    });

    it('should fall back to heuristics when OpenJev fails', async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const termsText = 'Arbitration clause here. Limitation of liability applies.';
      const result = await backend.extract(termsText, 'terms', { url: 'https://example.com/terms' });

      expect(result.clauses).toBeDefined();
      expect(backend.getTermsEngine().getMode()).toBe('fallback');
    });
  });

  describe('reason()', () => {
    it('should reason about mismatch using MismatchReasoningEngine', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
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
        }),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const events = [createOAuthEvent('google', ['drive'])];
      const purpose: Purpose = { inferred: 'productivity', confidence: 0.85 };
      const result = await backend.reason(events, purpose);

      expect(result.mismatch).toBe(false);
      expect(result.userIntentAlignment).toBe('aligned');
      expect(result.riskLevel).toBe('low');
      expect(result.metadata?.relevantCount).toBe(1);
      expect(mockClient.request).toHaveBeenCalled();
    });

    it('should detect mismatch when potentially-excessive', async () => {
      const mockClient = {
        request: vi.fn().mockResolvedValue({
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
        }),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const events = [createBrowserEvent('camera')];
      const purpose: Purpose = { inferred: 'productivity', confidence: 0.85 };
      const result = await backend.reason(events, purpose);

      expect(result.mismatch).toBe(true);
      expect(result.userIntentAlignment).toBe('partial');
      expect(result.riskLevel).toBe('medium');
      expect(result.recommendations).toContain('Review excessive permissions');
    });

    it('should fall back to heuristics when OpenJev fails', async () => {
      const mockClient = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as OpenJevClient;

      const backend = new OpenJevAIBackend(mockClient);
      const events = [createOAuthEvent('google', ['drive'])];
      const purpose: Purpose = { inferred: 'productivity', confidence: 0.85 };
      const result = await backend.reason(events, purpose);

      expect(result.mismatch).toBeDefined();
      expect(backend.getMismatchEngine().getMode()).toBe('fallback');
    });
  });

  describe('initializeOpenJevBackend()', () => {
    it('should create and register backend with API key', () => {
      const backend = initializeOpenJevBackend('test-api-key');
      
      expect(backend).toBeInstanceOf(OpenJevAIBackend);
      expect(backend.getOpenJevClient()).not.toBeNull();
      expect(backend.getMode()).toBe('openjev');
      
      const registered = getAIBackend('openjev');
      expect(registered).toBe(backend);
    });

    it('should use custom base URL when provided', () => {
      const backend = initializeOpenJevBackend('test-api-key', 'https://custom.api.com');
      
      expect(backend).toBeInstanceOf(OpenJevAIBackend);
    });
  });

  describe('getDefaultOpenJevBackend()', () => {
    it('should return fallback backend when no API key', () => {
      const backend = getDefaultOpenJevBackend();
      
      expect(backend).toBeInstanceOf(OpenJevAIBackend);
      expect(backend.getMode()).toBe('fallback');
    });

    it('should return same instance on subsequent calls', () => {
      const backend1 = getDefaultOpenJevBackend();
      const backend2 = getDefaultOpenJevBackend();
      
      expect(backend1).toBe(backend2);
    });
  });

  describe('engine accessors', () => {
    it('should expose policy engine', () => {
      const backend = new OpenJevAIBackend();
      expect(backend.getPolicyEngine()).toBeInstanceOf(Object);
    });

    it('should expose terms engine', () => {
      const backend = new OpenJevAIBackend();
      expect(backend.getTermsEngine()).toBeInstanceOf(Object);
    });

    it('should expose mismatch engine', () => {
      const backend = new OpenJevAIBackend();
      expect(backend.getMismatchEngine()).toBeInstanceOf(Object);
    });
  });
});