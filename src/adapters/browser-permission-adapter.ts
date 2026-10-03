/**
 * Browser Permission Adapter - detects Permissions API usage per ADAPTER-02
 */

import { BaseAdapter } from './adapter.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import { createBrowserPermissionCapability } from '../ir/capability.js';
import { createDOMEvidence } from '../ir/evidence.js';
import type { AdapterResult, AdapterError, PageContext } from '../shared/errors.js';
import { ErrorSeverity } from '../shared/errors.js';
import { ConsentType, GrantStatus, ExtractionMethod } from '../shared/types.js';

/**
 * Known browser permissions to detect
 */
const BROWSER_PERMISSIONS = [
  'geolocation',
  'camera',
  'microphone',
  'notifications',
  'clipboard-read',
  'clipboard-write',
  'sensors',
  'accelerometer',
  'gyroscope',
  'magnetometer',
  'ambient-light-sensor',
  'payment-handler',
  'idle-detection',
  'periodic-background-sync',
  'background-fetch',
  'bluetooth',
  'usb',
  'hid',
  'serial',
  'nfc',
  'screen-wake-lock',
  'window-management',
  'display-capture',
  'local-fonts',
] as const;

type BrowserPermission = (typeof BROWSER_PERMISSIONS)[number];

/**
 * Patterns to detect permission requests in scripts
 */
