/**
 * Backend adapter tests - verifies OpenJevAIBackend integrates with Phase 1 AI backend plugin interface
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsentEvent, createOAuthConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthCapability } from '../../src/ir/capability.js';
import { createEvidence } from '../../src/ir/evidence.js';
import { EvidenceSource, ExtractionMethod } from '../../src/shared/types.js';
import { OpenJevAIBackend, initializeOpenJevBackend, getDefaultOpenJevBackend } from '../../src/ai/backend-adapter.js';
import { registerAIBackend, getAIBackend, clearAIBackends } from '../../src/plugins/ai-backend-plugin.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { AIBackend, Classification, ExtractedData, ReasoningResult } from '../../src/plugins/ai-backend-plugin.js';
import type { Purpose } from '../../src/ir/purpose.js';
import type { Mock } from 'vitest';

const originalFetch = global.fetch;

describe('OpenJevAIBackend - Plugin Interface Integration (PLUGIN-04)', () => {
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn() as Mock;
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
    clearAIBackends();
  });

  const createTestEvent = (provider: string = 'google', scope: string[] = ['drive.read']): ConsentEvent => {
    const capability = createOAuthCapability(provider, scope);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: `button[data-provider="${provider}"]`,
      text: `Continue with ${provider}`,
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });
    return createOAuthConsentEvent({
      website: 'https://example.com',
      provider,
      scope,
      evidence: [evidence],
    });
  };

  it('registerAIBackend("openjev", ...) is called on module load', async () => {
    // Import should have registered the default backend (in fallback mode)
    const backend = getAIBackend('openjev');
    expect(backend).toBeDefined();
    expect(backend).toBeInstanceOf(OpenJevAIBackend);
    expect((backend as OpenJevAIBackend).getMode()).toBe('fallback');
  });

  it('classify() delegates to OpenJevClient.classifyBatch when client provided', async () => {
    const client = new OpenJevClient({ apiKey: 'test-key' });
    const backend = new OpenJevAIBackend(client);

    const events = [createTestEvent()];

    const mockResponse = {
      model: 'openjev-latest',
      answers: {
        event_0_decision: { type: 'noul', noul: 0.85 },
        event_0_excessiveness: {
          type: 'choice',
          choice: 'appropriate',
          probabilities: { excessive: 0.1, appropriate: 0.8, minimal: 0.1 },
          confidence: 0.9,
        },
        event_0_purpose_match: {
          type: 'choice',
          choice: 'relevant',
          probabilities: { relevant: 0.7, unclear: 0.2, unrelated: 0.1 },
          confidence: 0.85,
        },
        event_0_sensitivity: {
          type: 'score',
          score: 2,
          legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
          probabilities: { '0': 0.05, '1': 0.15, '2': 0.8 },
          confidence: 0.88,
        },
      },
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await backend.classify(events);

    expect(results).toHaveLength(1);
    expect(results[0]!.decision).toBe('allow');
    expect(results[0]!.excessiveness).toBe('moderate'); // appropriate -> moderate
    expect(results[0]!.purposeMatch).toBe(true); // relevant -> true
    expect(results[0]!.reasoning).toBeDefined();
  });

  it('classify() uses fallback when OpenJevClient not provided', async () => {
    const backend = new OpenJevAIBackend(); // No client = fallback mode

    const events = [createTestEvent()];

    const results = await backend.classify(events);

    expect(results).toHaveLength(1);
    expect(results[0]!.decision).toBeDefined();
    expect(results[0]!.reasoning).toBeDefined();
  });

  it('classify() falls back to heuristics when OpenJevClient throws', async () => {
    const client = new OpenJevClient({ apiKey: 'test-key' });
    const backend = new OpenJevAIBackend(client);

    const events = [createTestEvent()];

    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const results = await backend.classify(events);

    // Should fall back and return results
    expect(results).toHaveLength(1);
    expect(results[0]!.decision).toBeDefined();
  });

  it('extract() returns valid ExtractedData for policy', async () => {
    const backend = new OpenJevAIBackend();

    const result = await backend.extract('Sample policy text with data collection and sharing practices.', 'policy');

    expect(result).toBeDefined();
    expect(result.practices).toBeDefined();
    expect(Array.isArray(result.practices)).toBe(true);
    expect(result.purposes).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata!['thirdParties']).toBeDefined();
  });

  it('extract() returns valid ExtractedData for terms', async () => {
    const backend = new OpenJevAIBackend();

    const result = await backend.extract('Sample terms with arbitration clause and auto-renewal.', 'terms');

    expect(result).toBeDefined();
    expect(result.clauses).toBeDefined();
    expect(Array.isArray(result.clauses)).toBe(true);
    expect(result.metadata).toBeDefined();
  });

  it('reason() returns valid ReasoningResult', async () => {
    const backend = new OpenJevAIBackend();

    const events = [createTestEvent()];
    const purpose: Purpose = { inferred: 'productivity', confidence: 0.8 };

    const result = await backend.reason(events, purpose);

    expect(result).toBeDefined();
    expect(typeof result.mismatch).toBe('boolean');
    expect(typeof result.confidence).toBe('number');
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.metadata).toBeDefined();
  });

  it('getMode() returns "fallback" when no OpenJevClient', () => {
    const backend = new OpenJevAIBackend();
    expect(backend.getMode()).toBe('fallback');
  });

  it('getMode() returns "openjev" when OpenJevClient provided', () => {
    const client = new OpenJevClient({ apiKey: 'test-key' });
    const backend = new OpenJevAIBackend(client);
    expect(backend.getMode()).toBe('openjev');
  });

  it('initializeOpenJevBackend registers backend with API key', () => {
    clearAIBackends();
    const backend = initializeOpenJevBackend('test-api-key');
    
    expect(backend).toBeInstanceOf(OpenJevAIBackend);
    expect(backend.getMode()).toBe('openjev');
    
    const registered = getAIBackend('openjev');
    expect(registered).toBe(backend);
  });

  it('custom backend can be registered and used instead', () => {
    clearAIBackends();

    const mockReasoning: ReasoningResult = {
      mismatch: false,
      confidence: 1,
      recommendations: [],
      metadata: {},
      userIntentAlignment: 'aligned',
      riskLevel: 'none',
    };

    const mockBackend: AIBackend = {
      async classify() {
        return [{ decision: 'allow', excessiveness: 'none', purposeMatch: true, reasoning: 'mock' }];
      },
      async extract() {
        return { practices: [], purposes: [], metadata: {} };
      },
      async reason() {
        return mockReasoning;
      },
    };

    registerAIBackend('test-backend', mockBackend);
    const retrieved = getAIBackend('test-backend');
    expect(retrieved).toBe(mockBackend);

    // Re-initialize openjev backend (it was cleared by clearAIBackends)
    const openjevBackend = getDefaultOpenJevBackend();
    expect(openjevBackend).toBeDefined();
    expect(openjevBackend).not.toBe(mockBackend);
    expect(getAIBackend('openjev')).toBe(openjevBackend);
  });

  it('multiple backends can be registered and selected', () => {
    clearAIBackends();

    const mockReasoning: ReasoningResult = {
      mismatch: false,
      confidence: 0,
      recommendations: [],
      metadata: {},
      userIntentAlignment: 'aligned',
      riskLevel: 'none',
    };

    const backend1: AIBackend = {
      async classify() { return []; },
      async extract() { return { practices: [], purposes: [], metadata: {} }; },
      async reason() { return mockReasoning; },
    };
    const backend2: AIBackend = {
      async classify() { return []; },
      async extract() { return { practices: [], purposes: [], metadata: {} }; },
      async reason() { return mockReasoning; },
    };

    registerAIBackend('backend-1', backend1);
    registerAIBackend('backend-2', backend2);

    expect(getAIBackend('backend-1')).toBe(backend1);
    expect(getAIBackend('backend-2')).toBe(backend2);
  });
});