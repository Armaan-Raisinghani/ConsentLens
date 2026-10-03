/**
 * OAuth Adapter Tests
 * Verifies OAuthAdapter extracts correct ConsentEvent[] from test fixture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { OAuthAdapter } from '../src/adapters/oauth-adapter.js';
import { AdapterRegistry } from '../src/adapters/registry.js';
import { ConsentType, GrantStatus, EvidenceSource } from '../src/shared/types.js';
import { isOAuthCapability } from '../src/ir/capability.js';
import type { ConsentEvent } from '../src/ir/consent-event.js';
import type { OAuthCapability } from '../src/ir/capability.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test fixture
const fixturePath = join(__dirname, 'fixtures', 'oauth-page.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

function getOAuthEvent(result: { events: ConsentEvent[] }, provider: string): ConsentEvent & { capability: OAuthCapability } | undefined {
  return result.events.find((e): e is ConsentEvent & { capability: OAuthCapability } => 
    isOAuthCapability(e.capability) && e.capability.provider === provider
  );
}

describe('OAuthAdapter', () => {
  let adapter: OAuthAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    adapter = new OAuthAdapter();
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/login',
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    });
    document = dom.window.document;
    pageContext = {
      document,
      url: 'http://localhost:3000/login',
      origin: 'http://localhost:3000',
    };
  });

  it('should have correct name and priority', () => {
    expect(adapter.name).toBe('oauth');
    expect(adapter.priority).toBe(10);
  });

  it('should extract Google OAuth event with correct capability', async () => {
    const result = await adapter.extract(pageContext);
    
    const googleEvent = getOAuthEvent(result, 'google');
    
    expect(googleEvent).toBeDefined();
    expect(googleEvent!.consentType).toBe(ConsentType.OAuth);
    expect(googleEvent!.capability.type).toBe('oauth');
    expect(googleEvent!.capability.provider).toBe('google');
    expect(googleEvent!.capability.scope).toContain('profile');
    expect(googleEvent!.capability.scope).toContain('email');
    expect(googleEvent!.capability.scope).toContain('openid');
    expect(googleEvent!.capability.scope).toContain('https://www.googleapis.com/auth/drive.readonly');
    expect(googleEvent!.grantStatus).toBe(GrantStatus.Pending);
    expect(googleEvent!.website).toBe('http://localhost:3000');
    expect(googleEvent!.oauthScope).toBeDefined();
  });

  it('should extract GitHub OAuth event with correct capability', async () => {
    const result = await adapter.extract(pageContext);
    
    const githubEvent = getOAuthEvent(result, 'github');
    
    expect(githubEvent).toBeDefined();
    expect(githubEvent!.capability.provider).toBe('github');
    expect(githubEvent!.capability.scope).toContain('read:user');
    expect(githubEvent!.capability.scope).toContain('user:email');
    expect(githubEvent!.capability.scope).toContain('repo');
  });

  it('should extract Microsoft OAuth event with correct capability', async () => {
    const result = await adapter.extract(pageContext);
    
    const microsoftEvent = getOAuthEvent(result, 'microsoft');
    
    expect(microsoftEvent).toBeDefined();
    expect(microsoftEvent!.capability.provider).toBe('microsoft');
    expect(microsoftEvent!.capability.scope).toContain('User.Read');
    expect(microsoftEvent!.capability.scope).toContain('Mail.Read');
    expect(microsoftEvent!.capability.scope).toContain('Calendars.Read');
  });

  it('should extract Slack OAuth event with correct capability', async () => {
    const result = await adapter.extract(pageContext);
    
    const slackEvent = getOAuthEvent(result, 'slack');
    
    expect(slackEvent).toBeDefined();
    expect(slackEvent!.capability.provider).toBe('slack');
    expect(slackEvent!.capability.scope).toContain('channels:read');
    expect(slackEvent!.capability.scope).toContain('groups:read');
    expect(slackEvent!.capability.scope).toContain('chat:write');
  });

  it('should extract Discord OAuth event with correct capability', async () => {
    const result = await adapter.extract(pageContext);
    
    const discordEvent = getOAuthEvent(result, 'discord');
    
    expect(discordEvent).toBeDefined();
    expect(discordEvent!.capability.provider).toBe('discord');
    expect(discordEvent!.capability.scope).toContain('identify');
    expect(discordEvent!.capability.scope).toContain('email');
    expect(discordEvent!.capability.scope).toContain('guilds');
  });

  it('should extract generic OAuth fallback event', async () => {
    const result = await adapter.extract(pageContext);
    
    const genericEvent = getOAuthEvent(result, 'unknown');
    
    expect(genericEvent).toBeDefined();
    expect(genericEvent!.capability.provider).toBe('unknown');
    expect(genericEvent!.oauthScope).toContain('read');
    expect(genericEvent!.oauthScope).toContain('write');
  });

  it('should merge scopes from URL params and data attributes (D-14)', async () => {
    const result = await adapter.extract(pageContext);
    
    const googleEvent = getOAuthEvent(result, 'google');
    
    // Scopes from both URL and data-scope should be merged and deduplicated
    const scopes = googleEvent!.capability.scope;
    expect(scopes).toContain('profile');
    expect(scopes).toContain('email');
    expect(scopes).toContain('openid');
    expect(scopes).toContain('https://www.googleapis.com/auth/drive.readonly');
    // No duplicates
    expect(new Set(scopes).size).toBe(scopes.length);
  });

  it('should create evidence with correct structure', async () => {
    const result = await adapter.extract(pageContext);
    
    const googleEvent = getOAuthEvent(result, 'google');
    
    expect(googleEvent).toBeDefined();
    const event = googleEvent!; // Type narrowed after check
    // TypeScript doesn't narrow after throw, so we assert
    const evidenceList = event.evidence;
    if (!evidenceList || evidenceList.length === 0) {
      throw new Error('Expected evidence to be defined');
    }
    // TypeScript doesn't narrow after throw, assert the type
    const evidence = evidenceList[0]!;
    expect(evidence.source).toBe(EvidenceSource.DOM);
    expect(evidence.selector).toBeDefined();
    expect(evidence.confidence).toBeGreaterThan(0);
    expect(evidence.confidence).toBeLessThanOrEqual(1);
    expect(evidence.extractionMethod).toBeDefined();
    expect(evidence.extractedAt).toBeDefined();
  });

  it('should set grantStatus to pending by default', async () => {
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      expect(event.grantStatus).toBe(GrantStatus.Pending);
    }
  });

  it('should include userAction in events', async () => {
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      expect(event.userAction).toBeDefined();
      expect(typeof event.userAction).toBe('string');
    }
  });

  it('should not have critical errors for valid fixture', async () => {
    const result = await adapter.extract(pageContext);
    
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    expect(criticalErrors).toHaveLength(0);
  });
});

describe('AdapterRegistry with OAuthAdapter', () => {
  let registry: AdapterRegistry;
  let adapter: OAuthAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    registry = new AdapterRegistry();
    adapter = new OAuthAdapter();
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/login',
      pretendToBeVisual: true,
    });
    document = dom.window.document;
    pageContext = {
      document,
      url: 'http://localhost:3000/login',
      origin: 'http://localhost:3000',
    };
  });

  it('should register and run OAuthAdapter at priority 10', async () => {
    registry.register([adapter]);
    
    const result = await registry.run(pageContext);
    
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some(e => isOAuthCapability(e.capability))).toBe(true);
  });

  it('should run adapters in priority order', async () => {
    // Create a mock adapter with different priority
    const lowPriorityAdapter = {
      name: 'low-priority',
      priority: 50,
      async extract() {
        return { events: [], errors: [] };
      }
    };
    
    registry.register([lowPriorityAdapter, adapter]);
    
    // OAuth adapter (priority 10) should run before low-priority (priority 50)
    const adapters = registry.getAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(2);
    if (adapters.length >= 2) {
      expect(adapters[0]!.name).toBe('oauth');
      expect(adapters[1]!.name).toBe('low-priority');
    }
  });

  it('should support mutable context enrichment (D-24)', async () => {
    registry.register([adapter]);
    registry.setSharedContext('testKey', 'testValue');
    
    await registry.run(pageContext);
    
    const value = registry.getSharedContext('testKey');
    expect(value).not.toBeUndefined();
    expect(String(value)).toBe('testValue');
  });
});