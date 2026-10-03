/**
 * Cookie Adapter Tests
 * Verifies CookieAdapter classifies cookies using tracker lists with eTLD+1 logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { CookieAdapter, CookieCategory } from '../src/adapters/cookie-adapter.js';
import { AdapterRegistry } from '../src/adapters/registry.js';
import { ConsentType, GrantStatus, EvidenceSource, ExtractionMethod } from '../src/shared/types.js';
import { isCookieCapability } from '../src/ir/capability.js';
import type { ConsentEvent } from '../src/ir/consent-event.js';
import type { CookieCapability } from '../src/ir/capability.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test fixture
const fixturePath = join(__dirname, 'fixtures', 'cookie-page.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

function getCookieEvent(
  result: { events: ConsentEvent[] },
  name: string
): ConsentEvent & { capability: CookieCapability } | undefined {
  return result.events.find((e): e is ConsentEvent & { capability: CookieCapability } =>
    isCookieCapability(e.capability) && e.capability.name === name
  );
}

function getCookieEventsByCategory(
  result: { events: ConsentEvent[] },
  category: CookieCategory
): (ConsentEvent & { capability: CookieCapability })[] {
  return result.events.filter((e): e is ConsentEvent & { capability: CookieCapability } =>
    isCookieCapability(e.capability) && e.capability.category === category
  );
}

/**
 * Create a JSDOM with mocked document.cookie getter
 * Note: document.cookie only returns name=value pairs, not attributes
 */
