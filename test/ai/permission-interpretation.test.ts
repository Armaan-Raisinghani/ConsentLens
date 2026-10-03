/**
 * Tests for PermissionInterpretationEngine
 */

import { describe, it, expect, vi } from 'vitest';
import { PermissionInterpretationEngine } from '../../src/ai/permission-interpretation.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import type { Capability } from '../../src/ir/capability.js';
import {
  createOAuthCapability,
  createBrowserPermissionCapability,
  createCookieCapability,
  createPolicyCapability,
  createTermsCapability,
} from '../../src/ir/capability.js';

// Mock OpenJevClient
const createMockOpenJevClient = (response: any) => {
  const mockClient = {
    callOpenJev: vi.fn().mockResolvedValue(response),
  } as unknown as OpenJevClient;
  return mockClient;
};

describe('PermissionInterpretationEngine', () => {
  describe('with OpenJevClient', () => {
    it('should interpret OAuth Google Drive capability with high sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 2,
            confidence: 0.9,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.05, '1': 0.15, '2': 0.8 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createOAuthCapability('google', ['drive', 'drive.file', 'profile']);

      const result = await engine.interpret(capability);

      expect(result.capability).toEqual(capability);
      expect(result.description).toContain('Google Drive');
      expect(result.description).toContain('drive');
      expect(result.sensitivity).toBe('high');
      expect(result.confidence).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(mockClient.callOpenJev).toHaveBeenCalledOnce();
    });

    it('should interpret OAuth GitHub capability with medium sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 1,
            confidence: 0.85,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.1, '1': 0.75, '2': 0.15 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createOAuthCapability('github', ['repo', 'user:email']);

      const result = await engine.interpret(capability);

      expect(result.capability).toEqual(capability);
      expect(result.description).toContain('GitHub');
      expect(result.sensitivity).toBe('medium');
    });

    it('should interpret browser geolocation permission with high sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 2,
            confidence: 0.95,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.02, '1': 0.08, '2': 0.9 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createBrowserPermissionCapability('geolocation');

      const result = await engine.interpret(capability);

      expect(result.capability).toEqual(capability);
      expect(result.description).toContain('location');
      expect(result.sensitivity).toBe('high');
    });

    it('should interpret browser camera permission with high sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 2,
            confidence: 0.95,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.02, '1': 0.08, '2': 0.9 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createBrowserPermissionCapability('camera');

      const result = await engine.interpret(capability);

      expect(result.description).toContain('camera');
      expect(result.sensitivity).toBe('high');
    });

    it('should interpret browser notifications permission with low sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 0,
            confidence: 0.9,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.85, '1': 0.1, '2': 0.05 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createBrowserPermissionCapability('notifications');

      const result = await engine.interpret(capability);

      expect(result.description).toContain('notification');
      expect(result.sensitivity).toBe('low');
    });

    it('should interpret advertising cookie with high sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 2,
            confidence: 0.9,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.05, '1': 0.15, '2': 0.8 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createCookieCapability('advertising', '_ga', 'google.com');

      const result = await engine.interpret(capability);

      expect(result.capability).toEqual(capability);
      expect(result.description).toContain('advertising');
      expect(result.description).toContain('analytics');
      expect(result.sensitivity).toBe('high');
      expect(result.evidence.some(e => e.source === 'cookie')).toBe(true);
    });

    it('should interpret analytics cookie with low sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 0,
            confidence: 0.85,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.8, '1': 0.15, '2': 0.05 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createCookieCapability('analytics', '_ga', 'example.com');

      const result = await engine.interpret(capability);

      expect(result.description.toLowerCase()).toContain('analytics');
      expect(result.sensitivity).toBe('low');
    });

    it('should interpret essential cookie with low sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 0,
            confidence: 0.9,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.85, '1': 0.1, '2': 0.05 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createCookieCapability('essential', 'session_id', 'example.com');

      const result = await engine.interpret(capability);

      expect(result.description.toLowerCase()).toContain('essential');
      expect(result.sensitivity).toBe('low');
    });

    it('should interpret policy capability with appropriate sensitivity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 1,
            confidence: 0.8,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.2, '1': 0.7, '2': 0.1 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createPolicyCapability('data-collection');

      const result = await engine.interpret(capability);

      expect(result.capability).toEqual(capability);
      expect(result.description).toContain('data-collection');
      expect(result.sensitivity).toBe('medium');
    });

    it('should interpret terms capability with appropriate severity', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 2,
            confidence: 0.88,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.05, '1': 0.15, '2': 0.8 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);
      const capability = createTermsCapability('arbitration');

      const result = await engine.interpret(capability);

      expect(result.capability).toEqual(capability);
      expect(result.description).toContain('arbitration');
      expect(result.sensitivity).toBe('high');
    });

    it('should include proper evidence citations for each capability type', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          sensitivity: {
            type: 'score',
            score: 2,
            confidence: 0.9,
            legend: { '0': 'Low', '1': 'Medium', '2': 'High' },
            probabilities: { '0': 0.05, '1': 0.15, '2': 0.8 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PermissionInterpretationEngine(mockClient);

      // Test OAuth evidence
      const oauthCap = createOAuthCapability('google', ['drive']);
      const oauthResult = await engine.interpret(oauthCap);
      expect(oauthResult.evidence.some(e => e.source === 'oauth-url')).toBe(true);
      expect(oauthResult.evidence.some(e => e.source === 'openjev')).toBe(true);

      // Test cookie evidence
      const cookieCap = createCookieCapability('advertising', '_fbp', 'facebook.com');
      const cookieResult = await engine.interpret(cookieCap);
      expect(cookieResult.evidence.some(e => e.source === 'cookie')).toBe(true);
      expect(cookieResult.evidence.some(e => e.cookie?.name === '_fbp')).toBe(true);
    });
  });

  describe('fallback heuristics (no OpenJevClient)', () => {
    it('should interpret all OAuth providers', async () => {
      const engine = new PermissionInterpretationEngine();

      const google = await engine.interpret(createOAuthCapability('google', ['drive']));
      expect(google.description).toContain('Google Drive');
      expect(google.sensitivity).toBe('high');

      const github = await engine.interpret(createOAuthCapability('github', ['repo']));
      expect(github.description).toContain('GitHub');
      expect(github.sensitivity).toBe('medium');

      const microsoft = await engine.interpret(createOAuthCapability('microsoft', ['mail.read']));
      expect(microsoft.description).toContain('Microsoft');
      expect(microsoft.sensitivity).toBe('high');
    });

    it('should interpret all browser permissions', async () => {
      const engine = new PermissionInterpretationEngine();

      const geo = await engine.interpret(createBrowserPermissionCapability('geolocation'));
      expect(geo.description).toContain('location');
      expect(geo.sensitivity).toBe('high');

      const camera = await engine.interpret(createBrowserPermissionCapability('camera'));
      expect(camera.description).toContain('camera');
      expect(camera.sensitivity).toBe('high');

      const mic = await engine.interpret(createBrowserPermissionCapability('microphone'));
      expect(mic.description).toContain('microphone');
      expect(mic.sensitivity).toBe('high');

      const notif = await engine.interpret(createBrowserPermissionCapability('notifications'));
      expect(notif.description).toContain('notification');
      expect(notif.sensitivity).toBe('low');
    });

    it('should interpret all cookie categories', async () => {
      const engine = new PermissionInterpretationEngine();

      const adv = await engine.interpret(createCookieCapability('advertising', 'ad_id', 'ads.com'));
      expect(adv.description.toLowerCase()).toContain('advertising');
      expect(adv.sensitivity).toBe('high');

      const analytics = await engine.interpret(createCookieCapability('analytics', '_ga', 'example.com'));
      expect(analytics.description.toLowerCase()).toContain('analytics');
      expect(analytics.sensitivity).toBe('low');

      const essential = await engine.interpret(createCookieCapability('essential', 'session', 'example.com'));
      expect(essential.description.toLowerCase()).toContain('essential');
      expect(essential.sensitivity).toBe('low');

      const pref = await engine.interpret(createCookieCapability('preferences', 'theme', 'example.com'));
      expect(pref.description.toLowerCase()).toContain('preference');
      expect(pref.sensitivity).toBe('low');
    });

    it('should interpret policy capabilities', async () => {
      const engine = new PermissionInterpretationEngine();

      const collection = await engine.interpret(createPolicyCapability('data-collection'));
      expect(collection.description).toContain('data-collection');
      expect(collection.sensitivity).toBe('medium');

      const aiTraining = await engine.interpret(createPolicyCapability('ai-training'));
      expect(aiTraining.description).toContain('ai-training');
      expect(aiTraining.sensitivity).toBe('high');
    });

    it('should interpret terms capabilities', async () => {
      const engine = new PermissionInterpretationEngine();

      const arbitration = await engine.interpret(createTermsCapability('arbitration'));
      expect(arbitration.description).toContain('arbitration');
      expect(arbitration.sensitivity).toBe('high');

      const liability = await engine.interpret(createTermsCapability('liability-limitation'));
      expect(liability.description).toContain('liability');
      expect(liability.sensitivity).toBe('medium');
    });

    it('should have confidence <= 0.6 for fallback', async () => {
      const engine = new PermissionInterpretationEngine();

      const result = await engine.interpret(createOAuthCapability('google', ['drive']));
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });

    it('should return fallback mode', async () => {
      const engine = new PermissionInterpretationEngine();
      await engine.interpret(createOAuthCapability('google', ['drive']));
      expect(engine.getMode()).toBe('fallback');
    });
  });

  describe('error handling', () => {
    it('should fall back when OpenJev throws network error', async () => {
      const mockClient = {
        callOpenJev: vi.fn().mockRejectedValue(new Error('Network error')),
      } as unknown as OpenJevClient;

      const engine = new PermissionInterpretationEngine(mockClient);
      const result = await engine.interpret(createOAuthCapability('google', ['drive']));

      // Should fall back to heuristic
      expect(result.sensitivity).toBe('high');
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });

    it('should fall back when OpenJev returns invalid response', async () => {
      const mockClient = {
        callOpenJev: vi.fn().mockResolvedValue({
          model: 'openjev-latest',
          answers: { sensitivity: { type: 'choice', choice: 'invalid', confidence: 0.5, probabilities: {} } },
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      } as unknown as OpenJevClient;

      const engine = new PermissionInterpretationEngine(mockClient);
      const result = await engine.interpret(createOAuthCapability('google', ['drive']));

      expect(result.sensitivity).toBe('high');
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });
  });
});