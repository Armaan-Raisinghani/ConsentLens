/**
 * Cookie Adapter - reads and classifies cookies per ADAPTER-03, D-16, D-17, D-18
 */

import { BaseAdapter } from './adapter.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import { createCookieCapability } from '../ir/capability.js';
import { createDOMEvidence, createHeuristicEvidence } from '../ir/evidence.js';
import type { AdapterResult, AdapterError, PageContext } from '../shared/errors.js';
import { ErrorSeverity } from '../shared/errors.js';
import { ConsentType, GrantStatus, ExtractionMethod } from '../shared/types.js';
import { parse as pslParse } from 'psl';

/**
 * Cookie category enumeration
 */
export enum CookieCategory {
  Essential = 'essential',
  Analytics = 'analytics',
  Advertising = 'advertising',
  Personalization = 'personalization',
  Functional = 'functional',
  Security = 'security',
  Unknown = 'unknown',
}

/**
 * Tracker list entry
 */
interface TrackerEntry {
  domain: string;
  category: CookieCategory;
  source: 'disconnect' | 'easyprivacy';
}

/**
 * Parsed cookie structure
 */
interface ParsedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: Date;
  maxAge?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none' | 'unknown';
  isSession: boolean;
}

/**
 * Disconnect tracker list (subset - full list embedded at build time)
 * This is a representative sample; in production, download full list at build
 */
