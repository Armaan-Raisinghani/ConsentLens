/**
 * OAuth Adapter - detects OAuth consent flows per D-13, D-14, D-15
 */

import { BaseAdapter } from './adapter.js';
import { ConsentEvent, createOAuthConsentEvent } from '../ir/consent-event.js';
import { createOAuthCapability } from '../ir/capability.js';
import { createDOMEvidence } from '../ir/evidence.js';
import { AdapterResult, AdapterError, PageContext } from '../shared/errors.js';
import { EvidenceSource, ExtractionMethod, ConsentType, GrantStatus } from '../shared/types.js';

/**
 * Known OAuth providers with their scope patterns
 */
const OAUTH_PROVIDERS = [
  {
    name: 'google',
    patterns: [
      /accounts\.google\.com/,
      /googleapis\.com\/auth/,
      /oauth2\.googleapis\.com/,
    ],
    buttonTextPatterns: [
      /continue with google/i,
      /sign in with google/i,
      /login with google/i,
      /google sign.in/i,
    ],
    scopeParam: 'scope',
  },
  {
    name: 'github',
    patterns: [
      /github\.com\/login\/oauth/,
      /github\.com\/auth/,
    ],
    buttonTextPatterns: [
      /continue with github/i,
      /sign in with github/i,
      /login with github/i,
      /github sign.in/i,
    ],
    scopeParam: 'scope',
  },
  {
    name: 'microsoft',
    patterns: [
      /login\.microsoftonline\.com/,
      /login\.live\.com/,
      /microsoftonline\.com\/oauth/,
    ],
    buttonTextPatterns: [
      /continue with microsoft/i,
      /sign in with microsoft/i,
      /login with microsoft/i,
      /microsoft sign.in/i,
      /continue with outlook/i,
      /sign in with outlook/i,
    ],
    scopeParam: 'scope',
  },
  {
    name: 'slack',
    patterns: [
      /slack\.com\/oauth/,
      /slack\.com\/auth/,
    ],
    buttonTextPatterns: [
      /continue with slack/i,
      /sign in with slack/i,
      /login with slack/i,
      /slack sign.in/i,
      /add to slack/i,
    ],
    scopeParam: 'scope',
  },
  {
    name: 'discord',
    patterns: [
      /discord\.com\/oauth2/,
      /discord\.com\/api\/oauth2/,
    ],
    buttonTextPatterns: [
      /continue with discord/i,
      /sign in with discord/i,
      /login with discord/i,
      /discord sign.in/i,
      /authorize with discord/i,
    ],
    scopeParam: 'scope',
  },
] as const;

/**
 * Generic OAuth detection patterns (fallback per D-13)
 */
const GENERIC_OAUTH_PATTERNS = [
  /\/oauth\/authorize/i,
  /\/oauth2\/authorize/i,
  /\/auth\/oauth/i,
  /\/login\/oauth/i,
  /\?client_id=/i,
  /response_type=code/i,
  /scope=/i,
];

/**
 * OAuthAdapter class implementing Adapter interface
 * Priority: 10 (runs first per D-23 suggestion)
 */
export class OAuthAdapter extends BaseAdapter {
  public readonly name = 'oauth';
  public readonly priority = 10;

