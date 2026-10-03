/**
 * Tests for TermsExtractionEngine
 */

import { describe, it, expect, vi } from 'vitest';
import { TermsExtractionEngine } from '../../src/ai/terms-extraction.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import type { TermsExtraction, TermsClause } from '../../src/ai/types.js';

// Mock OpenJevClient
const createMockOpenJevClient = (response: any) => {
  const mockClient = {
    callOpenJev: vi.fn().mockResolvedValue(response),
  } as unknown as OpenJevClient;
  return mockClient;
};

// Sample terms text for testing
const SAMPLE_TERMS_TEXT = `
Terms of Service for Example.com

Last updated: January 1, 2024

1. Acceptance of Terms
By accessing or using our services, you agree to be bound by these Terms of Service.

2. Arbitration Agreement
Any dispute arising out of or relating to these Terms shall be resolved through binding arbitration administered by the American Arbitration Association. You waive your right to a court trial and class action lawsuit.

3. Auto-Renewal
Your subscription will automatically renew at the end of each billing period unless you cancel at least 30 days before the renewal date. You authorize us to charge your payment method for the renewal.

4. Limitation of Liability
In no event shall Example.com be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability shall not exceed the amount you paid in the last 12 months.

5. Content License
You grant Example.com a worldwide, perpetual, royalty-free, sublicensable license to use, reproduce, modify, and distribute any content you submit through our services.

6. Termination
We may terminate or suspend your account immediately, without prior notice, for any reason including breach of these Terms. Upon termination, your right to use the services will immediately cease.

7. Governing Law
These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts located in San Francisco County, California.

8. Indemnification
You agree to indemnify and hold harmless Example.com from any claims arising from your use of the services.

9. Warranty Disclaimer
The services are provided "as is" without warranties of any kind, either express or implied.
`;