const DISCONNECT_TRACKERS: TrackerEntry[] = [
  // Google Analytics / Advertising
  { domain: 'google-analytics.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'googletagmanager.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'googlesyndication.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'doubleclick.net', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'googleadservices.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Facebook / Meta
  { domain: 'facebook.net', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'facebook.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'connect.facebook.net', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'fbcdn.net', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Twitter / X
  { domain: 'twitter.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 't.co', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'twimg.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Adobe
  { domain: 'adobe.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'omtrdc.net', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'demdex.net', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Amazon
  { domain: 'amazon-adsystem.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'amazonaws.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Microsoft
  { domain: 'microsoft.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'bing.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'bat.bing.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Yahoo / Verizon Media
  { domain: 'yahoo.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'yahoodns.net', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Criteo
  { domain: 'criteo.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'criteo.net', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // AppNexus / Xandr
  { domain: 'appnexus.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'xandr.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Rubicon Project / Magnite
  { domain: 'rubiconproject.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'magnite.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // PubMatic
  { domain: 'pubmatic.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // OpenX
  { domain: 'openx.net', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Index Exchange
  { domain: 'indexexchange.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Sovrn
  { domain: 'sovrn.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Taboola / Outbrain
  { domain: 'taboola.com', category: CookieCategory.Advertising, source: 'disconnect' },
  { domain: 'outbrain.com', category: CookieCategory.Advertising, source: 'disconnect' },
  
  // ScorecardResearch / comScore
  { domain: 'scorecardresearch.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'comscore.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Quantcast
  { domain: 'quantcast.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'quantserve.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // New Relic
  { domain: 'newrelic.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'nr-data.net', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Hotjar
  { domain: 'hotjar.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'hotjar.io', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Mixpanel
  { domain: 'mixpanel.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Amplitude
  { domain: 'amplitude.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Segment
  { domain: 'segment.com', category: CookieCategory.Analytics, source: 'disconnect' },
  { domain: 'segment.io', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Heap
  { domain: 'heapanalytics.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // FullStory
  { domain: 'fullstory.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Lucky Orange
  { domain: 'luckyorange.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Crazy Egg
  { domain: 'crazyegg.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Mouseflow
  { domain: 'mouseflow.com', category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Inspectlet
  { domain: 'inspectlet.com', category: CookieCategory.Analytics, source: 'disconnect' },
];

/**
 * EasyPrivacy tracker list (subset)
 */
const EASYPRIVACY_TRACKERS: TrackerEntry[] = [
  // Additional trackers from EasyPrivacy
  { domain: 'addthis.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'sharethis.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'addtoany.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'disqus.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'gravatar.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'typekit.net', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'fonts.googleapis.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'ajax.googleapis.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'cdnjs.cloudflare.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'maxcdn.bootstrapcdn.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'code.jquery.com', category: CookieCategory.Advertising, source: 'easyprivacy' },
  { domain: 'api.mixpanel.com', category: CookieCategory.Analytics, source: 'easyprivacy' },
  { domain: 'cdn.mxpnl.com', category: CookieCategory.Analytics, source: 'easyprivacy' },
  { domain: 'api.segment.io', category: CookieCategory.Analytics, source: 'easyprivacy' },
  { domain: 'cdn.segment.com', category: CookieCategory.Analytics, source: 'easyprivacy' },
];

/**
 * Essential cookie name patterns (common session/auth cookies)
 */
const ESSENTIAL_COOKIE_PATTERNS = [
  /^session/i,
  /^sess_/i,
  /^PHPSESSID$/i,
  /^JSESSIONID$/i,
  /^ASP\.NET_SessionId$/i,
  /^csrf/i,
  /^xsrf/i,
  /^_csrf/i,
  /^auth/i,
  /^token/i,
  /^jwt/i,
  /^_gat/i, // Google Analytics throttle
  /^_gid/i, // Google Analytics
  /^_ga$/i, // Google Analytics (but this is analytics, handled by tracker list)
  /^__RequestVerificationToken/i,
  /^__stripe/i,
  /^stripe_/i,
] as const;

/**
 * Functional cookie name patterns
 */
const FUNCTIONAL_COOKIE_PATTERNS = [
  /^lang/i,
  /^locale/i,
  /^currency/i,
  /^theme/i,
  /^pref/i,
  /^settings/i,
  /^consent/i,
  /^gdpr/i,
  /^cookieconsent/i,
] as const;

/**
 * Security cookie name patterns
 */
const SECURITY_COOKIE_PATTERNS = [
  /^__Host-/i,
  /^__Secure-/i,
  /^_cf_/i,
  /^cfray/i,
  /^__cf_/i,
  /^cf_clearance$/i,
] as const;

/**
 * Known tracker cookie name patterns (cookies set by trackers on first-party domains)
 * These are commonly used tracking cookies that can be identified by name alone
 */
const TRACKER_COOKIE_PATTERNS: Array<{ pattern: RegExp; category: CookieCategory; source: 'disconnect' | 'easyprivacy' }> = [
  // Google Analytics
  { pattern: /^_ga($|_)/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^_gid$/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^_gat/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^_dc_gtm/i, category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Google Ads
  { pattern: /^_gcl_/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^IDE$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^test_cookie$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^DSID$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Facebook/Meta
  { pattern: /^_fbp$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^fr$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^_fbc$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Hotjar
  { pattern: /^_hjSession/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^_hjSessionUser/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^_hjAbsoluteSessionInProgress/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^_hjIncludedIn/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^_hjFirstSeen/i, category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Microsoft/Bing
  { pattern: /^MUID$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^MR$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^SRM_B$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Twitter/X
  { pattern: /^personalization_id$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^guest_id/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^auth_token$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Adobe
  { pattern: /^AMCV_/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^AMCVS_/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^s_cc$/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^s_sq$/i, category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Amazon
  { pattern: /^ad-id$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^ad-privacy$/i, category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Criteo
  { pattern: /^criteo_/i, category: CookieCategory.Advertising, source: 'disconnect' },
  { pattern: /^cto_/i, category: CookieCategory.Advertising, source: 'disconnect' },
  
  // Quantcast
  { pattern: /^__qca$/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^mc$/i, category: CookieCategory.Analytics, source: 'disconnect' },
  
  // ScorecardResearch
  { pattern: /^UID$/i, category: CookieCategory.Analytics, source: 'disconnect' },
  { pattern: /^UIDR$/i, category: CookieCategory.Analytics, source: 'disconnect' },
  
  // New Relic
  { pattern: /^NR_/i, category: CookieCategory.Analytics, source: 'disconnect' },
  
  // Mixpanel
  { pattern: /^mp_/i, category: CookieCategory.Analytics, source: 'easyprivacy' },
  
  // Segment
  { pattern: /^ajs_/i, category: CookieCategory.Analytics, source: 'easyprivacy' },
  { pattern: /^analytics_/i, category: CookieCategory.Analytics, source: 'easyprivacy' },
  
  // Heap
  { pattern: /^heap_/i, category: CookieCategory.Analytics, source: 'easyprivacy' },
  
  // Amplitude
  { pattern: /^amplitude_/i, category: CookieCategory.Analytics, source: 'easyprivacy' },
  
  // FullStory
  { pattern: /^fs_/i, category: CookieCategory.Analytics, source: 'easyprivacy' },
];

/**
 * Combined tracker list
 */
const ALL_TRACKERS = [...DISCONNECT_TRACKERS, ...EASYPRIVACY_TRACKERS];

/**
 * Build tracker domain index for fast lookup
 */
function buildTrackerIndex(): Map<string, TrackerEntry> {
  const index = new Map<string, TrackerEntry>();
  for (const tracker of ALL_TRACKERS) {
    index.set(tracker.domain.toLowerCase(), tracker);
  }
  return index;
}

const TRACKER_INDEX = buildTrackerIndex();

/**
 * CookieAdapter class implementing Adapter interface
 * Priority: 30 (runs after Browser Permission per D-23)
 */
export class CookieAdapter extends BaseAdapter {
  public readonly name = 'cookie';
  public readonly priority = 30;

  private cookieStoreSupported: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  public async extract(context: PageContext): Promise<AdapterResult> {
    const { document, url, origin } = context;
    const events: ConsentEvent[] = [];
    const errors: AdapterError[] = [];

    try {
      // Check CookieStore API support
      this.cookieStoreSupported = 'cookieStore' in document.defaultView!;

      // 1. Extract cookies from document.cookie
      const documentCookies = this.parseDocumentCookies(document.cookie, origin);
      for (const cookie of documentCookies) {
        const event = this.classifyCookie(cookie, url, origin, 'document.cookie');
        if (event) events.push(event);
      }

      // 2. If CookieStore API supported, get cookies from there too
      if (this.cookieStoreSupported) {
        try {
          const cookieStoreCookies = await this.getCookieStoreCookies(origin);
          for (const cookie of cookieStoreCookies) {
            // Avoid duplicates from document.cookie
            const exists = documentCookies.some(c => c.name === cookie.name && c.domain === cookie.domain);
            if (!exists) {
              const event = this.classifyCookie(cookie, url, origin, 'CookieStore API');
              if (event) events.push(event);
            }
          }
        } catch (err) {
          errors.push(
            this.createError(
              `CookieStore API failed: ${err instanceof Error ? err.message : String(err)}`,
              'COOKIE_STORE_ERROR',
              ErrorSeverity.Warning
            )
          );
        }
      }

      // 3. Set up polling for dynamic cookies if CookieStore supported
      // (In real implementation, this would be started and stopped externally)
    } catch (err) {
      errors.push(
        this.createError(
          `Cookie adapter extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          'COOKIE_ADAPTER_ERROR',
          ErrorSeverity.Error
        )
      );
    }

    return { events, errors };
  }

  /**
   * Parse cookies from document.cookie string
   * Note: document.cookie only returns name=value pairs, not attributes
   * Attributes (path, domain, secure, httponly, samesite, expires) are not available
   */
  private parseDocumentCookies(cookieString: string, pageOrigin: string): ParsedCookie[] {
    const cookies: ParsedCookie[] = [];
    if (!cookieString) return cookies;

    // Split by '; ' to get individual cookies (each is name=value)
    const cookieParts = cookieString.split('; ');
    
    for (const part of cookieParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Find the first '=' to separate name from value
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const name = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();

      // document.cookie doesn't provide attributes, so use defaults
      const domain = this.getCookieDomain(pageOrigin);
      const path = '/';
      const secure = pageOrigin.startsWith('https:');
      const httpOnly = false; // Can't determine from document.cookie
      const sameSite: ParsedCookie['sameSite'] = 'unknown';
      const isSession = true; // Can't determine from document.cookie

      cookies.push({
        name,
        value,
        domain,
        path,
        expires: undefined,
        maxAge: undefined,
        secure,
        httpOnly,
        sameSite,
        isSession,
      });
    }

    return cookies;
  }

  /**
   * Get the effective domain for cookies without explicit domain
   */
  private getCookieDomain(pageOrigin: string): string {
    try {
      const url = new URL(pageOrigin);
      return url.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Get cookies from CookieStore API
   */
  private async getCookieStoreCookies(origin: string): Promise<ParsedCookie[]> {
    const cookies: ParsedCookie[] = [];
    
    if (!('cookieStore' in globalThis)) return cookies;
    
    const cookieStore = (globalThis as any).cookieStore;
    if (!cookieStore || typeof cookieStore.getAll !== 'function') return cookies;

    try {
      const allCookies = await cookieStore.getAll({});
      for (const cookie of allCookies) {
        cookies.push({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || this.getCookieDomain(origin),
          path: cookie.path || '/',
          expires: cookie.expires ? new Date(cookie.expires * 1000) : undefined,
          secure: cookie.secure || false,
          httpOnly: cookie.httpOnly || false,
          sameSite: cookie.sameSite || 'unknown',
          isSession: !cookie.expires,
        });
      }
    } catch {
      // CookieStore API might throw in some contexts
    }

    return cookies;
  }

  /**
   * Classify a cookie and create a consent event
   */
  private classifyCookie(
    cookie: ParsedCookie,
    pageUrl: string,
    pageOrigin: string,
    source: string
  ): ConsentEvent | null {
    // Determine first/third-party using eTLD+1 per D-17
    const pageDomain = this.getETLDPlus1(pageOrigin);
    const cookieDomain = this.getETLDPlus1(cookie.domain);
    const isFirstParty = pageDomain === cookieDomain;

    // Classify cookie
    const classification = this.classifyCookieByNameAndDomain(cookie.name, cookie.domain);
    const category = classification.category;
    const classificationSource = classification.source;

    // Determine confidence based on classification source
    let confidence = 0.5;
    if (classificationSource === 'tracker-list') confidence = 0.95;
    else if (classificationSource === 'essential-pattern') confidence = 0.85;
    else if (classificationSource === 'functional-pattern') confidence = 0.8;
    else if (classificationSource === 'security-pattern') confidence = 0.8;
    else if (classificationSource === 'heuristic') confidence = 0.4;

    // Create capability
    const capability = createCookieCapability(category, cookie.name, cookie.domain);

    // Create evidence
    const evidence = createHeuristicEvidence({
      text: `Cookie: ${cookie.name}=${cookie.value.substring(0, 50)}...; Domain: ${cookie.domain}; Category: ${category} (${classificationSource}); First-party: ${isFirstParty}`,
      confidence,
      url: pageUrl,
    });

    // Also add DOM evidence for the cookie
    const domEvidence = createDOMEvidence({
      selector: 'document.cookie',
      text: `${cookie.name}=${cookie.value.substring(0, 100)}`,
      confidence: 0.9,
      extractionMethod: ExtractionMethod.TextContent,
      url: pageUrl,
    });

    return {
      website: pageOrigin,
      consentType: ConsentType.Cookie,
      capability,
      cookieCategory: category,
      timestamp: new Date().toISOString(),
      grantStatus: GrantStatus.Pending,
      evidence: [domEvidence, evidence],
      userAction: `cookie:${source}`,
      resource: cookie.domain,
    };
  }

  /**
   * Classify cookie by name and domain using tracker lists and heuristics
   */
  private classifyCookieByNameAndDomain(
    name: string,
    domain: string
  ): { category: CookieCategory; source: string } {
    const lowerDomain = domain.toLowerCase();
    const lowerName = name.toLowerCase();

    // 1. Check tracker cookie name patterns (cookies set by trackers on first-party domains)
    for (const { pattern, category, source } of TRACKER_COOKIE_PATTERNS) {
      if (pattern.test(lowerName)) {
        return { category, source: `tracker-cookie-${source}` };
      }
    }

    // 2. Check tracker lists (D-16) by domain - highest priority for third-party cookies
    for (const [trackerDomain, tracker] of TRACKER_INDEX) {
      if (this.domainMatches(lowerDomain, trackerDomain)) {
        return { category: tracker.category, source: 'tracker-list' };
      }
    }

    // 3. Check essential cookie patterns
    for (const pattern of ESSENTIAL_COOKIE_PATTERNS) {
      if (pattern.test(lowerName)) {
        return { category: CookieCategory.Essential, source: 'essential-pattern' };
      }
    }

    // 4. Check functional cookie patterns
    for (const pattern of FUNCTIONAL_COOKIE_PATTERNS) {
      if (pattern.test(lowerName)) {
        return { category: CookieCategory.Functional, source: 'functional-pattern' };
      }
    }

    // 5. Check security cookie patterns
    for (const pattern of SECURITY_COOKIE_PATTERNS) {
      if (pattern.test(lowerName)) {
        return { category: CookieCategory.Security, source: 'security-pattern' };
      }
    }

    // 6. Heuristic: if third-party and not matched above, likely advertising/tracking
    // This would be more accurate with full tracker lists
    return { category: CookieCategory.Unknown, source: 'heuristic' };
  }

  /**
   * Get eTLD+1 (effective top-level domain + 1) using psl per D-17
   */
  private getETLDPlus1(urlOrDomain: string): string {
    try {
      let hostname: string;
      try {
        const url = new URL(urlOrDomain);
        hostname = url.hostname;
      } catch {
        hostname = urlOrDomain;
      }
      
      const parsed = pslParse(hostname);
      // Type guard: check if it's a ParsedDomain (not ErrorResult)
      if (parsed && 'domain' in parsed && parsed.domain) {
        return parsed.domain.toLowerCase();
      }
      return hostname.toLowerCase();
    } catch {
      return urlOrDomain.toLowerCase();
    }
  }

  /**
   * Check if a cookie domain matches a tracker domain (handles subdomains)
   */
  private domainMatches(cookieDomain: string, trackerDomain: string): boolean {
    if (cookieDomain === trackerDomain) return true;
    // Check if cookieDomain is a subdomain of trackerDomain
    // e.g., cookieDomain = "analytics.google.com", trackerDomain = "google.com"
    return cookieDomain.endsWith('.' + trackerDomain);
  }

  /**
   * Start polling for dynamic cookies (D-18)
   * This would be called by the registry when starting continuous monitoring
   */
  public startDynamicCookiePolling(
    context: PageContext,
    onNewCookies: (cookies: ConsentEvent[]) => void,
    intervalMs: number = 5000
  ): void {
    if (!this.cookieStoreSupported) return;
    if (this.pollingInterval) return; // Already polling

    let knownCookies = new Set<string>();

    const poll = async () => {
      try {
        const cookies = await this.getCookieStoreCookies(context.origin);
        const newCookies: ConsentEvent[] = [];

        for (const cookie of cookies) {
          const key = `${cookie.domain}:${cookie.name}`;
          if (!knownCookies.has(key)) {
            knownCookies.add(key);
            const event = this.classifyCookie(cookie, context.url, context.origin, 'CookieStore API (polling)');
            if (event) newCookies.push(event);
          }
        }

        if (newCookies.length > 0) {
          onNewCookies(newCookies);
        }
      } catch {
        // Ignore polling errors
      }
    };

    this.pollingInterval = setInterval(poll, intervalMs);
    // Initial poll
    poll();
  }

  /**
   * Stop polling for dynamic cookies
   */
  public stopDynamicCookiePolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}