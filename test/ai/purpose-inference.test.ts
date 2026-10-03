/**
 * Tests for PurposeInferenceEngine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { PurposeInferenceEngine } from '../../src/ai/purpose-inference.js';
import { OpenJevClient } from '../../src/ai/openjev-client.js';
import type { PageContext } from '../../src/ai/types.js';

// Mock OpenJevClient
const createMockOpenJevClient = (response: any) => {
  const mockClient = {
    callOpenJev: vi.fn().mockResolvedValue(response),
  } as unknown as OpenJevClient;
  return mockClient;
};

// Create a test page context with JSDOM
const createPageContext = (overrides: Partial<PageContext> = {}): PageContext => {
  const dom = new JSDOM(`<!DOCTYPE html>
    <html>
    <head>
      <title>Test Dashboard - Project Manager</title>
      <meta name="description" content="Manage your projects and tasks efficiently">
      <meta property="og:description" content="Project management dashboard">
      <meta name="twitter:description" content="Task management for teams">
      <meta name="application-name" content="ProjectManager">
    </head>
    <body>
      <h1>Welcome to Your Dashboard</h1>
      <h2>Project Overview</h2>
      <main>
        <p>Manage your projects, tasks, and team collaboration in one place.</p>
        <p>Track progress, assign tasks, and meet deadlines with our productivity tools.</p>
      </main>
    </body>
    </html>`, { url: 'https://example.com/dashboard' });

  const document = dom.window.document;
  const metaTags: Record<string, string> = {};
  document.querySelectorAll('meta').forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
    const content = meta.getAttribute('content') || '';
    if (name && content) metaTags[name] = content;
  });

  const headings: string[] = [];
  document.querySelectorAll('h1, h2').forEach(h => {
    const text = h.textContent?.trim() || '';
    if (text) headings.push(text);
  });

  const mainContent = document.querySelector('main')?.textContent?.trim() || '';

  return {
    url: 'https://example.com/dashboard',
    origin: 'https://example.com',
    title: 'Test Dashboard - Project Manager',
    metaTags,
    headings,
    mainContent,
    ...overrides,
    // Ensure nested objects are fully overridden, not merged
    metaTags: overrides.metaTags ?? metaTags,
    headings: overrides.headings ?? headings,
  };
};

describe('PurposeInferenceEngine', () => {
  describe('with OpenJevClient', () => {
    it('should infer productivity purpose from dashboard page', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          purpose: {
            type: 'choice',
            choice: 'productivity',
            confidence: 0.85,
            probabilities: { productivity: 0.85, social: 0.05, ecommerce: 0.03, content: 0.04, auth: 0.02, other: 0.01 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PurposeInferenceEngine(mockClient);
      const pageContext = createPageContext();

      const result = await engine.infer(pageContext);

      expect(result.inferred).toBe('productivity');
      expect(result.confidence).toBe(0.85);
      expect(result.evidence).toBeDefined();
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(mockClient.callOpenJev).toHaveBeenCalledOnce();
    });

    it('should infer social purpose from feed page', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          purpose: {
            type: 'choice',
            choice: 'social',
            confidence: 0.9,
            probabilities: { social: 0.9, productivity: 0.03, ecommerce: 0.02, content: 0.03, auth: 0.01, other: 0.01 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PurposeInferenceEngine(mockClient);
      const pageContext = createPageContext({
        title: 'Social Feed - Connect with Friends',
        metaTags: { description: 'Share posts and connect with friends', 'og:description': 'Social networking platform' },
        headings: ['Your Feed', 'Recent Posts'],
        mainContent: 'Share updates, like posts, comment on photos, and connect with friends.',
      });

      const result = await engine.infer(pageContext);

      expect(result.inferred).toBe('social');
      expect(result.confidence).toBe(0.9);
    });

    it('should infer ecommerce purpose from checkout page', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          purpose: {
            type: 'choice',
            choice: 'ecommerce',
            confidence: 0.88,
            probabilities: { ecommerce: 0.88, productivity: 0.02, social: 0.02, content: 0.03, auth: 0.03, other: 0.02 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PurposeInferenceEngine(mockClient);
      const pageContext = createPageContext({
        title: 'Checkout - Complete Your Purchase',
        metaTags: { description: 'Secure checkout for your order', 'og:description': 'Payment and shipping' },
        headings: ['Order Summary', 'Payment Details'],
        mainContent: 'Review your cart, enter payment details, and complete your purchase. Shipping and billing address required.',
      });

      const result = await engine.infer(pageContext);

      expect(result.inferred).toBe('ecommerce');
      expect(result.confidence).toBe(0.88);
    });

    it('should fall back to heuristics when OpenJev fails', async () => {
      const mockClient = createMockOpenJevClient(Promise.reject(new Error('Network error')));
      const engine = new PurposeInferenceEngine(mockClient);
      const pageContext = createPageContext();

      const result = await engine.infer(pageContext);

      // Should fall back to heuristic (keyword-based)
      expect(result.inferred).toBe('productivity');
      expect(result.confidence).toBeLessThanOrEqual(0.6);
      expect(result.evidence).toBeDefined();
    });

    it('should return fallback mode when no OpenJevClient provided', async () => {
      const engine = new PurposeInferenceEngine();
      const pageContext = createPageContext({
        title: 'Shopping Cart',
        metaTags: {},
        headings: ['Your Cart'],
        mainContent: 'Your shopping cart contains 3 items. Proceed to checkout.',
      });

      const result = await engine.infer(pageContext);

      expect(result.inferred).toBe('ecommerce');
      expect(result.confidence).toBeLessThanOrEqual(0.6);
      expect(engine.getMode()).toBe('fallback');
    });

    it('should include DOM evidence citations', async () => {
      const mockResponse = {
        model: 'openjev-latest',
        answers: {
          purpose: {
            type: 'choice',
            choice: 'productivity',
            confidence: 0.85,
            probabilities: { productivity: 0.85 },
          },
        },
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      const mockClient = createMockOpenJevClient(mockResponse);
      const engine = new PurposeInferenceEngine(mockClient);
      const pageContext = createPageContext();

      const result = await engine.infer(pageContext);

      // Check evidence structure
      expect(result.evidence.some(e => e.source === 'dom')).toBe(true);
      expect(result.evidence.some(e => e.source === 'openjev')).toBe(true);
      expect(result.evidence.every(e => e.confidence >= 0 && e.confidence <= 1)).toBe(true);
    });

    it('should handle empty page context gracefully', async () => {
      const engine = new PurposeInferenceEngine();
      const pageContext = createPageContext({
        title: '',
        metaTags: {},
        headings: [],
        mainContent: '',
      });

      const result = await engine.infer(pageContext);

      expect(result.inferred).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.evidence).toBeDefined();
    });
  });

  describe('fallback heuristics (no OpenJevClient)', () => {
    it('should classify productivity from keywords', async () => {
      const engine = new PurposeInferenceEngine();
      const pageContext = createPageContext({
        title: 'Code Editor - VS Code',
        metaTags: {},
        headings: ['Editor', 'Workspace'],
        mainContent: 'Edit code, debug applications, manage projects in your IDE workspace.',
      });

      const result = await engine.infer(pageContext);
      expect(result.inferred).toBe('productivity');
    });

    it('should classify social from keywords', async () => {
      const engine = new PurposeInferenceEngine();
      const pageContext = createPageContext({
        title: 'Twitter - Home',
        metaTags: {},
        headings: ['Home', 'Notifications'],
        mainContent: 'Follow people, share tweets, like and retweet posts.',
      });

      const result = await engine.infer(pageContext);
      expect(result.inferred).toBe('social');
    });

    it('should classify auth from keywords', async () => {
      const engine = new PurposeInferenceEngine();
      const pageContext = createPageContext({
        title: 'Sign In - GitHub',
        metaTags: {},
        headings: ['Sign in to GitHub'],
        mainContent: 'Enter your username and password to access your account.',
      });

      const result = await engine.infer(pageContext);
      expect(result.inferred).toBe('auth');
    });

    it('should default to other when no keywords match', async () => {
      const engine = new PurposeInferenceEngine();
      const pageContext = createPageContext({
        title: 'Random Page',
        metaTags: {},
        headings: ['Welcome'],
        mainContent: 'This is a generic page with no specific purpose keywords.',
      });

      const result = await engine.infer(pageContext);
      expect(result.inferred).toBe('other');
    });

    it('should have confidence <= 0.6 for fallback', async () => {
      const engine = new PurposeInferenceEngine();
      const pageContext = createPageContext();

      const result = await engine.infer(pageContext);
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });
  });
});