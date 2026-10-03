/**
 * Batch classification tests for OpenJevClient (OPENJEV-05)
 * Verifies classifyBatch makes single API call and returns 12 classifications (4 per event) for 3 events
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOAuthConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthCapability } from '../../src/ir/capability.js';
import { createEvidence } from '../../src/ir/evidence.js';
import { EvidenceSource, ExtractionMethod } from '../../src/shared/types.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { Mock } from 'vitest';

const originalFetch = global.fetch;

describe('OpenJevClient - Batch Classification (OPENJEV-05)', () => {
  let client: OpenJevClient;
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn() as Mock;
    global.fetch = mockFetch;
    client = new OpenJevClient({ apiKey: 'test-api-key' });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });

  const createTestEvent = (provider: string, scope: string[]): ConsentEvent => {
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

  it('classifyBatch(3 events) makes single API call, returns 12 classifications in correct order', async () => {
    const events = [
      createTestEvent('google', ['drive.read']),
      createTestEvent('github', ['repo']),
      createTestEvent('microsoft', ['files.read']),
    ];

    // Mock response with 12 answers (3 events × 4 questions)
    const mockResponse = {
      model: 'openjev-latest',
      answers: {
        // Event 0 (google)
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
        // Event 1 (github)
        event_1_decision: { type: 'noul', noul: 0.6 },
        event_1_excessiveness: {
          type: 'choice',
          choice: 'minimal',
          probabilities: { excessive: 0.05, appropriate: 0.2, minimal: 0.75 },
          confidence: 0.8,
        },
        event_1_purpose_match: {
          type: 'choice',
          choice: 'unclear',
          probabilities: { relevant: 0.3, unclear: 0.5, unrelated: 0.2 },
          confidence: 0.7,
        },
        event_1_sensitivity: {
          type: 'score',
          score: 1,
          legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
          probabilities: { '0': 0.2, '1': 0.6, '2': 0.2 },
          confidence: 0.75,
        },
        // Event 2 (microsoft)
        event_2_decision: { type: 'noul', noul: 0.4 },
        event_2_excessiveness: {
          type: 'choice',
          choice: 'excessive',
          probabilities: { excessive: 0.6, appropriate: 0.3, minimal: 0.1 },
          confidence: 0.85,
        },
        event_2_purpose_match: {
          type: 'choice',
          choice: 'unrelated',
          probabilities: { relevant: 0.1, unclear: 0.2, unrelated: 0.7 },
          confidence: 0.9,
        },
        event_2_sensitivity: {
          type: 'score',
          score: 0,
          legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
          probabilities: { '0': 0.8, '1': 0.15, '2': 0.05 },
          confidence: 0.95,
        },
      },
      usage: { input_tokens: 500, output_tokens: 200 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await client.classifyBatch(events);

    // Verify single API call
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify 3 results returned
    expect(results).toHaveLength(3);

    // Verify Event 0 (google) - allow, appropriate, relevant, high
    expect(results[0]!.decision).toBe('allow');
    expect(results[0]!.decisionConfidence).toBe(0.85);
    expect(results[0]!.excessiveness).toBe('appropriate');
    expect(results[0]!.excessivenessConfidence).toBe(0.9);
    expect(results[0]!.purposeMatch).toBe('relevant');
    expect(results[0]!.purposeMatchConfidence).toBe(0.85);
    expect(results[0]!.sensitivity).toBe('high');
    expect(results[0]!.sensitivityScore).toBe(2);

    // Verify Event 1 (github) - allow, minimal, unclear, medium
    expect(results[1]!.decision).toBe('allow');
    expect(results[1]!.decisionConfidence).toBe(0.6);
    expect(results[1]!.excessiveness).toBe('minimal');
    expect(results[1]!.excessivenessConfidence).toBe(0.8);
    expect(results[1]!.purposeMatch).toBe('unclear');
    expect(results[1]!.purposeMatchConfidence).toBe(0.7);
    expect(results[1]!.sensitivity).toBe('medium');
    expect(results[1]!.sensitivityScore).toBe(1);

    // Verify Event 2 (microsoft) - deny, excessive, unrelated, low
    expect(results[2]!.decision).toBe('deny');
    expect(results[2]!.decisionConfidence).toBe(0.4);
    expect(results[2]!.excessiveness).toBe('excessive');
    expect(results[2]!.excessivenessConfidence).toBe(0.85);
    expect(results[2]!.purposeMatch).toBe('unrelated');
    expect(results[2]!.purposeMatchConfidence).toBe(0.9);
    expect(results[2]!.sensitivity).toBe('low');
    expect(results[2]!.sensitivityScore).toBe(0);

    // Verify all have evidence
    results.forEach((result) => {
      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence[0]!.source).toBe('openjev');
    });
  });

  it('classifyBatch with empty array returns empty array', async () => {
    const results = await client.classifyBatch([]);
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('classifyBatch handles missing answers with defaults', async () => {
    const events = [
      createTestEvent('google', ['drive.read']),
      createTestEvent('github', ['repo']),
    ];

    // Mock response with defaults for missing answers (simulating partial failure)
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
        // Event 1 answers with defaults (simulating what API might return for failed questions)
        event_1_decision: { type: 'noul', noul: 0.5 },
        event_1_excessiveness: {
          type: 'choice',
          choice: 'appropriate',
          probabilities: { excessive: 0.33, appropriate: 0.34, minimal: 0.33 },
          confidence: 0.5,
        },
        event_1_purpose_match: {
          type: 'choice',
          choice: 'unclear',
          probabilities: { relevant: 0.33, unclear: 0.34, unrelated: 0.33 },
          confidence: 0.5,
        },
        event_1_sensitivity: {
          type: 'score',
          score: 1,
          legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
          probabilities: { '0': 0.33, '1': 0.34, '2': 0.33 },
          confidence: 0.5,
        },
      },
      usage: { input_tokens: 300, output_tokens: 100 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const results = await client.classifyBatch(events);

    // Should still return 2 results
    expect(results).toHaveLength(2);
    expect(results[0]!.decision).toBe('allow');
    // Event 1 has default-like values
    expect(results[1]!.decision).toBe('ask'); // noul = 0.5
  });
});