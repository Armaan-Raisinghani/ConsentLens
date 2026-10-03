/**
 * Terms Adapter Tests
 * Verifies TermsAdapter finds terms links, extracts clauses with severity
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { TermsAdapter, TermsClause, TermsSeverity } from '../src/adapters/terms-adapter.js';
import { AdapterRegistry } from '../src/adapters/registry.js';
import { ConsentType, GrantStatus, EvidenceSource, ExtractionMethod } from '../src/shared/types.js';
import { isTermsCapability } from '../src/ir/capability.js';
import type { ConsentEvent } from '../src/ir/consent-event.js';
import type { TermsCapability } from '../src/ir/capability.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test fixture
const fixturePath = join(__dirname, 'fixtures', 'terms-page.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

function getTermsEvent(
  result: { events: ConsentEvent[] },
  clause: TermsClause
): ConsentEvent & { capability: TermsCapability } | undefined {
  return result.events.find((e): e is ConsentEvent & { capability: TermsCapability } =>
    isTermsCapability(e.capability) && e.capability.clause === clause
  );
}

describe('TermsAdapter', () => {
  let adapter: TermsAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    adapter = new TermsAdapter();
    TermsAdapter.clearCache();
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
    };
  });

  afterEach(() => {
    TermsAdapter.clearCache();
  });

  it('should have correct name and priority', () => {
    expect(adapter.name).toBe('terms');
    expect(adapter.priority).toBe(50);
  });

  it('should find terms of service links', async () => {
    const links = (adapter as any).findTermsLinks(document, 'http://localhost:3000/');
    
    expect(links.length).toBeGreaterThan(0);
    expect(links.some(l => l.includes('terms'))).toBe(true);
  });

  it('should detect common terms URL paths', async () => {
    const links = (adapter as any).findTermsLinks(document, 'http://example.com/');
    
    expect(links.some(l => l === 'http://example.com/terms')).toBe(true);
    expect(links.some(l => l === 'http://example.com/terms-of-service')).toBe(true);
    expect(links.some(l => l === 'http://example.com/tos')).toBe(true);
  });

  it('should extract terms clauses from content', async () => {
    const testContent = `
      You agree to binding arbitration for all disputes.
      You grant us a worldwide, royalty-free, perpetual license to your content.
      We may suspend or terminate your account at any time without notice.
      The subscription auto-renews unless cancelled 30 days before renewal.
      We are not liable for any indirect or consequential damages.
      You agree to indemnify us against any claims.
      This agreement is governed by the laws of California.
      This constitutes the entire agreement between the parties.
    `;
    
    const clauses = (adapter as any).extractTermsClauses(testContent);
    
    expect(clauses.length).toBeGreaterThan(0);
    
    const clauseTypes = clauses.map((c: any) => c.clause);
    expect(clauseTypes).toContain(TermsClause.Arbitration);
    expect(clauseTypes).toContain(TermsClause.ContentLicensing);
    expect(clauseTypes).toContain(TermsClause.AccountSuspension);
    expect(clauseTypes).toContain(TermsClause.AutoRenewal);
    expect(clauseTypes).toContain(TermsClause.LiabilityLimitation);
    expect(clauseTypes).toContain(TermsClause.Indemnification);
    expect(clauseTypes).toContain(TermsClause.GoverningLaw);
    expect(clauseTypes).toContain(TermsClause.EntireAgreement);
  });

  it('should assign correct severity to clauses', async () => {
    const testContent = `
      You agree to binding arbitration.
      You grant us a perpetual license to your content.
      We may terminate your account.
      The subscription auto-renews.
      We are not liable for damages.
      This agreement is governed by the laws of California.
    `;
    
    const clauses = (adapter as any).extractTermsClauses(testContent);
    
    const arbitration = clauses.find((c: any) => c.clause === TermsClause.Arbitration);
    const licensing = clauses.find((c: any) => c.clause === TermsClause.ContentLicensing);
    const suspension = clauses.find((c: any) => c.clause === TermsClause.AccountSuspension);
    const autoRenewal = clauses.find((c: any) => c.clause === TermsClause.AutoRenewal);
    const liability = clauses.find((c: any) => c.clause === TermsClause.LiabilityLimitation);
    const governingLaw = clauses.find((c: any) => c.clause === TermsClause.GoverningLaw);
    
    expect(arbitration?.severity).toBe(TermsSeverity.High);
    expect(licensing?.severity).toBe(TermsSeverity.High);
    expect(suspension?.severity).toBe(TermsSeverity.High);
    expect(autoRenewal?.severity).toBe(TermsSeverity.Medium);
    expect(liability?.severity).toBe(TermsSeverity.Medium);
    expect(governingLaw?.severity).toBe(TermsSeverity.Low);
  });

  it('should create ConsentEvent with correct structure', async () => {
    const testContent = 'You agree to binding arbitration for all disputes. You grant us a worldwide, royalty-free, perpetual license to your content. We may suspend or terminate your account at any time without notice.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await adapter.extract(pageContext);
    
    expect(result.events.length).toBeGreaterThan(0);
    
    for (const event of result.events) {
      expect(event.consentType).toBe(ConsentType.Terms);
      expect(event.capability.type).toBe('terms');
      expect(event.capability.clause).toBeDefined();
      expect(event.grantStatus).toBe(GrantStatus.Pending);
      expect(event.website).toBe('http://localhost:3000');
      expect(event.evidence.length).toBeGreaterThan(0);
      expect(event.userAction).toContain('terms-fetch:');
      expect(event.resource).toBeDefined();
      expect(event.termsEvidence).toBeDefined();
    }
    
    for (const event of result.events) {
      expect(event.consentType).toBe(ConsentType.Terms);
      expect(event.capability.type).toBe('terms');
      expect(event.capability.clause).toBeDefined();
      expect(event.grantStatus).toBe(GrantStatus.Pending);
      expect(event.website).toBe('http://localhost:3000');
      expect(event.evidence.length).toBeGreaterThan(0);
      expect(event.userAction).toContain('terms-fetch:');
      expect(event.resource).toBeDefined();
      expect(event.termsEvidence).toBeDefined();
    }
  });

  it('should include evidence with correct structure', async () => {
    const testContent = 'You agree to binding arbitration. You grant us a license to your content.';
    
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
        expect(networkEvidence.text).toContain('Terms clause detected:');
      }
    }
  });

  it('should handle fetch errors gracefully (fail-open)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await adapter.extract(pageContext);
    
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    expect(criticalErrors).toHaveLength(0);
  });

  it('should cache responses', async () => {
    const testContent = 'You agree to binding arbitration.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    await adapter.extract(pageContext);
    const firstCallCount = (global.fetch as any).mock.calls.length;
    
    await adapter.extract(pageContext);
    const secondCallCount = (global.fetch as any).mock.calls.length;
    
    expect(secondCallCount).toBe(firstCallCount);
  });

  it('should set grantStatus to pending by default', async () => {
    const testContent = 'You agree to binding arbitration.';
    
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

describe('AdapterRegistry with TermsAdapter', () => {
  let registry: AdapterRegistry;
  let adapter: TermsAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    registry = new AdapterRegistry();
    adapter = new TermsAdapter();
    TermsAdapter.clearCache();
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/',
      pretendToBeVisual: true,
    });
    document = dom.window.document;
    pageContext = {
      document,
      url: 'http://localhost:3000/',
      origin: 'http://localhost:3000',
    };
  });

  afterEach(() => {
    TermsAdapter.clearCache();
  });

  it('should register and run TermsAdapter at priority 50', async () => {
    registry.register([adapter]);
    
    const testContent = 'You agree to binding arbitration for all disputes. You grant us a worldwide, royalty-free, perpetual license to your content.';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(testContent),
      headers: new Headers(),
    });
    
    const result = await registry.run(pageContext);
    
    expect(result.events.some(e => isTermsCapability(e.capability))).toBe(true);
  });

  it('should run after PolicyAdapter (priority 40)', async () => {
    const { PolicyAdapter } = await import('../src/adapters/policy-adapter.js');
    const policyAdapter = new PolicyAdapter();
    PolicyAdapter.clearCache();
    
    registry.register([policyAdapter, adapter]);
    
    const adapters = registry.getAdapters();
    expect(adapters[0]!.name).toBe('policy');
    expect(adapters[1]!.name).toBe('terms');
  });
});