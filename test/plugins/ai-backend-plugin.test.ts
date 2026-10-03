/**
 * AI Backend Plugin Tests - per PLUGIN-04
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PageContext } from '../../src/shared/errors.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { Purpose } from '../../src/ir/purpose.js';
import {
  registerAIBackend,
  unregisterAIBackend,
  getAIBackend,
  getAllAIBackends,
  clearAIBackends,
  getDefaultAIBackend,
  AIBackend,
  Classification,
  ExtractedData,
  ReasoningResult,
} from '../../src/plugins/ai-backend-plugin.js';

describe('AI Backend Plugin', () => {
  beforeEach(() => {
    clearAIBackends();
    vi.clearAllMocks();
  });

  const mockContext: PageContext = {
    document: {} as Document,
    url: 'https://example.com',
    origin: 'https://example.com',
  };

  const mockEvents: ConsentEvent[] = [
    {
      website: 'https://example.com',
      consentType: 'oauth' as any,
      capability: { type: 'oauth', provider: 'google', scope: ['drive.read'] },
      timestamp: new Date().toISOString(),
      grantStatus: 'pending' as any,
      evidence: [],
    },
  ];

  const mockPurpose: Purpose = {
    inferred: 'Access Google Drive files',
    stated: 'Read your files',
    userIntent: 'User wants to backup photos',
    confidence: 0.8,
  };

  describe('registerAIBackend', () => {
    it('should register an AI backend', () => {
      const backend: AIBackend = {
        classify: vi.fn().mockResolvedValue([{ decision: 'allow', confidence: 0.9, reasoning: 'Test' }]),
        extract: vi.fn().mockResolvedValue({ practices: [] }),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0.9 }),
      };

      registerAIBackend('test-backend', backend);
      expect(getAIBackend('test-backend')).toBe(backend);
    });

    it('should throw if backend name already exists', () => {
      const backend1: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      const backend2: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      registerAIBackend('duplicate', backend1);
      expect(() => registerAIBackend('duplicate', backend2)).toThrow("AI backend 'duplicate' already registered");
    });
  });

  describe('unregisterAIBackend', () => {
    it('should remove a registered backend', () => {
      const backend: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      registerAIBackend('to-remove', backend);
      expect(unregisterAIBackend('to-remove')).toBe(true);
      expect(getAIBackend('to-remove')).toBeUndefined();
    });

    it('should return false for non-existent backend', () => {
      expect(unregisterAIBackend('non-existent')).toBe(false);
    });
  });

  describe('getAllAIBackends', () => {
    it('should return all registered backends', () => {
      const backend1: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      const backend2: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      registerAIBackend('backend-1', backend1);
      registerAIBackend('backend-2', backend2);
      
      const all = getAllAIBackends();
      expect(all).toHaveLength(2);
      expect(all).toContain(backend1);
      expect(all).toContain(backend2);
    });

    it('should return empty array when no backends registered', () => {
      expect(getAllAIBackends()).toHaveLength(0);
    });
  });

  describe('clearAIBackends', () => {
    it('should remove all backends', () => {
      const backend: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      registerAIBackend('test-1', backend);
      registerAIBackend('test-2', backend);
      
      clearAIBackends();
      expect(getAllAIBackends()).toHaveLength(0);
    });
  });

  describe('getDefaultAIBackend', () => {
    it('should return first registered backend', () => {
      const backend1: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      const backend2: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };
      
      registerAIBackend('backend-1', backend1);
      registerAIBackend('backend-2', backend2);
      
      expect(getDefaultAIBackend()).toBe(backend1);
    });

    it('should return undefined if no backends registered', () => {
      expect(getDefaultAIBackend()).toBeUndefined();
    });
  });

  describe('AIBackend interface', () => {
    it('should require classify method', async () => {
      const backend: AIBackend = {
        classify: vi.fn().mockResolvedValue([
          { decision: 'allow', confidence: 0.9, reasoning: 'Test reasoning', excessiveness: 'none', purposeMatch: true },
        ]),
        extract: vi.fn().mockResolvedValue({ practices: [] }),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0.9 }),
      };

      const results = await backend.classify(mockEvents);
      expect(results).toHaveLength(1);
      expect(results[0].decision).toBe('allow');
      expect(results[0].confidence).toBe(0.9);
    });

    it('should require extract method', async () => {
      const backend: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({
          practices: [{ type: 'data-collection', text: 'collects data', confidence: 0.9 }],
        }),
        reason: vi.fn().mockResolvedValue({ mismatch: false, riskLevel: 'none', recommendations: [], confidence: 0 }),
      };

      const result = await backend.extract('privacy policy text', 'policy', mockContext);
      expect(result.practices).toHaveLength(1);
      expect(result.practices![0].type).toBe('data-collection');
    });

    it('should require reason method', async () => {
      const backend: AIBackend = {
        classify: vi.fn().mockResolvedValue([]),
        extract: vi.fn().mockResolvedValue({}),
        reason: vi.fn().mockResolvedValue({
          mismatch: true,
          mismatchDetails: 'Purpose does not match access',
          userIntentAlignment: 'misaligned',
          riskLevel: 'high',
          recommendations: ['Request narrower scope'],
          confidence: 0.85,
        }),
      };

      const result = await backend.reason(mockEvents, mockPurpose);
      expect(result.mismatch).toBe(true);
      expect(result.riskLevel).toBe('high');
    });
  });

  describe('Classification type', () => {
    it('should have all required fields', () => {
      const classification: Classification = {
        decision: 'allow',
        confidence: 0.9,
        reasoning: 'User consented to this scope',
        excessiveness: 'none',
        purposeMatch: true,
        metadata: { model: 'test-model' },
      };
      
      expect(classification.decision).toBe('allow');
      expect(classification.confidence).toBe(0.9);
      expect(classification.reasoning).toBe('User consented to this scope');
      expect(classification.excessiveness).toBe('none');
      expect(classification.purposeMatch).toBe(true);
      expect(classification.metadata).toEqual({ model: 'test-model' });
    });

    it('should allow all decision values', () => {
      const allow: Classification = { decision: 'allow', confidence: 0.9, reasoning: '' };
      const ask: Classification = { decision: 'ask', confidence: 0.5, reasoning: '' };
      const deny: Classification = { decision: 'deny', confidence: 0.9, reasoning: '' };
      
      expect(allow.decision).toBe('allow');
      expect(ask.decision).toBe('ask');
      expect(deny.decision).toBe('deny');
    });
  });

  describe('ExtractedData type', () => {
    it('should support practices, clauses, and purposes', () => {
      const data: ExtractedData = {
        practices: [
          { type: 'data-collection', text: 'collects data', confidence: 0.9 },
        ],
        clauses: [
          { type: 'arbitration', text: 'binding arbitration', severity: 'high', confidence: 0.95 },
        ],
        purposes: [
          { stated: 'Analytics', inferred: 'Tracking', confidence: 0.8 },
        ],
        metadata: { source: 'policy-page' },
      };
      
      expect(data.practices).toHaveLength(1);
      expect(data.clauses).toHaveLength(1);
      expect(data.purposes).toHaveLength(1);
    });
  });

  describe('ReasoningResult type', () => {
    it('should have all required fields', () => {
      const result: ReasoningResult = {
        mismatch: true,
        mismatchDetails: 'Excessive data collection',
        userIntentAlignment: 'misaligned',
        riskLevel: 'high',
        recommendations: ['Reduce scope', 'Add purpose limitation'],
        confidence: 0.85,
        metadata: { model: 'gpt-4' },
      };
      
      expect(result.mismatch).toBe(true);
      expect(result.mismatchDetails).toBe('Excessive data collection');
      expect(result.userIntentAlignment).toBe('misaligned');
      expect(result.riskLevel).toBe('high');
      expect(result.recommendations).toHaveLength(2);
      expect(result.confidence).toBe(0.85);
    });

    it('should allow all risk levels', () => {
      const levels: ReasoningResult['riskLevel'][] = ['none', 'low', 'medium', 'high', 'critical'];
      for (const level of levels) {
        const result: ReasoningResult = {
          mismatch: false,
          riskLevel: level,
          recommendations: [],
          confidence: 0.9,
        };
        expect(result.riskLevel).toBe(level);
      }
    });

    it('should allow all alignment values', () => {
      const alignments: ReasoningResult['userIntentAlignment'][] = ['aligned', 'partial', 'misaligned'];
      for (const alignment of alignments) {
        const result: ReasoningResult = {
          mismatch: false,
          riskLevel: 'none',
          recommendations: [],
          confidence: 0.9,
          userIntentAlignment: alignment,
        };
        expect(result.userIntentAlignment).toBe(alignment);
      }
    });
  });
});