describe('TermsExtractionEngine', () => {
  describe('with OpenJevClient', () => {
    it('should extract arbitration clause with high severity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          arbitration: {
            type: 'choice',
            choice: 'present',
            confidence: 0.92,
            probabilities: { present: 0.92, absent: 0.08 },
          },
          'auto-renewal': {
            type: 'choice',
            choice: 'present',
            confidence: 0.88,
            probabilities: { present: 0.88, absent: 0.12 },
          },
          liability: {
            type: 'choice',
            choice: 'present',
            confidence: 0.85,
            probabilities: { present: 0.85, absent: 0.15 },
          },
          'content-license': {
            type: 'choice',
            choice: 'present',
            confidence: 0.9,
            probabilities: { present: 0.9, absent: 0.1 },
          },
          termination: {
            type: 'choice',
            choice: 'present',
            confidence: 0.82,
            probabilities: { present: 0.82, absent: 0.18 },
          },
          'governing-law': {
            type: 'choice',
            choice: 'present',
            confidence: 0.8,
            probabilities: { present: 0.8, absent: 0.2 },
          },
        },
        usage: { input_tokens: 500, output_tokens: 200 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new TermsExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      expect(result.clauses).toBeDefined();
      expect(result.clauses.length).toBe(6);

      const clauseTypes = result.clauses.map(c => c.type);
      expect(clauseTypes).toContain('arbitration');
      expect(clauseTypes).toContain('auto-renewal');
      expect(clauseTypes).toContain('liability');
      expect(clauseTypes).toContain('content-license');
      expect(clauseTypes).toContain('termination');
      expect(clauseTypes).toContain('governing-law');

      // Check severity mapping
      const arbitrationClause = result.clauses.find(c => c.type === 'arbitration');
      expect(arbitrationClause?.severity).toBe('high');

      const contentLicenseClause = result.clauses.find(c => c.type === 'content-license');
      expect(contentLicenseClause?.severity).toBe('high');

      const autoRenewalClause = result.clauses.find(c => c.type === 'auto-renewal');
      expect(autoRenewalClause?.severity).toBe('medium');

      const liabilityClause = result.clauses.find(c => c.type === 'liability');
      expect(liabilityClause?.severity).toBe('medium');

      const terminationClause = result.clauses.find(c => c.type === 'termination');
      expect(terminationClause?.severity).toBe('medium');

      const governingLawClause = result.clauses.find(c => c.type === 'governing-law');
      expect(governingLawClause?.severity).toBe('low');

      // Check evidence
      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(mockClient.callOpenJev).toHaveBeenCalledOnce();
    });

    it('should handle terms with only some clauses present', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          arbitration: { type: 'choice', choice: 'absent', confidence: 0.8, probabilities: { present: 0.2, absent: 0.8 } },
          'auto-renewal': { type: 'choice', choice: 'present', confidence: 0.85, probabilities: { present: 0.85, absent: 0.15 } },
          liability: { type: 'choice', choice: 'present', confidence: 0.8, probabilities: { present: 0.8, absent: 0.2 } },
          'content-license': { type: 'choice', choice: 'absent', confidence: 0.75, probabilities: { present: 0.25, absent: 0.75 } },
          termination: { type: 'choice', choice: 'present', confidence: 0.78, probabilities: { present: 0.78, absent: 0.22 } },
          'governing-law': { type: 'choice', choice: 'absent', confidence: 0.7, probabilities: { present: 0.3, absent: 0.7 } },
        },
        usage: { input_tokens: 500, output_tokens: 200 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new TermsExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      expect(result.clauses.length).toBe(3);
      const clauseTypes = result.clauses.map(c => c.type);
      expect(clauseTypes).toContain('auto-renewal');
      expect(clauseTypes).toContain('liability');
      expect(clauseTypes).toContain('termination');
      expect(clauseTypes).not.toContain('arbitration');
      expect(clauseTypes).not.toContain('content-license');
      expect(clauseTypes).not.toContain('governing-law');
    });

    it('should fall back to heuristics when OpenJev fails', async () => {
      const mockClient = createMockOpenJevClient(Promise.reject(new Error('Network error')));
      const engine = new TermsExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      expect(result.clauses).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(engine.getMode()).toBe('fallback');
    });

    it('should return fallback mode when no OpenJevClient provided', async () => {
      const engine = new TermsExtractionEngine();

      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      expect(result.clauses).toBeDefined();
      expect(engine.getMode()).toBe('fallback');
    });

    it('should include proper evidence citations', async () => {
      const mockResponse = {
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
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new TermsExtractionEngine(mockClient);

      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      // Check evidence structure
      expect(result.evidence.some(e => e.source === 'terms')).toBe(true);
      expect(result.evidence.some(e => e.source === 'openjev')).toBe(true);
      expect(result.evidence.every(e => e.confidence >= 0 && e.confidence <= 1)).toBe(true);

      // Check clause evidence
      for (const clause of result.clauses) {
        expect(clause.evidence).toBeDefined();
        expect(clause.evidence.length).toBeGreaterThan(0);
        expect(clause.evidence.some(e => e.source === 'terms')).toBe(true);
        expect(clause.evidence.some(e => e.source === 'openjev')).toBe(true);
      }
    });
  });

  describe('fallback heuristics (no OpenJevClient)', () => {
    it('should extract arbitration clause with high severity', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      const arbitrationClause = result.clauses.find(c => c.type === 'arbitration');
      expect(arbitrationClause).toBeDefined();
      expect(arbitrationClause?.severity).toBe('high');
      expect(arbitrationClause?.text).toContain('arbitration');
    });

    it('should extract auto-renewal clause with medium severity', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      const autoRenewalClause = result.clauses.find(c => c.type === 'auto-renewal');
      expect(autoRenewalClause).toBeDefined();
      expect(autoRenewalClause?.severity).toBe('medium');
      expect(autoRenewalClause?.text.toLowerCase()).toContain('auto-renew');
    });

    it('should extract liability clause with medium severity', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      const liabilityClause = result.clauses.find(c => c.type === 'liability');
      expect(liabilityClause).toBeDefined();
      expect(liabilityClause?.severity).toBe('medium');
      expect(liabilityClause?.text.toLowerCase()).toContain('liability');
    });

    it('should extract content-license clause with high severity', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      const contentLicenseClause = result.clauses.find(c => c.type === 'content-license');
      expect(contentLicenseClause).toBeDefined();
      expect(contentLicenseClause?.severity).toBe('high');
      expect(contentLicenseClause?.text.toLowerCase()).toContain('license');
    });

    it('should extract termination clause with medium severity', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      const terminationClause = result.clauses.find(c => c.type === 'termination');
      expect(terminationClause).toBeDefined();
      expect(terminationClause?.severity).toBe('medium');
      expect(terminationClause?.text.toLowerCase()).toContain('terminat');
    });

    it('should extract governing-law clause with low severity', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      const governingLawClause = result.clauses.find(c => c.type === 'governing-law');
      expect(governingLawClause).toBeDefined();
      expect(governingLawClause?.severity).toBe('low');
      expect(governingLawClause?.text.toLowerCase()).toContain('governing law');
    });

    it('should have confidence <= 0.6 for fallback', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract(SAMPLE_TERMS_TEXT, 'https://example.com/terms');

      for (const clause of result.clauses) {
        for (const ev of clause.evidence) {
          expect(ev.confidence).toBeLessThanOrEqual(0.6);
        }
      }
    });

    it('should handle empty/short terms text', async () => {
      const engine = new TermsExtractionEngine();
      const result = await engine.extract('Short terms.', 'https://example.com/terms');

      expect(result.clauses).toBeDefined();
      expect(result.evidence).toBeDefined();
    });
  });
});