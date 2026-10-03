/**
 * Tracer test: Core AI types + OpenJevClient + one ConsentEvent classification end-to-end
 * This is the thinnest path proving the AI layer works
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsentEvent, createOAuthConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthCapability } from '../../src/ir/capability.js';
import { createEvidence } from '../../src/ir/evidence.js';
import { EvidenceSource, ExtractionMethod } from '../../src/shared/types.js';
import { OpenJevClient, OpenJevError } from '../../src/ai/openjev-client.js';
import type { OpenJevClassification, EvidenceCitation } from '../../src/ai/types.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { Mock } from 'vitest';

// Mock fetch globally
const originalFetch = global.fetch;

describe('OpenJevClient - Tracer Test', () => {
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

  it('classifies a ConsentEvent and returns structured OpenJevClassification with evidence', async () => {
    // Create a ConsentEvent for Google OAuth drive.read scope
    const capability = createOAuthCapability('google', ['drive.read']);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: 'button[data-provider="google"]',
      text: 'Continue with Google',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });

    const event: ConsentEvent = createOAuthConsentEvent({
      website: 'https://example.com',
      provider: 'google',
      scope: ['drive.read'],
      evidence: [evidence],
      userAction: 'click',
    });

    // Mock successful OpenJev response for decision (noul)
    const mockResponse = {
      model: 'openjev-latest',
      answers: {
        decision: {
          type: 'noul',
          noul: 0.85,
        },
      },
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    // Call classifyDecision
    const result = await client.classifyDecision(event);

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.decision).toBe('allow'); // noul > 0.5
    expect(result.decisionConfidence).toBe(0.85);
    expect(result.excessiveness).toBe('appropriate');
    expect(result.excessivenessConfidence).toBe(0);
    expect(result.purposeMatch).toBe('unclear');
    expect(result.purposeMatchConfidence).toBe(0);
    expect(result.sensitivity).toBe('medium');
    expect(result.sensitivityScore).toBe(1);
    expect(result.evidence).toBeDefined();
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0]!.source).toBe('openjev');
    expect(result.evidence[0]!.confidence).toBe(0.85);
  });

  it('verify request sent to correct endpoint with correct Authorization header', async () => {
    const capability = createOAuthCapability('google', ['drive.read']);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: 'button[data-provider="google"]',
      text: 'Continue with Google',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });

    const event = createOAuthConsentEvent({
      website: 'https://example.com',
      provider: 'google',
      scope: ['drive.read'],
      evidence: [evidence],
    });

    const mockResponse = {
      model: 'openjev-latest',
      answers: {
        decision: { type: 'noul', noul: 0.7 },
      },
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await client.classifyDecision(event);

    // Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('https://api.codiv.ai/v1/systemone');
    expect(call[1]).toBeDefined();
    expect(call[1].method).toBe('POST');
    expect(call[1].headers).toBeDefined();
    expect(call[1].headers['Content-Type']).toBe('application/json');
    expect(call[1].headers['Authorization']).toBe('Bearer test-api-key');
    expect(call[1].body).toBeDefined();
    
    const requestBody = JSON.parse(call[1].body);
    expect(requestBody.model).toBe('openjev-latest');
    expect(requestBody.questions).toBeDefined();
    expect(requestBody.questions.decision).toBeDefined();
    expect(requestBody.questions.decision.type).toBe('noul');
  });

  it('handles deny decision (noul < 0.5)', async () => {
    const capability = createOAuthCapability('google', ['drive.read']);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: 'button[data-provider="google"]',
      text: 'Continue with Google',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });

    const event = createOAuthConsentEvent({
      website: 'https://example.com',
      provider: 'google',
      scope: ['drive.read'],
      evidence: [evidence],
    });

    const mockResponse = {
      model: 'openjev-latest',
      answers: {
        decision: { type: 'noul', noul: 0.3 },
      },
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.classifyDecision(event);
    expect(result.decision).toBe('deny');
    expect(result.decisionConfidence).toBe(0.3);
  });

  it('handles ask decision (noul = 0.5)', async () => {
    const capability = createOAuthCapability('google', ['drive.read']);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: 'button[data-provider="google"]',
      text: 'Continue with Google',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });

    const event = createOAuthConsentEvent({
      website: 'https://example.com',
      provider: 'google',
      scope: ['drive.read'],
      evidence: [evidence],
    });

    const mockResponse = {
      model: 'openjev-latest',
      answers: {
        decision: { type: 'noul', noul: 0.5 },
      },
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.classifyDecision(event);
    expect(result.decision).toBe('ask');
    expect(result.decisionConfidence).toBe(0.5);
  });

  it('throws OpenJevError on 401 Unauthorized', async () => {
    const capability = createOAuthCapability('google', ['drive.read']);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: 'button[data-provider="google"]',
      text: 'Continue with Google',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });

    const event = createOAuthConsentEvent({
      website: 'https://example.com',
      provider: 'google',
      scope: ['drive.read'],
      evidence: [evidence],
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      code: 'HTTP_401',
      retryable: false,
    });
  });

  it('throws OpenJevError on network error', async () => {
    const capability = createOAuthCapability('google', ['drive.read']);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: 'button[data-provider="google"]',
      text: 'Continue with Google',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });

    const event = createOAuthConsentEvent({
      website: 'https://example.com',
      provider: 'google',
      scope: ['drive.read'],
      evidence: [evidence],
    });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
    });
  });
});