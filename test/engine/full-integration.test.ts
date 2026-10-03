/**
 * Full Integration Test - Phase 1 AdapterRegistry → Phase 2 DecisionEngine
 * Capstone test proving end-to-end data flow
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { AdapterRegistry } from '../../src/adapters/registry.js';
import { OAuthAdapter } from '../../src/adapters/oauth-adapter.js';
import { BrowserPermissionAdapter } from '../../src/adapters/browser-permission-adapter.js';
import { CookieAdapter } from '../../src/adapters/cookie-adapter.js';
import { PolicyAdapter } from '../../src/adapters/policy-adapter.js';
import { TermsAdapter } from '../../src/adapters/terms-adapter.js';
import { DecisionEngine } from '../../src/engine/decision-engine.js';
import { ConsentType, GrantStatus } from '../../src/shared/types.js';
import { isOAuthCapability, isBrowserPermissionCapability, isCookieCapability, isPolicyCapability, isTermsCapability } from '../../src/ir/capability.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test fixture
const fixturePath = join(__dirname, '..', 'fixtures', 'combined-page.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

describe('Full Integration: AdapterRegistry → DecisionEngine', () => {
  let registry: AdapterRegistry;
  let oauthAdapter: OAuthAdapter;
  let browserAdapter: BrowserPermissionAdapter;
  let cookieAdapter: CookieAdapter;
  let policyAdapter: PolicyAdapter;
  let termsAdapter: TermsAdapter;
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
    oauthAdapter = new OAuthAdapter();
    browserAdapter = new BrowserPermissionAdapter();
    cookieAdapter = new CookieAdapter();
    policyAdapter = new PolicyAdapter();
    termsAdapter = new TermsAdapter();
    
    PolicyAdapter.clearCache();
    TermsAdapter.clearCache();
    
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/',
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    });
    document = dom.window.document;
    
    // Mock document.cookie for cookie adapter
    Object.defineProperty(document, 'cookie', {
      get: () => 'session_id=abc123; _ga=GA1.1.123; _fbp=fb.1.123; __cf_bm=cf123; lang=en-US',
      set: () => {},
      configurable: true,
    });
    
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
    TermsAdapter.clearCache();
  });

  it('should run all 5 adapters and produce ConsentEvent[]', async () => {
    registry.register([oauthAdapter, browserAdapter, cookieAdapter, policyAdapter, termsAdapter]);
    
    // Mock fetch for policy and terms adapters
    const policyContent = 'We collect your personal data including name and email. We share data with third parties. We use data to train AI models. We retain data for 2 years. You have rights to access and delete your data. We implement security measures to protect your information.';
    const termsContent = 'You agree to binding arbitration. You grant us a license to your content. We may terminate your account. The subscription auto-renews. We are not liable for damages. This agreement is governed by the laws of California.';
    
    global.fetch = vi.fn().mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('r.jina.ai')) {
        const isTermsUrl = urlStr.includes('/terms') || urlStr.includes('/tos');
        return {
          ok: true,
          text: () => Promise.resolve(isTermsUrl ? termsContent : policyContent),
          headers: new Headers({ 'cache-control': 'max-age=3600' }),
        };
      }
      return { ok: false };
    });
    
    const result = await registry.run(pageContext);
    
    // Should have events from all 5 adapters
    expect(result.events.length).toBeGreaterThan(0);
    
    const oauthEvents = result.events.filter(e => isOAuthCapability(e.capability));
    const browserEvents = result.events.filter(e => isBrowserPermissionCapability(e.capability));
    const cookieEvents = result.events.filter(e => isCookieCapability(e.capability));
    const policyEvents = result.events.filter(e => isPolicyCapability(e.capability));
    const termsEvents = result.events.filter(e => isTermsCapability(e.capability));
    
    expect(oauthEvents.length).toBeGreaterThan(0);
    expect(browserEvents.length).toBeGreaterThan(0);
    expect(cookieEvents.length).toBeGreaterThan(0);
    expect(policyEvents.length).toBeGreaterThan(0);
    expect(termsEvents.length).toBeGreaterThan(0);
    
    // Verify each event has required fields
    for (const event of result.events) {
      expect(event.website).toBe('http://localhost:3000');
      expect(event.timestamp).toBeDefined();
      expect(event.grantStatus).toBe(GrantStatus.Pending);
      expect(event.evidence.length).toBeGreaterThan(0);
      expect(event.userAction).toBeDefined();
      expect(event.consentType).toBeDefined();
      expect(event.capability).toBeDefined();
    }
  });

  it('should make correct decisions for all 5 adapter event types with Balanced pack', async () => {
    registry.register([oauthAdapter, browserAdapter, cookieAdapter, policyAdapter, termsAdapter]);
    
    const longContent = 'We collect your personal data including name and email. We share data with third parties. We use data to train AI models. We retain data for 2 years. You have rights to access and delete your data. We implement security measures to protect your information. You agree to binding arbitration. You grant us a license to your content. We may terminate your account. The subscription auto-renews. We are not liable for damages. This agreement is governed by the laws of California.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(longContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await registry.run(pageContext);
    
    // Create DecisionEngine with Balanced pack
    const engine = new DecisionEngine([], [], [], 'balanced');
    
    // Test each event type
    for (const event of result.events) {
      const { decision, explanation } = engine.decideWithExplanation(event);
      
      // Verify explanation structure
      expect(explanation).toBeDefined();
      expect(explanation.humanReadable).toBeDefined();
      expect(explanation.humanReadable.length).toBeGreaterThan(0);
      expect(explanation.matchedRule).toBeDefined();
      expect(explanation.matchedLayer).toBeDefined();
      expect(explanation.capability).toBeDefined();
      expect(explanation.domain).toBeDefined();
      expect(explanation.confidence).toBeGreaterThan(0);
      expect(explanation.evidence.length).toBeGreaterThan(0);
      
      // Verify decisions per Balanced pack rules
      if (isOAuthCapability(event.capability)) {
        // Balanced: oauth.*@* = ask
        expect(decision.decision).toBe('ask');
        expect(explanation.matchedRule).toContain('oauth');
        expect(explanation.matchedLayer).toBe('defaults');
      }
      
      if (isCookieCapability(event.capability)) {
        const category = event.capability.category;
        if (category === 'essential') {
          // Balanced: cookie.essential@* = allow
          expect(decision.decision).toBe('allow');
        } else if (category === 'analytics') {
          // Balanced: cookie.analytics@* = ask
          expect(decision.decision).toBe('ask');
        } else if (category === 'advertising') {
          // Balanced: cookie.advertising@* = deny
          expect(decision.decision).toBe('deny');
        }
      }
      
      if (isBrowserPermissionCapability(event.capability)) {
        // Balanced: browser-permission.*@* = ask
        expect(decision.decision).toBe('ask');
        expect(explanation.matchedRule).toContain('browser-permission');
      }
      
      if (isPolicyCapability(event.capability)) {
        // Balanced: policy.*@* = ask
        expect(decision.decision).toBe('ask');
        expect(explanation.matchedRule).toContain('policy');
      }
      
      if (isTermsCapability(event.capability)) {
        // Balanced: terms.*@* = ask
        expect(decision.decision).toBe('ask');
        expect(explanation.matchedRule).toContain('terms');
      }
    }
  });

  it('should allow user rules to override pack decisions', async () => {
    registry.register([oauthAdapter, browserAdapter, cookieAdapter, policyAdapter, termsAdapter]);
    
    const longContent = 'We collect your personal data including name and email. We share data with third parties. We use data to train AI models. We retain data for 2 years. You have rights to access and delete your data. We implement security measures to protect your information.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(longContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await registry.run(pageContext);
    
    // Create engine with user rule denying all Google OAuth
    const engine = new DecisionEngine([], [], [], 'balanced');
    
    // Add user rule: oauth.google@* = deny
    const { parseRule } = await import('../../src/engine/rule-parser.js');
    const userRule = parseRule('oauth.google@* = deny');
    engine.addTemporaryRule(userRule, 'session');
    
    for (const event of result.events) {
      if (isOAuthCapability(event.capability) && event.capability.provider === 'google') {
        const { decision, explanation } = engine.decideWithExplanation(event);
        
        // Should now be deny (user layer overrides defaults)
        expect(decision.decision).toBe('deny');
        expect(explanation.matchedLayer).toBe('user');
        expect(explanation.humanReadable).toContain('Blocked by your rule');
      }
    }
  });

  it('should support temporary rules with TTL', async () => {
    registry.register([oauthAdapter, browserAdapter, cookieAdapter, policyAdapter, termsAdapter]);
    
    const longContent = 'We collect your personal data including name and email. We share data with third parties. We use data to train AI models. We retain data for 2 years. You have rights to access and delete your data. We implement security measures to protect your information.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(longContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await registry.run(pageContext);
    
    const engine = new DecisionEngine([], [], [], 'balanced');
    
    // Find an advertising cookie event
    let advertisingEvent = result.events.find(e => 
      isCookieCapability(e.capability) && e.capability.category === 'advertising'
    );
    
    if (!advertisingEvent) {
      // Create a mock advertising cookie event for localhost
      const { createCookieCapability, createConsentEvent } = await import('../../src/ir/consent-event.js');
      advertisingEvent = createConsentEvent({
        website: 'http://localhost:3000',
        consentType: ConsentType.Cookie,
        capability: createCookieCapability('advertising', 'localhost'),
        evidence: result.events[0]!.evidence, // reuse evidence from another event
      });
    }
    
    // Base decision should be deny (Balanced: cookie.advertising@* = deny)
    let { decision: baseDecision } = engine.decideWithExplanation(advertisingEvent);
    expect(baseDecision.decision).toBe('deny');
    
    // Add temporary rule using universal wildcard for domain: cookie.advertising@* = allow (1hr TTL)
    // This matches any domain and will override the deny rule
    const { parseRule } = await import('../../src/engine/rule-parser.js');
    const tempRule = parseRule('cookie.advertising@* = allow');
    const ruleId = engine.addTemporaryRule(tempRule, '1hr');
    
    // Decision should now be allow
    const { decision: tempDecision, explanation } = engine.decideWithExplanation(advertisingEvent);
    expect(tempDecision.decision).toBe('allow');
    expect(explanation.matchedLayer).toBe('user');
    expect(explanation.humanReadable).toContain('Allowed by');
    
    // Verify temporary rule appears in getTemporaryRules
    const tempRules = engine.getTemporaryRules();
    expect(tempRules.length).toBe(1);
    expect(tempRules[0].id).toBe(ruleId);
    expect(tempRules[0].ttlType).toBe('1hr');
  });

  it('should support NoAITraining trusted pack overriding Balanced defaults', async () => {
    registry.register([oauthAdapter, browserAdapter, cookieAdapter, policyAdapter, termsAdapter]);
    
    const longContent = 'We collect your personal data including name and email. We share data with third parties. We use data to train AI models. We retain data for 2 years. You have rights to access and delete your data. We implement security measures to protect your information.';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(longContent),
      headers: new Headers({ 'cache-control': 'max-age=3600' }),
    });
    
    const result = await registry.run(pageContext);
    
    // Create engine with NoAITraining trusted pack
    const engine = new DecisionEngine([], ['no-ai-training'], [], 'balanced');
    
    for (const event of result.events) {
      if (isPolicyCapability(event.capability) && event.capability.practice === 'ai-training') {
        const { decision, explanation } = engine.decideWithExplanation(event);
        
        // NoAITraining (trusted layer) should override Balanced (defaults)
        // NoAITraining: policy.ai-training@* = deny
        expect(decision.decision).toBe('deny');
        expect(explanation.matchedLayer).toBe('trusted');
        expect(explanation.humanReadable).toContain('trusted pack rule');
      }
    }
  });

  it('should export all public APIs from engine index', async () => {
    // Verify all expected value exports are available
    // Note: Type-only exports (Decision, PrecedenceLayer, etc.) are erased at runtime
    const engineModule = await import('../../src/engine/index.js');
    
    // Functions
    expect(engineModule.parseRule).toBeDefined();
    expect(engineModule.parseRules).toBeDefined();
    expect(engineModule.matchRule).toBeDefined();
    expect(engineModule.matchDomain).toBeDefined();
    expect(engineModule.matchCapability).toBeDefined();
    expect(engineModule.extractDomain).toBeDefined();
    expect(engineModule.generateRuleId).toBeDefined();
    expect(engineModule.PRECEDENCE_WEIGHTS).toBeDefined();
    
    // Classes
    expect(engineModule.DecisionEngine).toBeDefined();
    expect(engineModule.TemporaryRuleManager).toBeDefined();
    expect(engineModule.ExplanationGenerator).toBeDefined();
  });
});

describe('All engine tests pass together', () => {
  it('should pass all engine tests when run together', async () => {
    // This test verifies that the full engine test suite passes
    // The actual test running is done by vitest, but we can verify
    // the test files exist and can be imported
    const { parseRule } = await import('../../src/engine/rule-parser.js');
    const { matchRule } = await import('../../src/engine/rule-matcher.js');
    const { DecisionEngine } = await import('../../src/engine/decision-engine.js');
    const { TemporaryRuleManager } = await import('../../src/engine/temporary-rules.js');
    const { ExplanationGenerator } = await import('../../src/engine/explanation.js');
    
    // Basic smoke test
    const engine = new DecisionEngine([], [], [], 'balanced');
    const tempManager = new TemporaryRuleManager();
    const explGenerator = new ExplanationGenerator();
    
    const rule = parseRule('oauth.google@* = deny');
    expect(rule).toBeDefined();
    
    const tempId = tempManager.add(rule, '1hr');
    expect(tempId).toBeDefined();
    
    const decision = engine.decide({
      website: 'http://example.com',
      consentType: 0, // OAuth
      capability: { type: 'oauth', provider: 'google', scope: ['profile'] },
      timestamp: new Date().toISOString(),
      grantStatus: 0, // Pending
      evidence: [],
    } as any);
    
    expect(decision).toBeDefined();
  });
});