const PERMISSION_PATTERNS = {
  // navigator.permissions.query({ name: '...' })
  query: /navigator\.permissions\.query\s*\(\s*\{\s*name\s*:\s*['"]([^'"]+)['"]/g,
  // navigator.permissions.request({ name: '...' }) - non-standard but used
  request: /navigator\.permissions\.request\s*\(\s*\{\s*name\s*:\s*['"]([^'"]+)['"]/g,
  // navigator.geolocation.getCurrentPosition, watchPosition
  geolocation: /navigator\.geolocation\.(getCurrentPosition|watchPosition)/g,
  // navigator.mediaDevices.getUserMedia({ video, audio })
  mediaDevices: /navigator\.mediaDevices\.getUserMedia\s*\(\s*\{[^}]*(video|audio)\s*:\s*true/g,
  // Notification.requestPermission()
  notifications: /Notification\.requestPermission\s*\(/g,
  // navigator.clipboard.readText(), writeText()
  clipboardRead: /navigator\.clipboard\.read(Text|Text)|read\(/g,
  clipboardWrite: /navigator\.clipboard\.write(Text|Text)|write\(/g,
  // Sensor APIs
  sensors: /new\s+(Accelerometer|Gyroscope|Magnetometer|AmbientLightSensor|AbsoluteOrientationSensor|RelativeOrientationSensor|LinearAccelerationSensor|GravitySensor)\s*\(/g,
} as const;



/**
 * BrowserPermissionAdapter class implementing Adapter interface
 * Priority: 20 (runs after OAuth per D-23)
 */
export class BrowserPermissionAdapter extends BaseAdapter {
  public readonly name = 'browser-permission';
  public readonly priority = 20;

  public async extract(context: PageContext): Promise<AdapterResult> {
    const { document, url, origin } = context;
    const events: ConsentEvent[] = [];
    const errors: AdapterError[] = [];

    try {
      // 1. Detect permission requests in inline scripts
      const scriptEvents = this.detectPermissionsInScripts(document, url, origin);
      events.push(...scriptEvents);

      // 2. Detect permission-related UI elements
      const uiEvents = this.detectPermissionUIElements(document, url, origin);
      events.push(...uiEvents);

      // 3. Check for Permissions API usage in meta tags
      const metaEvents = this.detectPermissionMetaTags(document, url, origin);
      events.push(...metaEvents);
    } catch (err) {
      errors.push(
        this.createError(
          `Browser permission adapter extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          'BROWSER_PERMISSION_ADAPTER_ERROR',
          ErrorSeverity.Error
        )
      );
    }

    return { events, errors };
  }

  /**
   * Detect permission requests in script tags
   */
  private detectPermissionsInScripts(
    document: Document,
    url: string,
    origin: string
  ): ConsentEvent[] {
    const events: ConsentEvent[] = [];
    const scripts = document.querySelectorAll('script');

    for (const script of scripts) {
      const content = script.textContent || '';
      if (!content.trim()) continue;

      // Check for navigator.permissions.query
      const queryMatches = content.matchAll(PERMISSION_PATTERNS.query);
      for (const match of queryMatches) {
        const permission = match[1];
        if (permission && this.isValidPermission(permission)) {
          events.push(this.createPermissionEvent(permission, script, url, origin, 'query'));
        }
      }

      // Check for navigator.permissions.request
      const requestMatches = content.matchAll(PERMISSION_PATTERNS.request);
      for (const match of requestMatches) {
        const permission = match[1];
        if (permission && this.isValidPermission(permission)) {
          events.push(this.createPermissionEvent(permission, script, url, origin, 'request'));
        }
      }

      // Check for geolocation API
      if (PERMISSION_PATTERNS.geolocation.test(content)) {
        events.push(this.createPermissionEvent('geolocation', script, url, origin, 'geolocation-api'));
      }

      // Check for media devices (camera/microphone)
      if (PERMISSION_PATTERNS.mediaDevices.test(content)) {
        // Try to determine if video or audio or both
        const videoMatch = content.match(/video\s*:\s*true/);
        const audioMatch = content.match(/audio\s*:\s*true/);
        if (videoMatch) {
          events.push(this.createPermissionEvent('camera', script, url, origin, 'getUserMedia'));
        }
        if (audioMatch) {
          events.push(this.createPermissionEvent('microphone', script, url, origin, 'getUserMedia'));
        }
        if (!videoMatch && !audioMatch) {
          // Generic media devices - add both
          events.push(this.createPermissionEvent('camera', script, url, origin, 'getUserMedia'));
          events.push(this.createPermissionEvent('microphone', script, url, origin, 'getUserMedia'));
        }
      }

      // Check for notifications
      if (PERMISSION_PATTERNS.notifications.test(content)) {
        events.push(this.createPermissionEvent('notifications', script, url, origin, 'Notification.requestPermission'));
      }

      // Check for clipboard API
      if (PERMISSION_PATTERNS.clipboardRead.test(content)) {
        events.push(this.createPermissionEvent('clipboard-read', script, url, origin, 'clipboard.read'));
      }
      if (PERMISSION_PATTERNS.clipboardWrite.test(content)) {
        events.push(this.createPermissionEvent('clipboard-write', script, url, origin, 'clipboard.write'));
      }

      // Check for sensor APIs
      const sensorMatches = content.matchAll(PERMISSION_PATTERNS.sensors);
      for (const match of sensorMatches) {
        const sensorType = match[1]?.toLowerCase();
        if (!sensorType) continue;
        // Map sensor constructors to permission names
        const permissionMap: Record<string, BrowserPermission> = {
          accelerometer: 'sensors',
          gyroscope: 'sensors',
          magnetometer: 'sensors',
          ambientlightsensor: 'sensors',
          absoluteorientationsensor: 'sensors',
          relativeorientationsensor: 'sensors',
          linearaccelerationsensor: 'sensors',
          gravitysensor: 'sensors',
        };
        const permission = permissionMap[sensorType] || 'sensors';
        events.push(this.createPermissionEvent(permission, script, url, origin, `sensor:${sensorType}`));
      }
    }

    return events;
  }

  /**
   * Detect permission-related UI elements (buttons, links)
   */
  private detectPermissionUIElements(
    document: Document,
    url: string,
    origin: string
  ): ConsentEvent[] {
    const events: ConsentEvent[] = [];

    // Look for elements with data-permission attributes
    const permissionElements = document.querySelectorAll('[data-permission]');
    for (const element of permissionElements) {
      const permission = element.getAttribute('data-permission')?.toLowerCase().trim();
      if (permission && this.isValidPermission(permission)) {
        const text = (element.textContent || '').trim();
        events.push(this.createUIPermissionEvent(permission, element, text, url, origin));
      }
    }

    // Look for elements with data-permission-request
    const requestElements = document.querySelectorAll('[data-permission-request]');
    for (const element of requestElements) {
      const permission = element.getAttribute('data-permission-request')?.toLowerCase().trim();
      if (permission && this.isValidPermission(permission)) {
        const text = (element.textContent || '').trim();
        events.push(this.createUIPermissionEvent(permission, element, text, url, origin));
      }
    }

    // Look for common permission button patterns
    const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]');
    for (const button of buttons) {
      const text = (button.textContent || '').trim().toLowerCase();
      const onclick = button.getAttribute('onclick') || '';

      // Check button text for permission-related keywords
      const permissionFromText = this.inferPermissionFromText(text);
      if (permissionFromText) {
        events.push(this.createUIPermissionEvent(permissionFromText, button, text, url, origin));
        continue;
      }

      // Check onclick handler
      const permissionFromOnclick = this.inferPermissionFromText(onclick);
      if (permissionFromOnclick) {
        events.push(this.createUIPermissionEvent(permissionFromOnclick, button, text, url, origin));
      }
    }

    return events;
  }

  /**
   * Detect permission-related meta tags
   */
  private detectPermissionMetaTags(
    document: Document,
    url: string,
    origin: string
  ): ConsentEvent[] {
    const events: ConsentEvent[] = [];

    const metaTags = document.querySelectorAll('meta[name*="permission" i], meta[property*="permission" i]');
    for (const meta of metaTags) {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';
      const permission = this.inferPermissionFromText(content) || this.inferPermissionFromText(name);
      
      if (permission) {
        const evidence = createDOMEvidence({
          selector: `meta[name="${name}"]`,
          text: `Permission meta tag: ${content}`,
          confidence: 0.6,
          extractionMethod: ExtractionMethod.MetaTag,
          url,
        });

        events.push(this.createConsentEventFromEvidence(permission, origin, evidence, 'meta-tag'));
      }
    }

    return events;
  }

  /**
   * Create a consent event for a detected permission from script
   */
  private createPermissionEvent(
    permission: BrowserPermission,
    element: Element,
    url: string,
    origin: string,
    method: string
  ): ConsentEvent {
    const capability = createBrowserPermissionCapability(permission);
    const selector = this.getSelector(element);
    const text = (element.textContent || '').trim().substring(0, 200);

    const evidence = createDOMEvidence({
      selector,
      text: `${method}: ${permission}${text ? ` - ${text}` : ''}`,
      confidence: 0.85,
      extractionMethod: ExtractionMethod.Regex,
      url,
    });

    return {
      website: origin,
      consentType: ConsentType.BrowserPermission,
      capability,
      browserPermission: permission,
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
      evidence: [evidence],
      userAction: `script:${method}`,
    };
  }

  /**
   * Create a consent event for a UI permission element
   */
  private createUIPermissionEvent(
    permission: BrowserPermission,
    element: Element,
    text: string,
    url: string,
    origin: string
  ): ConsentEvent {
    const capability = createBrowserPermissionCapability(permission);
    const selector = this.getSelector(element);

    const evidence = createDOMEvidence({
      selector,
      text: `UI permission request: ${permission}${text ? ` - ${text}` : ''}`,
      confidence: 0.75,
      extractionMethod: ExtractionMethod.Attribute,
      url,
    });

    return {
      website: origin,
      consentType: ConsentType.BrowserPermission,
      capability,
      browserPermission: permission,
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
      evidence: [evidence],
      userAction: `click:${selector}`,
    };
  }

  /**
   * Create consent event from evidence object
   */
  private createConsentEventFromEvidence(
    permission: BrowserPermission,
    origin: string,
    evidence: ReturnType<typeof createDOMEvidence>,
    userAction: string
  ): ConsentEvent {
    const capability = createBrowserPermissionCapability(permission);
    return {
      website: origin,
      consentType: ConsentType.BrowserPermission,
      capability,
      browserPermission: permission,
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
      evidence: [evidence],
      userAction,
    };
  }

  /**
   * Check if a string is a valid browser permission
   */
  private isValidPermission(permission: string): permission is BrowserPermission {
    const normalized = permission.toLowerCase().trim();
    return BROWSER_PERMISSIONS.includes(normalized as BrowserPermission);
  }

  /**
   * Infer permission type from text content
   */
  private inferPermissionFromText(text: string): BrowserPermission | null {
    const lower = text.toLowerCase();
    
    const permissionKeywords: Record<BrowserPermission, string[]> = {
      geolocation: ['geolocation', 'location', 'gps', 'position'],
      camera: ['camera', 'video', 'webcam'],
      microphone: ['microphone', 'mic', 'audio', 'voice'],
      notifications: ['notification', 'notify', 'alert', 'push'],
      'clipboard-read': ['clipboard read', 'read clipboard', 'paste'],
      'clipboard-write': ['clipboard write', 'write clipboard', 'copy'],
      sensors: ['sensor', 'motion', 'accelerometer', 'gyroscope', 'orientation'],
      accelerometer: ['accelerometer'],
      gyroscope: ['gyroscope'],
      magnetometer: ['magnetometer', 'compass'],
      'ambient-light-sensor': ['ambient light', 'light sensor'],
      'payment-handler': ['payment', 'pay'],
      'idle-detection': ['idle', 'inactivity'],
      'periodic-background-sync': ['background sync', 'periodic sync'],
      'background-fetch': ['background fetch'],
      bluetooth: ['bluetooth', 'ble'],
      usb: ['usb'],
      hid: ['hid', 'human interface'],
      serial: ['serial'],
      nfc: ['nfc', 'near field'],
      'screen-wake-lock': ['wake lock', 'screen wake', 'keep awake'],
      'window-management': ['window management', 'window control'],
      'display-capture': ['display capture', 'screen capture', 'screen share'],
      'local-fonts': ['local fonts', 'font access'],
    };

    for (const [permission, keywords] of Object.entries(permissionKeywords)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return permission as BrowserPermission;
        }
      }
    }

    return null;
  }

  /**
   * Generate a CSS selector for an element
   */
  private getSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(Boolean).join('.');
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }
    return element.tagName.toLowerCase();
  }
}