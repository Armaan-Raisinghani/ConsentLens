/**
 * Policy Extractor Plugin Tests - per PLUGIN-03
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PageContext } from '../../src/shared/errors.js';
import {
  registerPolicyExtractor,
  unregisterPolicyExtractor,
  getPolicyExtractor,
  getAllPolicyExtractors,
  clearPolicyExtractors,
  extractPolicyPractices,
  PolicyPractice,
  ExtractedPolicyPractice,
} from '../../src/plugins/policy-extractor-plugin.js';

describe('Policy Extractor Plugin', () => {
  beforeEach(() => {
    clearPolicyExtractors();
    clearPolicyExtractors();
    vi.clearAllMocks();
  });

  const mockContext: PageContext = {
    document: {} as Document,
    url: 'https://example.com/privacy',
    origin: 'https://example.com',
  };

  const mockPolicyText = `
    We collect personal information including your name, email, and usage data.
    We share your data with third-party service providers for analytics.
    We do not sell your personal information.
    We use your data to train our AI models.
    We retain your data for 2 years after account closure.
  `;

  describe('registerPolicyExtractor', () => {
    it('should register a policy extractor function', () => {
      const extractorFn = vi.fn((text: string, url: string) => [
        { practice: PolicyPractice.DataCollection, text: 'collects personal info', confidence: 0.9, source: 'test-extractor' },
      ]);

      registerPolicyExtractor('test-extractor', extractorFn);
      expect(getPolicyExtractor('test-extractor')).toBe(extractorFn);
    });

    it('should throw if extractor name already exists', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      
      registerPolicyExtractor('duplicate', fn1);
      expect(() => registerPolicyExtractor('duplicate', fn2)).toThrow("Policy extractor 'duplicate' already registered");
    });
  });

  describe('unregisterPolicyExtractor', () => {
    it('should remove a registered extractor', () => {
      const fn = vi.fn();
      registerPolicyExtractor('to-remove', fn);
      expect(unregisterPolicyExtractor('to-remove')).toBe(true);
      expect(getPolicyExtractor('to-remove')).toBeUndefined();
    });

    it('should return false for non-existent extractor', () => {
      expect(unregisterPolicyExtractor('non-existent')).toBe(false);
    });
  });

  describe('getAllPolicyExtractors', () => {
    it('should return all registered extractors', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      
      registerPolicyExtractor('extractor-1', fn1);
      registerPolicyExtractor('extractor-2', fn2);
      
      const all = getAllPolicyExtractors();
      expect(all).toHaveLength(2);
      expect(all).toContain(fn1);
      expect(all).toContain(fn2);
    });

    it('should return empty array when no extractors registered', () => {
      expect(getAllPolicyExtractors()).toHaveLength(0);
    });
  });

  describe('clearPolicyExtractors', () => {
    it('should remove all extractors', () => {
      registerPolicyExtractor('test-1', vi.fn());
      registerPolicyExtractor('test-2', vi.fn());
      
      clearPolicyExtractors();
      expect(getAllPolicyExtractors()).toHaveLength(0);
    });
  });

  describe('extractPolicyPractices', () => {
    it('should combine results from all extractors', () => {
      const fn1 = vi.fn((text: string) => [
        { practice: PolicyPractice.DataCollection, text: 'collects data', confidence: 0.9, source: 'fn1' },
      ]);
      
      const fn2 = vi.fn((text: string) => [
        { practice: PolicyPractice.DataSharing, text: 'shares data', confidence: 0.8, source: 'fn2' },
      ]);

      registerPolicyExtractor('fn1', fn1);
      registerPolicyExtractor('fn2', fn2);

      const results = extractPolicyPractices(mockPolicyText, 'https://example.com/privacy', mockContext);
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.practice)).toContain(PolicyPractice.DataCollection);
      expect(results.map(r => r.practice)).toContain(PolicyPractice.DataSharing);
    });

    it('should deduplicate practices with same text', () => {
      const fn1 = vi.fn((text: string) => [
        { practice: PolicyPractice.DataCollection, text: 'we collect data', confidence: 0.9, source: 'fn1' },
      ]);
      
      const fn2 = vi.fn((text: string) => [
        { practice: PolicyPractice.DataCollection, text: 'we collect data', confidence: 0.8, source: 'fn2' },
      ]);

      registerPolicyExtractor('fn1', fn1);
      registerPolicyExtractor('fn2', fn2);

      const results = extractPolicyPractices(mockPolicyText, 'https://example.com/privacy', mockContext);
      
      // Should only have one result since text is the same
      expect(results).toHaveLength(1);
      expect(results[0].source).toBe('fn1'); // First one wins
    });

    it('should return empty array if no extractors registered', () => {
      const results = extractPolicyPractices(mockPolicyText, 'https://example.com/privacy', mockContext);
      expect(results).toHaveLength(0);
    });

    it('should pass context to extractors', () => {
      const fn = vi.fn((text: string, url: string, context: PageContext) => {
        expect(context).toBe(mockContext);
        return [];
      });

      registerPolicyExtractor('context-test', fn);
      extractPolicyPractices(mockPolicyText, 'https://example.com/privacy', mockContext);
      expect(fn).toHaveBeenCalledWith(mockPolicyText, 'https://example.com/privacy', mockContext);
    });
  });

  describe('PolicyPractice enum', () => {
    it('should have all expected practices', () => {
      expect(PolicyPractice.DataCollection).toBe('data-collection');
      expect(PolicyPractice.DataSharing).toBe('data-sharing');
      expect(PolicyPractice.DataSelling).toBe('data-selling');
      expect(PolicyPractice.AiTraining).toBe('ai-training');
      expect(PolicyPractice.Retention).toBe('retention');
      expect(PolicyPractice.ThirdParties).toBe('third-parties');
      expect(PolicyPractice.UserRights).toBe('user-rights');
      expect(PolicyPractice.Security).toBe('security');
      expect(PolicyPractice.InternationalTransfer).toBe('international-transfer');
      expect(PolicyPractice.AutomatedDecision).toBe('automated-decision');
      expect(PolicyPractice.Cookies).toBe('cookies');
      expect(PolicyPractice.Marketing).toBe('marketing');
      expect(PolicyPractice.Analytics).toBe('analytics');
      expect(PolicyPractice.Personalization).toBe('personalization');
      expect(PolicyPractice.Unknown).toBe('unknown');
    });
  });

  describe('ExtractedPolicyPractice type', () => {
    it('should allow optional severity and metadata', () => {
      const practice: ExtractedPolicyPractice = {
        practice: PolicyPractice.DataCollection,
        text: 'collects personal info',
        confidence: 0.9,
        source: 'test',
        severity: 'high',
        metadata: { customField: 'value' },
      };
      
      expect(practice.severity).toBe('high');
      expect(practice.metadata).toEqual({ customField: 'value' });
    });

    it('should work without optional fields', () => {
      const practice: ExtractedPolicyPractice = {
        practice: PolicyPractice.DataCollection,
        text: 'collects personal info',
        confidence: 0.9,
        source: 'test',
      };
      
      expect(practice.severity).toBeUndefined();
      expect(practice.metadata).toBeUndefined();
    });
  });
});