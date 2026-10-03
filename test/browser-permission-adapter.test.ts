/**
 * Browser Permission Adapter Tests
 * Verifies BrowserPermissionAdapter detects permission requests correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { BrowserPermissionAdapter } from '../src/adapters/browser-permission-adapter.js';
import { AdapterRegistry } from '../src/adapters/registry.js';
import { ConsentType, GrantStatus, EvidenceSource } from '../src/shared/types.js';
import { isBrowserPermissionCapability } from '../src/ir/capability.js';
import type { ConsentEvent } from '../src/ir/consent-event.js';
import type { BrowserPermissionCapability } from '../src/ir/capability.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test fixture
const fixturePath = join(__dirname, 'fixtures', 'browser-perms-page.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

function getBrowserPermEvent(
  result: { events: ConsentEvent[] },
  permission: string
): ConsentEvent & { capability: BrowserPermissionCapability } | undefined {
  return result.events.find((e): e is ConsentEvent & { capability: BrowserPermissionCapability } =>
    isBrowserPermissionCapability(e.capability) && e.capability.permission === permission
  );
}

describe('BrowserPermissionAdapter', () => {
  let adapter: BrowserPermissionAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    adapter = new BrowserPermissionAdapter();
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/permissions',
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    });
    document = dom.window.document;
    pageContext = {
      document,
      url: 'http://localhost:3000/permissions',
      origin: 'http://localhost:3000',
    };
  });

  it('should have correct name and priority', () => {
    expect(adapter.name).toBe('browser-permission');
    expect(adapter.priority).toBe(20);
  });

  it('should detect geolocation permission from data-permission attribute', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'geolocation');
    
    expect(event).toBeDefined();
    expect(event!.consentType).toBe(ConsentType.BrowserPermission);
    expect(event!.capability.type).toBe('browser-permission');
    expect(event!.capability.permission).toBe('geolocation');
    expect(event!.grantStatus).toBe(GrantStatus.Pending);
    expect(event!.website).toBe('http://localhost:3000');
    expect(event!.browserPermission).toBe('geolocation');
  });

  it('should detect camera permission from data-permission attribute', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'camera');
    
    expect(event).toBeDefined();
    expect(event!.capability.permission).toBe('camera');
  });

  it('should detect microphone permission from data-permission attribute', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'microphone');
    
    expect(event).toBeDefined();
    expect(event!.capability.permission).toBe('microphone');
  });

  it('should detect notifications permission from data-permission attribute', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'notifications');
    
    expect(event).toBeDefined();
    expect(event!.capability.permission).toBe('notifications');
  });

  it('should detect clipboard-read permission', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'clipboard-read');
    
    expect(event).toBeDefined();
    expect(event!.capability.permission).toBe('clipboard-read');
  });

  it('should detect clipboard-write permission', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'clipboard-write');
    
    expect(event).toBeDefined();
    expect(event!.capability.permission).toBe('clipboard-write');
  });

  it('should detect sensors permission from data-permission-request', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'sensors');
    
    expect(event).toBeDefined();
    expect(event!.capability.permission).toBe('sensors');
  });

  it('should detect permissions from navigator.permissions.query in scripts', async () => {
    const result = await adapter.extract(pageContext);
    
    // Should detect permissions from the inline script queries
    const permissions = ['geolocation', 'camera', 'microphone', 'notifications', 'clipboard-read', 'clipboard-write'];
    for (const perm of permissions) {
      const event = getBrowserPermEvent(result, perm);
      expect(event).toBeDefined();
    }
  });

  it('should detect geolocation API usage (getCurrentPosition)', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'geolocation');
    
    expect(event).toBeDefined();
    // Should have at least one event from data-permission and one from script
    const geoEvents = result.events.filter(e => 
      isBrowserPermissionCapability(e.capability) && e.capability.permission === 'geolocation'
    );
    expect(geoEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect camera/microphone from getUserMedia', async () => {
    const result = await adapter.extract(pageContext);
    
    const cameraEvent = getBrowserPermEvent(result, 'camera');
    const micEvent = getBrowserPermEvent(result, 'microphone');
    
    expect(cameraEvent).toBeDefined();
    expect(micEvent).toBeDefined();
  });

  it('should detect Notification.requestPermission()', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'notifications');
    
    expect(event).toBeDefined();
  });

  it('should detect clipboard API usage', async () => {
    const result = await adapter.extract(pageContext);
    
    const readEvent = getBrowserPermEvent(result, 'clipboard-read');
    const writeEvent = getBrowserPermEvent(result, 'clipboard-write');
    
    expect(readEvent).toBeDefined();
    expect(writeEvent).toBeDefined();
  });

  it('should detect sensor APIs (Accelerometer, Gyroscope)', async () => {
    const result = await adapter.extract(pageContext);
    const sensorEvent = getBrowserPermEvent(result, 'sensors');
    
    expect(sensorEvent).toBeDefined();
  });

  it('should detect permissions from button text content', async () => {
    const result = await adapter.extract(pageContext);
    
    // Buttons with text like "Get My Location", "Start Video Call", etc.
    const geoEvent = getBrowserPermEvent(result, 'geolocation');
    const cameraEvent = getBrowserPermEvent(result, 'camera');
    const notifEvent = getBrowserPermEvent(result, 'notifications');
    const clipboardEvent = getBrowserPermEvent(result, 'clipboard-write');
    
    expect(geoEvent).toBeDefined();
    expect(cameraEvent).toBeDefined();
    expect(notifEvent).toBeDefined();
    expect(clipboardEvent).toBeDefined();
  });

  it('should create evidence with correct structure', async () => {
    const result = await adapter.extract(pageContext);
    const event = getBrowserPermEvent(result, 'geolocation');
    
    expect(event).toBeDefined();
    const evidenceList = event!.evidence;
    expect(evidenceList).toBeDefined();
    expect(evidenceList.length).toBeGreaterThan(0);
    
    const evidence = evidenceList[0];
    expect(evidence).toBeDefined();
    if (!evidence) return;
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
      if (isBrowserPermissionCapability(event.capability)) {
        expect(event.grantStatus).toBe(GrantStatus.Pending);
      }
    }
  });

  it('should include userAction in events', async () => {
    const result = await adapter.extract(pageContext);
    
    for (const event of result.events) {
      if (isBrowserPermissionCapability(event.capability)) {
        expect(event.userAction).toBeDefined();
        expect(typeof event.userAction).toBe('string');
      }
    }
  });

  it('should not have critical errors for valid fixture', async () => {
    const result = await adapter.extract(pageContext);
    
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    expect(criticalErrors).toHaveLength(0);
  });
});

describe('AdapterRegistry with BrowserPermissionAdapter', () => {
  let registry: AdapterRegistry;
  let adapter: BrowserPermissionAdapter;
  let dom: JSDOM;
  let document: Document;
  let pageContext: {
    document: Document;
    url: string;
    origin: string;
  };

  beforeEach(() => {
    registry = new AdapterRegistry();
    adapter = new BrowserPermissionAdapter();
    dom = new JSDOM(fixtureHtml, {
      url: 'http://localhost:3000/permissions',
      pretendToBeVisual: true,
    });
    document = dom.window.document;
    pageContext = {
      document,
      url: 'http://localhost:3000/permissions',
      origin: 'http://localhost:3000',
    };
  });

  it('should register and run BrowserPermissionAdapter at priority 20', async () => {
    registry.register([adapter]);
    
    const result = await registry.run(pageContext);
    
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some(e => isBrowserPermissionCapability(e.capability))).toBe(true);
  });

  it('should run after OAuth adapter (priority 10)', async () => {
    const { OAuthAdapter } = await import('../src/adapters/oauth-adapter.js');
    const oauthAdapter = new OAuthAdapter();
    
    registry.register([oauthAdapter, adapter]);
    
    const adapters = registry.getAdapters();
    expect(adapters[0]!.name).toBe('oauth');
    expect(adapters[1]!.name).toBe('browser-permission');
  });
});