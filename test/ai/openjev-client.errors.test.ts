/**
 * Error handling tests for OpenJevClient (OPENJEV-06 preparation)
 * Verifies OpenJevError thrown with correct properties for network, 401, 429, 500, timeout
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOAuthConsentEvent } from '../../src/ir/consent-event.js';
import { createOAuthCapability } from '../../src/ir/capability.js';
import { createEvidence } from '../../src/ir/evidence.js';
import { EvidenceSource, ExtractionMethod } from '../../src/shared/types.js';
import { OpenJevClient, OpenJevError } from '../../src/ai/openjev-client.js';
import type { ConsentEvent } from '../../src/ir/consent-event.js';
import type { Mock } from 'vitest';

const originalFetch = global.fetch;

describe('OpenJevClient - Error Handling (OPENJEV-06)', () => {
  let client: OpenJevClient;
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn() as Mock;
    global.fetch = mockFetch;
    client = new OpenJevClient({ apiKey: 'test-api-key', timeout: 1000 });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });

  const createTestEvent = (): ConsentEvent => {
    const capability = createOAuthCapability('google', ['drive.read']);
    const evidence = createEvidence({
      source: EvidenceSource.DOM,
      selector: 'button[data-provider="google"]',
      text: 'Continue with Google',
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
    });
    return createOAuthConsentEvent({
      website: 'https://example.com',
      provider: 'google',
      scope: ['drive.read'],
      evidence: [evidence],
    });
  };

  it('throws OpenJevError with status, code, retryable for 401 Unauthorized', async () => {
    const event = createTestEvent();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
    });

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      code: 'HTTP_401',
      retryable: false,
    });
  });

  it('throws OpenJevError with status, code, retryable for 403 Forbidden', async () => {
    const event = createTestEvent();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
    });

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      status: 403,
      code: 'HTTP_403',
      retryable: false,
    });
  });

  it('throws OpenJevError with retryable=true for 429 Rate Limit', async () => {
    const event = createTestEvent();

    const headers = new Headers();
    headers.set('retry-after', '30');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers,
    });

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      status: 429,
      code: 'HTTP_429',
      retryable: true,
      retryAfterMs: 30000,
    });
  });

  it('throws OpenJevError with retryable=true for 500 Server Error', async () => {
    const event = createTestEvent();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
    });

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      status: 500,
      code: 'HTTP_500',
      retryable: true,
    });
  });

  it('throws OpenJevError with retryable=true for 503 Service Unavailable', async () => {
    const event = createTestEvent();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers(),
    });

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      status: 503,
      code: 'HTTP_503',
      retryable: true,
    });
  });

  it('throws OpenJevError with NETWORK_ERROR for network failure', async () => {
    const event = createTestEvent();

    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const promise = client.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
      status: 0,
    });
  });

  it('throws OpenJevError with TIMEOUT for request timeout', async () => {
    const event = createTestEvent();

    // Create a client with very short timeout
    const fastClient = new OpenJevClient({ apiKey: 'test', timeout: 10 });
    
    // Mock fetch that returns a promise that rejects with AbortError (simulating timeout)
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);

    const promise = fastClient.classifyDecision(event);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      code: 'TIMEOUT',
      retryable: true,
      status: 0,
    });
  });

  it('OpenJevError preserves original error message', async () => {
    const event = createTestEvent();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers(),
    });

    try {
      await client.classifyDecision(event);
    } catch (error) {
      expect(error).toBeInstanceOf(OpenJevError);
      expect((error as OpenJevError).message).toContain('OpenJev API error');
      expect((error as OpenJevError).message).toContain('400');
    }
  });

  it('classifyBatch throws OpenJevError on 401', async () => {
    const events = [createTestEvent(), createTestEvent()];

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
    });

    const promise = client.classifyBatch(events);
    await expect(promise).rejects.toThrow(OpenJevError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      code: 'HTTP_401',
      retryable: false,
    });
  });
});