  public async extract(context: PageContext): Promise<AdapterResult> {
    const { document, url, origin } = context;
    const events: ConsentEvent[] = [];
    const errors: AdapterError[] = [];

    try {
      // Detect OAuth buttons/links in the DOM
      const oauthElements = this.detectOAuthElements(document);

      for (const element of oauthElements) {
        try {
          const event = await this.extractOAuthEvent(element, document, url, origin);
          if (event) {
            events.push(event);
          }
        } catch (err) {
          errors.push(
            this.createError(
              `Failed to extract OAuth event from element: ${err instanceof Error ? err.message : String(err)}`,
              'OAUTH_EXTRACTION_FAILED',
              'warning',
              { elementHtml: element.outerHTML.substring(0, 500) }
            )
          );
        }
      }

      // Also check for generic OAuth patterns in URL and meta tags
      const genericEvents = this.detectGenericOAuth(document, url, origin);
      events.push(...genericEvents);
    } catch (err) {
      errors.push(
        this.createError(
          `OAuth adapter extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          'OAUTH_ADAPTER_ERROR',
          'error'
        )
      );
    }

    return { events, errors };
  }

  /**
   * Detect OAuth-related elements in the DOM
   */
  private detectOAuthElements(document: Document): Element[] {
    const elements: Element[] = [];

    // 1. Buttons with OAuth-related text
    const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]');
    for (const button of buttons) {
      const text = (button.textContent || '').trim().toLowerCase();
      const href = button.getAttribute('href') || '';
      
      // Check button text patterns
      for (const provider of OAUTH_PROVIDERS) {
        for (const pattern of provider.buttonTextPatterns) {
          if (pattern.test(text)) {
            elements.push(button);
            break;
          }
        }
        
        // Check href patterns
        for (const pattern of provider.patterns) {
          if (pattern.test(href)) {
            elements.push(button);
            break;
          }
        }
      }

      // Check data attributes
      const dataProvider = button.getAttribute('data-provider')?.toLowerCase();
      const dataOauth = button.getAttribute('data-oauth')?.toLowerCase();
      if (dataProvider || dataOauth === 'true') {
        elements.push(button);
      }
    }

    // 2. Links with OAuth href patterns
    const links = document.querySelectorAll('a[href]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      for (const provider of OAUTH_PROVIDERS) {
        for (const pattern of provider.patterns) {
          if (pattern.test(href)) {
            elements.push(link);
            break;
          }
        }
      }
      // Generic OAuth fallback
      for (const pattern of GENERIC_OAUTH_PATTERNS) {
        if (pattern.test(href)) {
          elements.push(link);
          break;
        }
      }
    }

    // 3. Meta tags with OAuth info
    const metaTags = document.querySelectorAll('meta[name*="oauth" i], meta[property*="oauth" i]');
    for (const meta of metaTags) {
      elements.push(meta);
    }

    // Deduplicate elements
    return Array.from(new Set(elements));
  }

  /**
   * Extract OAuth event from a detected element
   */
  private async extractOAuthEvent(
    element: Element,
    document: Document,
    url: string,
    origin: string
  ): Promise<ConsentEvent | null> {
    const href = element.getAttribute('href') || '';
    const text = (element.textContent || '').trim();
    const dataProvider = element.getAttribute('data-provider')?.toLowerCase();
    const dataScope = element.getAttribute('data-scope')?.trim();
    const dataClientId = element.getAttribute('data-client-id')?.trim();

    // Determine provider
    let provider = this.identifyProvider(href, text, dataProvider);
    if (!provider) {
      // Try to infer from current page URL
      provider = this.identifyProvider(url, '', '');
    }
    if (!provider) {
      provider = 'unknown';
    }

    // Extract scopes per D-14: both URL scope= param and data-scope attributes, merged and deduplicated
    const scopes = this.extractScopes(href, dataScope, document);

    // Create evidence
    const evidence = [
      createDOMEvidence({
        selector: this.getSelector(element),
        text: text || href,
        confidence: provider !== 'unknown' ? 0.9 : 0.5,
        extractionMethod: ExtractionMethod.DataAttribute,
        url,
      }),
    ];

    // Add URL param evidence if scopes came from URL
    if (href.includes('scope=')) {
      evidence.push(
        createDOMEvidence({
          selector: this.getSelector(element),
          text: `OAuth scopes from URL: ${scopes.join(', ')}`,
          confidence: 0.85,
          extractionMethod: ExtractionMethod.URLParam,
          url: href,
        })
      );
    }

    // Create consent event
    return createOAuthConsentEvent({
      website: origin,
      provider,
      scope: scopes,
      evidence,
      userAction: `click:${this.getSelector(element)}`,
    });
  }

  /**
   * Identify OAuth provider from various signals
   */
  private identifyProvider(href: string, text: string, dataProvider: string): string | null {
    // Explicit data-provider attribute
    if (dataProvider && OAUTH_PROVIDERS.some(p => p.name === dataProvider)) {
      return dataProvider;
    }

    // Check href patterns
    for (const provider of OAUTH_PROVIDERS) {
      for (const pattern of provider.patterns) {
        if (pattern.test(href)) {
          return provider.name;
        }
      }
    }

    // Check button text patterns
    const lowerText = text.toLowerCase();
    for (const provider of OAUTH_PROVIDERS) {
      for (const pattern of provider.buttonTextPatterns) {
        if (pattern.test(lowerText)) {
          return provider.name;
        }
      }
    }

    return null;
  }

  /**
   * Extract scopes from URL params and data attributes per D-14
   */
  private extractScopes(href: string, dataScope: string, document: Document): string[] {
    const scopes = new Set<string>();

    // From URL scope parameter
    try {
      const url = new URL(href, window.location.origin);
      const scopeParam = url.searchParams.get('scope');
      if (scopeParam) {
        scopeParam.split(/[\s,+]/).forEach(s => scopes.add(s.trim()));
      }
    } catch {
      // Ignore invalid URLs
    }

    // From data-scope attribute
    if (dataScope) {
      dataScope.split(/[\s,+]/).forEach(s => scopes.add(s.trim()));
    }

    // From meta tags
    const scopeMeta = document.querySelector('meta[name="oauth-scope"], meta[property="oauth:scope"]');
    if (scopeMeta) {
      const content = scopeMeta.getAttribute('content') || '';
      content.split(/[\s,+]/).forEach(s => scopes.add(s.trim()));
    }

    // From data attributes on any element
    const scopeElements = document.querySelectorAll('[data-scope]');
    for (const el of scopeElements) {
      const scope = el.getAttribute('data-scope')?.trim();
      if (scope) {
        scope.split(/[\s,+]/).forEach(s => scopes.add(s.trim()));
      }
    }

    return Array.from(scopes).filter(Boolean);
  }

  /**
   * Detect generic OAuth patterns (fallback per D-13)
   */
  private detectGenericOAuth(document: Document, url: string, origin: string): ConsentEvent[] {
    const events: ConsentEvent[] = [];

    // Check current page URL for OAuth patterns
    for (const pattern of GENERIC_OAUTH_PATTERNS) {
      if (pattern.test(url)) {
        const scopes = this.extractScopes(url, '', document);
        const provider = this.identifyProvider(url, '', '') || 'unknown';

        const evidence = [
          createDOMEvidence({
            selector: 'window.location',
            text: `Generic OAuth detected in URL: ${url}`,
            confidence: 0.4,
            extractionMethod: ExtractionMethod.URLParam,
            url,
          }),
        ];

        if (scopes.length > 0 || provider !== 'unknown') {
          events.push(
            createOAuthConsentEvent({
              website: origin,
              provider,
              scope: scopes,
              evidence,
              userAction: 'page-load',
            })
          );
        }
        break; // Only create one generic event per page
      }
    }

    return events;
  }

  /**
   * Generate a CSS selector for an element
   */
  private getSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      const classes = element.className.split(' ').filter(Boolean).join('.');
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }
    return element.tagName.toLowerCase();
  }
}