function createDomWithCookies(cookieString: string): { dom: JSDOM; document: Document } {
  const dom = new JSDOM(fixtureHtml, {
    url: 'http://localhost:3000/cookies',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  const document = dom.window.document;
  
  // Override document.cookie getter to return our test cookie string
  // Cookie string should be name=value pairs separated by '; '
  Object.defineProperty(document, 'cookie', {
    get: () => cookieString,
    set: () => {}, // Ignore sets
    configurable: true,
  });
  
  return { dom, document };
}

describe('CookieAdapter', () => {
  let adapter: CookieAdapter;
  let _dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    adapter = new CookieAdapter();
    // Default empty cookies
    const { dom: d, document: doc } = createDomWithCookies('');
    _dom = d;
    // Keep JSDOM instance alive
    void _dom;
    document = doc;
    pageContext = {
      document,
      url: 'http://localhost:3000/cookies',
      origin: 'http://localhost:3000',
    };
  });

  it('should have correct name and priority', () => {
    expect(adapter.name).toBe('cookie');
    expect(adapter.priority).toBe(30);
  });

  it('should classify essential cookies correctly', async () => {
    const cookieString = [
      'session_id=abc123',
      'PHPSESSID=xyz789',
      'csrf_token=token123',
      '__Host-auth=secure123',
      '__Secure-session=secure456',
    ].join('; ');
    
    const { document } = createDomWithCookies(cookieString);
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const essentialEvents = getCookieEventsByCategory(result, CookieCategory.Essential);
    
    expect(essentialEvents.length).toBeGreaterThan(0);
    const names = essentialEvents.map(e => e.capability.name);
    expect(names.some(n => n === 'session_id' || n === 'PHPSESSID' || n === 'csrf_token')).toBe(true);
  });

  it('should classify functional cookies correctly', async () => {
    const cookieString = [
      'lang=en-US',
      'currency=USD',
      'theme=dark',
      'cookieconsent=accepted',
    ].join('; ');
    
    const { document } = createDomWithCookies(cookieString);
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const functionalEvents = getCookieEventsByCategory(result, CookieCategory.Functional);
    
    expect(functionalEvents.length).toBeGreaterThan(0);
    const names = functionalEvents.map(e => e.capability.name);
    expect(names.some(n => n === 'lang' || n === 'currency' || n === 'theme' || n === 'cookieconsent')).toBe(true);
  });

  it('should classify security cookies correctly', async () => {
    const cookieString = [
      '__cf_bm=cloudflare123',
      'cf_clearance=cf123',
    ].join('; ');
    
    const { document } = createDomWithCookies(cookieString);
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const securityEvents = getCookieEventsByCategory(result, CookieCategory.Security);
    
    expect(securityEvents.length).toBeGreaterThan(0);
    const names = securityEvents.map(e => e.capability.name);
    expect(names.some(n => n === '__cf_bm' || n === 'cf_clearance')).toBe(true);
  });

  it('should classify analytics cookies from tracker list (D-16)', async () => {
    const cookieString = [
      '_ga=GA1.1.123456789.1234567890',
      '_gid=GA1.1.987654321.1234567890',
      '_gat=1',
      '_dc_gtm_UA-12345=1',
      '_hjSession_123=eyJpZCI6IjEyMyJ9',
      '_hjSessionUser_123=eyJpZCI6IjEyMyJ9',
    ].join('; ');
    
    const { document } = createDomWithCookies(cookieString);
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const analyticsEvents = getCookieEventsByCategory(result, CookieCategory.Analytics);
    
    expect(analyticsEvents.length).toBeGreaterThan(0);
    const names = analyticsEvents.map(e => e.capability.name).filter((n): n is string => !!n);
    expect(names.some(n => n === '_ga' || n === '_gid' || n === '_gat' || n.startsWith('_hj'))).toBe(true);
  });

  it('should classify advertising cookies from tracker list (D-16)', async () => {
    const cookieString = [
      '_fbp=fb.1.1234567890.123456789',
      'fr=facebook123',
      '_gcl_au=1.1.1234567890.123456789',
      'IDE=doubleclick123',
      'test_cookie=doubleclick_test',
    ].join('; ');
    
    const { document } = createDomWithCookies(cookieString);
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const advertisingEvents = getCookieEventsByCategory(result, CookieCategory.Advertising);
    
    expect(advertisingEvents.length).toBeGreaterThan(0);
    const names = advertisingEvents.map(e => e.capability.name);
    expect(names.some(n => n === '_fbp' || n === 'fr' || n === '_gcl_au' || n === 'IDE' || n === 'test_cookie')).toBe(true);
  });

  it('should use eTLD+1 for first/third-party determination (D-17)', async () => {
    const cookieString = [
      'first_party=value1',
      'subdomain_first=value2',
    ].join('; ');
    
    const { document } = createDomWithCookies(cookieString);
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      if (isCookieCapability(event.capability)) {
        expect(event.resource).toBeDefined();
      }
    }
  });

  it('should create ConsentEvent with correct structure', async () => {
    const { document } = createDomWithCookies('test_cookie=test_value');
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const event = getCookieEvent(result, 'test_cookie');
    
    expect(event).toBeDefined();
    expect(event!.consentType).toBe(ConsentType.Cookie);
    expect(event!.capability.type).toBe('cookie');
    expect(event!.capability.name).toBe('test_cookie');
    expect(event!.grantStatus).toBe(GrantStatus.Pending);
    expect(event!.website).toBe('http://localhost:3000');
    expect(event!.cookieCategory).toBeDefined();
  });

  it('should include evidence with correct structure', async () => {
    const { document } = createDomWithCookies('evidence_test=evidence_value');
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const event = getCookieEvent(result, 'evidence_test');
    
    expect(event).toBeDefined();
    const evidenceList = event!.evidence;
    expect(evidenceList).toBeDefined();
    expect(evidenceList.length).toBeGreaterThanOrEqual(1);
    
    // Should have both DOM evidence and heuristic evidence
    const domEvidence = evidenceList.find(e => e.source === EvidenceSource.DOM);
    const heuristicEvidence = evidenceList.find(e => e.source === EvidenceSource.Heuristic);
    
    expect(domEvidence).toBeDefined();
    expect(heuristicEvidence).toBeDefined();
    
    if (domEvidence) {
      expect(domEvidence.selector).toBe('document.cookie');
      expect(domEvidence.extractionMethod).toBe(ExtractionMethod.TextContent);
      expect(domEvidence.confidence).toBeGreaterThan(0.8);
    }
    
    if (heuristicEvidence) {
      expect(heuristicEvidence.extractionMethod).toBe(ExtractionMethod.Heuristic);
      expect(heuristicEvidence.text).toContain('Category:');
      expect(heuristicEvidence.text).toContain('First-party:');
    }
  });

  it('should set grantStatus to pending by default', async () => {
    const { document } = createDomWithCookies('pending_test=pending_value');
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      if (isCookieCapability(event.capability)) {
        expect(event.grantStatus).toBe(GrantStatus.Pending);
      }
    }
  });

  it('should include userAction in events', async () => {
    const { document } = createDomWithCookies('action_test=action_value');
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      if (isCookieCapability(event.capability)) {
        expect(event.userAction).toBeDefined();
        expect(event.userAction).toContain('cookie:');
      }
    }
  });

  it('should handle cookies with no classification as unknown', async () => {
    const { document } = createDomWithCookies('completely_unknown_cookie=value');
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    const unknownEvents = getCookieEventsByCategory(result, CookieCategory.Unknown);
    
    const event = unknownEvents.find(e => e.capability.name === 'completely_unknown_cookie');
    expect(event).toBeDefined();
  });

  it('should not have critical errors', async () => {
    const { document } = createDomWithCookies('error_test=error_value');
    pageContext.document = document;
    
    const result = await adapter.extract(pageContext);
    
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    expect(criticalErrors).toHaveLength(0);
  });
});

