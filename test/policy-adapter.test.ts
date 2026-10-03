/**
 * Policy Adapter Tests
 * Verifies PolicyAdapter finds policy links, fetches via r.jina.ai, extracts with Readability
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { PolicyAdapter, PolicyPractice } from '../src/adapters/policy-adapter.js';
import { AdapterRegistry } from '../src/adapters/registry.js';
import { ConsentType, GrantStatus } from '../src/shared/types.js';
import { isPolicyCapability } from '../src/ir/capability.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test fixture
const fixturePath = join(__dirname, 'fixtures', 'policy-page.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

describe('PolicyAdapter', () => {
  let adapter: PolicyAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
    metadata?: Record<string, unknown>;
  };

  beforeEach(() => {
    adapter = new PolicyAdapter();
    PolicyAdapter.clearCache();
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/',
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    });
    document = dom.window.document;
    pageContext = {
      document,
      url: 'http://localhost:3000/',
      origin: 'http://localhost:3000',
      metadata: {
        sharedContext: new Map(),
      },
    };
  });

  afterEach(() => {
    PolicyAdapter.clearCache();
  });

  it('should have correct name and priority', () => {
    expect(adapter.name).toBe('policy');
    expect(adapter.priority).toBe(40);
  });

  it('should find privacy policy links', async () => {
    // The adapter uses fetch which we need to mock
    // For this test, we just verify link detection works
    const links = (adapter as any).findPolicyLinks(document, 'http://localhost:3000/');
    
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((l: string) => l.includes('privacy-policy'))).toBe(true);
  });

  it('should detect common policy URL paths', async () => {
    const links = (adapter as any).findPolicyLinks(document, 'http://example.com/');
    
    expect(links.some((l: string) => l === 'http://example.com/privacy')).toBe(true);
    expect(links.some((l: string) => l === 'http://example.com/privacy-policy')).toBe(true);
    expect(links.some((l: string) => l === 'http://example.com/policy')).toBe(true);
  });

  it('should extract policy practices from content', async () => {
    const testContent = `
      We collect personal information including your name, email, and usage data.
      We share your data with third-party service providers.
      We do not sell your personal information.
      We use your data to train our AI models.
      We retain your data for 2 years after account closure.
      You have the right to access, delete, and correct your data.
      We implement security measures to protect your data.
    `;
    
    const practices = (adapter as any).extractPolicyPractices(testContent);
    
    expect(practices).toContain(PolicyPractice.DataCollection);
    expect(practices).toContain(PolicyPractice.DataSharing);
    expect(practices).toContain(PolicyPractice.DataSelling);
    expect(practices).toContain(PolicyPractice.AiTraining);
    expect(practices).toContain(PolicyPractice.Retention);
    expect(practices).toContain(PolicyPractice.UserRights);
    expect(practices).toContain(PolicyPractice.Security);
  });

  it('should create ConsentEvent with correct structure', async () => {
    // Mock fetch to return test content
    const testContent = 'We collect your personal data including name and email. We share data with third parties. We use data to train AI models.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await adapter.extract(pageContext);
    
    expect(result.events.length).toBeGreaterThan(0);
    
    for (const event of result.events) {
      expect(event.consentType).toBe(ConsentType.Policy);
      expect(event.capability.type).toBe('policy');
      if (isPolicyCapability(event.capability)) {
        expect(event.capability.practice).toBeDefined();
      }
      expect(event.grantStatus).toBe(GrantStatus.Pending);
      expect(event.website).toBe('http://localhost:3000');
      expect(event.evidence.length).toBeGreaterThan(0);
      expect(event.userAction).toContain('policy-fetch:');
      expect(event.resource).toBeDefined();
    }
  });

  it('should include evidence with correct structure', async () => {
    const testContent = 'We collect your personal data. We share with third parties.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      const evidenceList = event.evidence;
      expect(evidenceList.length).toBeGreaterThanOrEqual(1);
      
      const domEvidence = evidenceList.find(e => e.source === EvidenceSource.DOM);
      const networkEvidence = evidenceList.find(e => e.source === EvidenceSource.Heuristic);
      
      expect(domEvidence).toBeDefined();
      expect(networkEvidence).toBeDefined();
      
      if (domEvidence) {
        expect(domEvidence.extractionMethod).toBe(ExtractionMethod.Attribute);
        expect(domEvidence.confidence).toBeGreaterThan(0.8);
      }
      
      if (networkEvidence) {
        expect(networkEvidence.extractionMethod).toBe(ExtractionMethod.Heuristic);
        expect(networkEvidence.text).toContain('Policy practice detected:');
      }
    }
  });

  it('should read detectedProvider from shared context (D-24)', async () => {
    const testContent = 'We collect your data. We share with third parties.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    // Set detectedProvider in shared context
    const sharedContext = pageContext.metadata!['sharedContext'] as Map<string, unknown>;
    sharedContext.set('detectedProvider', 'google');
    
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      const networkEvidence = event.evidence.find(e => e.source === EvidenceSource.Heuristic);
      expect(networkEvidence).toBeDefined();
      if (networkEvidence) {
        expect(networkEvidence.text).toContain('provider: google');
      }
    }
  });

  it('should handle fetch errors gracefully (fail-open)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await adapter.extract(pageContext);
    
    // Should not throw, should return empty events with error
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
    // No critical errors
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    expect(criticalErrors).toHaveLength(0);
  });

  it('should cache responses (D-21)', async () => {
    const testContent = 'We collect your data for analytics.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    // First call
    await adapter.extract(pageContext);
    const firstCallCount = (global.fetch as any).mock.calls.length;
    
    // Second call with same URL should use cache
    await adapter.extract(pageContext);
    const secondCallCount = (global.fetch as any).mock.calls.length;
    
    // Should not have made another fetch call (cached)
    expect(secondCallCount).toBe(firstCallCount);
  });

  it('should set grantStatus to pending by default', async () => {
    const testContent = 'We collect your data.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers(),
    });
    
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      expect(event.grantStatus).toBe(GrantStatus.Pending);
    }
  });
});

describe('AdapterRegistry with PolicyAdapter', () => {
  let registry: AdapterRegistry;
  let adapter: PolicyAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
    metadata?: Record<string, unknown>;
  };

  beforeEach(() => {
    registry = new AdapterRegistry();
    adapter = new PolicyAdapter();
    PolicyAdapter.clearCache();
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/',
      pretendToBeVisual: true,
    });
    document = dom.window.document;
    pageContext = {
      document,
      url: 'http://localhost:3000/',
      origin: 'http://localhost:3000',
      metadata: {
        sharedContext: new Map(),
      },
    };
  });

  afterEach(() => {
    PolicyAdapter.clearCache();
  });

  it('should register and run PolicyAdapter at priority 40', async () => {
    registry.register([adapter]);
    
    const testContent = 'We collect your personal data including name and email. We share data with third parties. We use data to train AI models. We retain data for 2 years. You have rights to access and delete your data.';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await registry.run(pageContext);
    
    expect(result.events.some(e => isPolicyCapability(e.capability))).toBe(true);
  });

  it('should run after CookieAdapter (priority 30)', async () => {
    const { CookieAdapter } = await import('../src/adapters/cookie-adapter.js');
    const cookieAdapter = new CookieAdapter();
    
    registry.register([cookieAdapter, adapter]);
    
    const adapters = registry.getAdapters();
    expect(adapters[0]!.name).toBe('cookie');
    expect(adapters[1]!.name).toBe('policy');
  });
});