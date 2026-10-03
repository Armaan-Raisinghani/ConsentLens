/**
 * Tests for PolicyExtractionEngine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolicyExtractionEngine } from '../../src/ai/policy-extraction.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import type { PolicyExtraction, DataPractice } from '../../src/ai/types.js';

// Mock OpenJevClient
const createMockOpenJevClient = (response: any) => {
  const mockClient = {
    callOpenJev: vi.fn().mockResolvedValue(response),
  } as unknown as OpenJevClient;
  return mockClient;
};

// Sample policy text for testing
const SAMPLE_POLICY_TEXT = `
Privacy Policy for Example.com

Last updated: January 1, 2024

1. Information We Collect
We collect personal information that you provide directly to us, including your name, email address, and payment information. We also automatically collect certain information when you use our services, such as your IP address, browser type, and usage data.

2. How We Use Your Information
We use your information to provide and improve our services, personalize your experience, and communicate with you. We may also use your data for analytics and marketing purposes.

3. Data Sharing
We share your information with third-party service providers who help us operate our services. We may also share data with our business partners and affiliates. We do not sell your personal information to third parties.

4. AI Training
We may use your data to train and improve our artificial intelligence and machine learning models. This helps us provide better recommendations and personalized experiences.

5. Data Retention
We retain your personal data for as long as your account is active or as needed to provide you services. We will retain and use your information to comply with our legal obligations, resolve disputes, and enforce our agreements.

6. Your Rights
You have the right to access, correct, or delete your personal data. You can also object to or restrict processing of your data.
`;

describe('PolicyExtractionEngine', () => {
  describe('with OpenJevClient', () => {
    it('should extract data practices including collection, sharing, and AI training', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          practices: {
            type: 'choice',
            choice: 'collection',
            confidence: 0.85,
            probabilities: { collection: 0.9, sharing: 0.85, selling: 0.1, 'ai-training': 0.88 },
          },
          purposes: {
            type: 'choice',
            choice: 'service-provision',
            confidence: 0.8,
            probabilities: { 'service-provision': 0.9, analytics: 0.75, marketing: 0.6, personalization: 0.7, security: 0.5, legal: 0.6 },
          },
          thirdParties: {
            type: 'choice',
            choice: 'service-providers',
            confidence: 0.75,
            probabilities: { 'service-providers': 0.9, partners: 0.7, affiliates: 0.6, advertisers: 0.2, analytics: 0.8 },
          },
          aiTraining: {
            type: 'noul',
            noul: 0.88,
          },
          retention: {
            type: 'choice',
            choice: 'years',
            confidence: 0.8,
            probabilities: { 'session-only': 0.05, 'days-to-months': 0.1, years: 0.7, indefinite: 0.15 },
          },
        },
        usage: { input_tokens: 500, output_tokens: 200 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PolicyExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      expect(result.practices).toBeDefined();
      expect(result.practices.length).toBeGreaterThan(0);
      
      const categories = result.practices.map(p => p.category);
      expect(categories).toContain('collection');
      expect(categories).toContain('sharing');
      expect(categories).toContain('ai-training');
      expect(categories).not.toContain('selling'); // Low probability

      expect(result.aiTraining).toBe(true);
      expect(result.retention).toBe('Years');
      expect(result.purposes).toContain('service-provision');
      expect(result.purposes).toContain('analytics');
      expect(result.thirdParties).toContain('service-providers');
      expect(result.thirdParties).toContain('partners');
      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(mockClient.callOpenJev).toHaveBeenCalledOnce();
    });

    it('should handle policy without AI training mention', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          practices: {
            type: 'choice',
            choice: 'collection',
            confidence: 0.8,
            probabilities: { collection: 0.85, sharing: 0.7, selling: 0.05, 'ai-training': 0.1 },
          },
          purposes: {
            type: 'choice',
            choice: 'service-provision',
            confidence: 0.75,
            probabilities: { 'service-provision': 0.8, analytics: 0.6, marketing: 0.4, personalization: 0.3, security: 0.5, legal: 0.6 },
          },
          thirdParties: {
            type: 'choice',
            choice: 'service-providers',
            confidence: 0.7,
            probabilities: { 'service-providers': 0.8, partners: 0.4, affiliates: 0.3, advertisers: 0.1, analytics: 0.5 },
          },
          aiTraining: {
            type: 'noul',
            noul: 0.1,
          },
          retention: {
            type: 'choice',
            choice: 'indefinite',
            confidence: 0.7,
            probabilities: { 'session-only': 0.1, 'days-to-months': 0.15, years: 0.2, indefinite: 0.55 },
          },
        },
        usage: { input_tokens: 500, output_tokens: 200 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PolicyExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      expect(result.aiTraining).toBe(false);
      expect(result.retention).toBe('Indefinite / not specified');
    });

    it('should fall back to heuristics when OpenJev fails', async () => {
      const mockClient = createMockOpenJevClient(Promise.reject(new Error('Network error')));
      const engine = new PolicyExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      // Should fall back to heuristic extraction
      expect(result.practices).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(engine.getMode()).toBe('fallback');
    });

    it('should return fallback mode when no OpenJevClient provided', async () => {
      const engine = new PolicyExtractionEngine();

      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      expect(result.practices).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(engine.getMode()).toBe('fallback');
    });

    it('should include proper evidence citations', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          practices: {
            type: 'choice',
            choice: 'collection',
            confidence: 0.85,
            probabilities: { collection: 0.9, sharing: 0.8, selling: 0.1, 'ai-training': 0.2 },
          },
          purposes: {
            type: 'choice',
            choice: 'service-provision',
            confidence: 0.8,
            probabilities: { 'service-provision': 0.85, analytics: 0.6, marketing: 0.3, personalization: 0.2, security: 0.4, legal: 0.5 },
          },
          thirdParties: {
            type: 'choice',
            choice: 'service-providers',
            confidence: 0.75,
            probabilities: { 'service-providers': 0.8, partners: 0.3, affiliates: 0.2, advertisers: 0.1, analytics: 0.4 },
          },
          aiTraining: { type: 'noul', noul: 0.15 },
          retention: { type: 'choice', choice: 'indefinite', confidence: 0.7, probabilities: { indefinite: 0.6 } },
        },
        usage: { input_tokens: 500, output_tokens: 200 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PolicyExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      // Check evidence structure
      expect(result.evidence.some(e => e.source === 'policy')).toBe(true);
      expect(result.evidence.some(e => e.source === 'openjev')).toBe(true);
      expect(result.evidence.every(e => e.confidence >= 0 && e.confidence <= 1)).toBe(true);
      
      // Check practice evidence
      for (const practice of result.practices) {
        expect(practice.evidence).toBeDefined();
        expect(practice.evidence.length).toBeGreaterThan(0);
      }
    });
  });

  describe('fallback heuristics (no OpenJevClient)', () => {
    it('should extract collection practice from policy text', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      const categories = result.practices.map(p => p.category);
      expect(categories).toContain('collection');
    });

    it('should extract sharing practice from policy text', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      const categories = result.practices.map(p => p.category);
      expect(categories).toContain('sharing');
    });

    it('should extract AI training practice from policy text', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      const categories = result.practices.map(p => p.category);
      expect(categories).toContain('ai-training');
      expect(result.aiTraining).toBe(true);
    });

    it('should extract purposes from policy text', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      expect(result.purposes).toContain('improve');
      expect(result.purposes).toContain('personaliz');
      expect(result.purposes).toContain('analytics');
      expect(result.purposes).toContain('marketing');
    });

    it('should extract third parties from policy text', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      // Text has "third-party" (hyphenated) and "partners", "affiliates"
      expect(result.thirdParties).toContain('partner');
      expect(result.thirdParties).toContain('affiliate');
      expect(result.thirdParties).toContain('service provider');
    });

    it('should extract retention from policy text', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      // Text mentions "retain" but no specific time period (day/month/year)
      // Retention may be undefined if no time period is found
      if (result.retention) {
        expect(result.retention).toContain('retain');
      }
    });

    it('should have confidence <= 0.6 for fallback', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract(SAMPLE_POLICY_TEXT, 'https://example.com/privacy');

      // Fallback doesn't return a single confidence, but practices have evidence with confidence
      for (const practice of result.practices) {
        for (const ev of practice.evidence) {
          expect(ev.confidence).toBeLessThanOrEqual(0.6);
        }
      }
    });

    it('should handle empty/short policy text', async () => {
      const engine = new PolicyExtractionEngine();
      const result = await engine.extract('Short policy.', 'https://example.com/privacy');

      expect(result.practices).toBeDefined();
      expect(result.purposes).toBeDefined();
      expect(result.thirdParties).toBeDefined();
      expect(result.evidence).toBeDefined();
    });
  });
});