describe('CookieAdapter eTLD+1 logic (D-17)', () => {
  let adapter: CookieAdapter;

  beforeEach(() => {
    adapter = new CookieAdapter();
  });

  it('should extract eTLD+1 correctly for various domains', () => {
    // Access private method via bracket notation for testing
    const getETLDPlus1 = (adapter as any).getETLDPlus1.bind(adapter);
    
    expect(getETLDPlus1('example.com')).toBe('example.com');
    expect(getETLDPlus1('www.example.com')).toBe('example.com');
    expect(getETLDPlus1('api.example.com')).toBe('example.com');
    expect(getETLDPlus1('sub.domain.example.com')).toBe('example.com');
    expect(getETLDPlus1('example.co.uk')).toBe('example.co.uk');
    expect(getETLDPlus1('www.example.co.uk')).toBe('example.co.uk');
    expect(getETLDPlus1('github.io')).toBe('github.io'); // Public suffix
    expect(getETLDPlus1('user.github.io')).toBe('user.github.io'); // Public suffix
    expect(getETLDPlus1('localhost')).toBe('localhost');
    // IP addresses are returned as-is by psl
    const ipResult = getETLDPlus1('127.0.0.1');
    expect(ipResult).toBeDefined();
  });
});

describe('CookieAdapter domain matching', () => {
  let adapter: CookieAdapter;

  beforeEach(() => {
    adapter = new CookieAdapter();
  });

  it('should match exact domain', () => {
    const domainMatches = (adapter as any).domainMatches.bind(adapter);
    
    expect(domainMatches('google.com', 'google.com')).toBe(true);
    expect(domainMatches('www.google.com', 'google.com')).toBe(true);
    expect(domainMatches('analytics.google.com', 'google.com')).toBe(true);
    expect(domainMatches('google.com', 'www.google.com')).toBe(false);
  });
});

describe('AdapterRegistry with CookieAdapter', () => {
  let registry: AdapterRegistry;
  let adapter: CookieAdapter;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    registry = new AdapterRegistry();
    adapter = new CookieAdapter();
    const { document: doc } = createDomWithCookies('test=test');
    document = doc;
    pageContext = {
      document,
      url: 'http://localhost:3000/cookies',
      origin: 'http://localhost:3000',
    };
  });

  it('should register and run CookieAdapter at priority 30', async () => {
    registry.register([adapter]);
    
    const result = await registry.run(pageContext);
    
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some(e => isCookieCapability(e.capability))).toBe(true);
  });

  it('should run after BrowserPermissionAdapter (priority 20)', async () => {
    const { BrowserPermissionAdapter } = await import('../src/adapters/browser-permission-adapter.js');
    const browserAdapter = new BrowserPermissionAdapter();
    
    registry.register([browserAdapter, adapter]);
    
    const adapters = registry.getAdapters();
    expect(adapters[0]!.name).toBe('browser-permission');
    expect(adapters[1]!.name).toBe('cookie');
  });
});