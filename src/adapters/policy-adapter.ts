/**
 * Policy Adapter - finds privacy policy links, fetches via r.jina.ai, extracts with Mozilla Readability per ADAPTER-04, D-19, D-20, D-21
 */

import { BaseAdapter } from './adapter.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import { createPolicyCapability } from '../ir/capability.js';
import { createDOMEvidence, createHeuristicEvidence } from '../ir/evidence.js';
import type { AdapterResult, AdapterError, PageContext } from '../shared/errors.js';
import { ErrorSeverity } from '../shared/errors.js';
import { ConsentType, GrantStatus, ExtractionMethod } from '../shared/types.js';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

/**
 * Policy practice types
 */
export enum PolicyPractice {
  DataCollection = 'data-collection',
  DataSharing = 'data-sharing',
  DataSelling = 'data-selling',
  AiTraining = 'ai-training',
  Retention = 'retention',
  ThirdParties = 'third-parties',
  UserRights = 'user-rights',
  Security = 'security',
  InternationalTransfer = 'international-transfer',
  AutomatedDecision = 'automated-decision',
  Cookies = 'cookies',
  Marketing = 'marketing',
  Analytics = 'analytics',
  Personalization = 'personalization',
  Unknown = 'unknown',
}

/**
 * Common privacy policy link selectors
 */
const POLICY_LINK_SELECTORS = [
  'a[href*="privacy"]',
  'a[href*="policy"]',
  'a[href*="data-protection"]',
  'a[href*="gdpr"]',
  'a[href*="ccpa"]',
  'link[rel="privacy-policy"]',
  'link[rel="privacy"]',
  'meta[name="privacy-policy"]',
  'meta[property="privacy-policy"]',
] as const;

/**
 * Common privacy policy URL paths
 */
const POLICY_URL_PATHS = [
  '/privacy',
  '/privacy-policy',
  '/privacy-policy/',
  '/privacy/',
  '/data-protection',
  '/data-protection/',
  '/legal/privacy',
  '/legal/privacy-policy',
  '/legal/privacy/',
  '/policy',
  '/policy/',
  '/gdpr',
  '/ccpa',
] as const;

/**
 * Policy practice detection patterns
 */
const PRACTICE_PATTERNS: Array<{ practice: PolicyPractice; patterns: RegExp[] }> = [
  {
    practice: PolicyPractice.DataCollection,
    patterns: [
      /we\s+collect\s+(?:personal|user|customer)\s+(?:data|information)/i,
      /collect(?:s|ed|ing)?\s+(?:personal|user|customer)\s+(?:data|information)/i,
      /gather(?:s|ed|ing)?\s+(?:personal|user|customer)\s+(?:data|information)/i,
      /information\s+we\s+collect/i,
      /data\s+we\s+collect/i,
      /what\s+(?:data|information)\s+(?:we\s+)?collect/i,
      /personal\s+information\s+(?:we\s+)?(?:collect|gather)/i,
      /types?\s+of\s+(?:data|information)\s+(?:we\s+)?collect/i,
    ],
  },
  {
    practice: PolicyPractice.DataSharing,
    patterns: [
      /share(?:s|d|ing)?\s+(?:your|user|customer)\s+(?:data|information)/i,
      /disclos(?:e|es|ed|ing)\s+(?:your|user|customer)\s+(?:data|information)/i,
      /third[-\s]?part(?:y|ies)\s+(?:we\s+)?share/i,
      /with\s+whom\s+we\s+share/i,
      /data\s+sharing/i,
      /sharing\s+your\s+data/i,
    ],
  },
  {
    practice: PolicyPractice.DataSelling,
    patterns: [
      /sell(?:s|ing)?\s+(?:your|user|customer)\s+(?:data|information)/i,
      /sale\s+of\s+(?:personal|user)\s+(?:data|information)/i,
      /do\s+not\s+sell\s+(?:my|your)\s+(?:personal\s+)?(?:data|information)/i,
      /opt[-\s]?out\s+of\s+sale/i,
      /ccpa\s+do\s+not\s+sell/i,
      /we\s+(?:do\s+not\s+)?sell\s+(?:your|user)\s+(?:data|information)/i,
    ],
  },
  {
    practice: PolicyPractice.AiTraining,
    patterns: [
      /train\s+(?:our\s+)?(?:ai|artificial\s+intelligence|machine\s+learning|models?)/i,
      /training\s+(?:our\s+)?(?:ai|artificial\s+intelligence|machine\s+learning|models?)/i,
      /(?:ai|artificial\s+intelligence)\s+(?:training|development)/i,
      /machine\s+learning\s+(?:training|models?)/i,
      /improve\s+(?:our\s+)?(?:ai|models?|services?)/i,
      /(?:data|content)\s+used\s+(?:for|to)\s+(?:train|improve)\s+(?:ai|models?)/i,
      /generative\s+ai/i,
      /large\s+language\s+models?/i,
      /model\s+training/i,
      /use.*data.*train.*ai/i,
    ],
  },
  {
    practice: PolicyPractice.Retention,
    patterns: [
      /retain(?:s|ed|ing)?\s+(?:your|user|customer)\s+(?:data|information)\s+for/i,
      /retention\s+period/i,
      /how\s+long\s+we\s+(?:keep|retain|store)/i,
      /data\s+retention/i,
      /storage\s+period/i,
      /keep\s+(?:your|user)\s+data\s+for/i,
      /delete\s+(?:your|user)\s+data\s+after/i,
    ],
  },
  {
    practice: PolicyPractice.ThirdParties,
    patterns: [
      /third[-\s]?part(?:y|ies)/i,
      /service\s+providers/i,
      /partners\s+(?:we\s+)?(?:work\s+with|share\s+with)/i,
      /subprocessors/i,
      /vendors/i,
      /affiliates/i,
    ],
  },
  {
    practice: PolicyPractice.UserRights,
    patterns: [
      /your\s+rights/i,
      /user\s+rights/i,
      /data\s+subject\s+rights/i,
      /right\s+to\s+(?:access|rectif|eras|port|object|restrict)/i,
      /gdpr\s+rights/i,
      /ccpa\s+rights/i,
      /access\s+your\s+data/i,
      /delete\s+your\s+data/i,
      /correct\s+your\s+data/i,
    ],
  },
  {
    practice: PolicyPractice.Security,
    patterns: [
      /security\s+(?:measures|practices)/i,
      /protect\s+(?:your|user)\s+(?:data|information)/i,
      /encryption/i,
      /secure\s+(?:storage|transmission)/i,
      /safeguard/i,
    ],
  },
  {
    practice: PolicyPractice.InternationalTransfer,
    patterns: [
      /international\s+transfer/i,
      /transfer\s+(?:your|user)\s+data\s+(?:outside|across\s+borders)/i,
      /cross[-\s]?border\s+transfer/i,
      /adequacy\s+decision/i,
      /standard\s+contractual\s+clauses/i,
      /privacy\s+shield/i,
    ],
  },
  {
    practice: PolicyPractice.AutomatedDecision,
    patterns: [
      /automated\s+(?:decision|decision[- ]making)/i,
      /profiling/i,
      /automated\s+processing/i,
      /solely\s+automated/i,
    ],
  },
  {
    practice: PolicyPractice.Cookies,
    patterns: [
      /cookies?\s+(?:policy|notice)/i,
      /cookie\s+(?:usage|tracking)/i,
      /tracking\s+(?:technologies|cookies)/i,
      /similar\s+technologies/i,
    ],
  },
  {
    practice: PolicyPractice.Marketing,
    patterns: [
      /marketing\s+(?:communications|emails|messages)/i,
      /promotional\s+(?:emails|communications)/i,
      /newsletter/i,
      /opt[-\s]?out\s+of\s+marketing/i,
      /unsubscribe/i,
    ],
  },
  {
    practice: PolicyPractice.Analytics,
    patterns: [
      /analytics\s+(?:data|tracking|cookies)/i,
      /google\s+analytics/i,
      /site\s+analytics/i,
      /usage\s+(?:statistics|data|analytics)/i,
      /performance\s+(?:monitoring|analytics)/i,
    ],
  },
  {
    practice: PolicyPractice.Personalization,
    patterns: [
      /personaliz(?:e|ation)/i,
      /recommendations?/i,
      /tailor(?:ed)?\s+(?:content|experience|ads?)/i,
      /customiz(?:e|ation)/i,
      /preferences\s+(?:we\s+)?(?:collect|use)/i,
    ],
  },
];

/**
 * In-memory cache for policy responses (Phase 1 - IndexedDB in Phase 4)
 */
interface CacheEntry {
  content: string;
  timestamp: number;
  cacheControl?: string;
}

const policyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * PolicyAdapter class implementing Adapter interface
 * Priority: 40 (runs after Cookie per D-23)
 */
export class PolicyAdapter extends BaseAdapter {
  public readonly name = 'policy';
  public readonly priority = 40;

  public async extract(context: PageContext): Promise<AdapterResult> {
    const { document, url, origin } = context;
    const events: ConsentEvent[] = [];
    const errors: AdapterError[] = [];

    try {
      // Check for OAuth provider in shared context (D-24: mutable context enrichment)
      const sharedContext = context.metadata?.['sharedContext'] as Map<string, unknown> | undefined;
      const detectedProvider = sharedContext?.get('detectedProvider') as string | undefined;

      // 1. Find privacy policy links
      const policyLinks = this.findPolicyLinks(document, url);
      
      if (policyLinks.length === 0) {
        // No policy links found - not an error, just no events
        return { events, errors };
      }

      // 2. Fetch and extract content from each policy link (limit to first 3 to avoid excessive requests)
      for (const link of policyLinks.slice(0, 3)) {
        try {
          const policyEvents = await this.extractPolicyContent(link, document, url, origin, detectedProvider);
          events.push(...policyEvents);
        } catch (err) {
          errors.push(
            this.createError(
              `Failed to extract policy from ${link}: ${err instanceof Error ? err.message : String(err)}`,
              'POLICY_EXTRACTION_FAILED',
              ErrorSeverity.Warning,
              { policyUrl: link }
            )
          );
        }
      }
    } catch (err) {
      errors.push(
        this.createError(
          `Policy adapter extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          'POLICY_ADAPTER_ERROR',
          ErrorSeverity.Error
        )
      );
    }

    return { events, errors };
  }

  /**
   * Find privacy policy links in the document
   */
  private findPolicyLinks(document: Document, baseUrl: string): string[] {
    const links = new Set<string>();

    // 1. Check explicit selectors
    for (const selector of POLICY_LINK_SELECTORS) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const href = el.getAttribute('href') || el.getAttribute('content') || '';
        if (href) {
          const absoluteUrl = this.resolveUrl(href, baseUrl);
          if (absoluteUrl) links.add(absoluteUrl);
        }
      }
    }

    // 2. Check common policy URL paths
    try {
      const base = new URL(baseUrl);
      for (const path of POLICY_URL_PATHS) {
        links.add(`${base.origin}${path}`);
      }
    } catch {
      // Invalid base URL
    }

    // 3. Check footer links (common place for privacy policy)
    const footerLinks = document.querySelectorAll('footer a[href]');
    for (const link of footerLinks) {
      const text = (link.textContent || '').toLowerCase();
      const href = link.getAttribute('href') || '';
      if (text.includes('privacy') || text.includes('policy') || text.includes('data protection')) {
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (absoluteUrl) links.add(absoluteUrl);
      }
    }

    return Array.from(links);
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      const base = new URL(baseUrl);
      const absolute = new URL(href, base);
      // Only allow http/https
      if (absolute.protocol === 'http:' || absolute.protocol === 'https:') {
        return absolute.href;
      }
    } catch {
      // Invalid URL
    }
    return null;
  }

  /**
   * Fetch policy content via r.jina.ai CORS proxy (D-19) and extract with Readability (D-20)
   */
  private async fetchPolicyContent(policyUrl: string): Promise<string | null> {
    // Check cache first (D-21: in-memory cache for Phase 1)
    const cached = policyCache.get(policyUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.content;
    }

    try {
      // Use r.jina.ai CORS proxy
      const proxyUrl = `https://r.jina.ai/http://${policyUrl.replace(/^https?:\/\//, '')}`;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, text/html, application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        // Fallback: try direct fetch if CORS allows
        try {
          const directResponse = await fetch(policyUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/html, application/xhtml+xml' },
            signal: AbortSignal.timeout(10000),
          });
          if (directResponse.ok) {
            const html = await directResponse.text();
            const extracted = this.extractWithReadability(html, policyUrl);
            if (extracted) {
              this.cacheResponse(policyUrl, extracted, directResponse.headers.get('cache-control'));
            }
            return extracted;
          }
        } catch {
          // Direct fetch failed
        }
        return null;
      }

      const text = await response.text();
      
      // If response is already plain text from jina.ai, use it directly
      // Otherwise, try to extract with Readability
      let extracted: string | null = null;
      
      if (text.length > 500 && !text.includes('<html') && !text.includes('<body')) {
        // Likely already extracted text from jina.ai
        extracted = text;
      } else {
        // Try to parse as HTML and extract with Readability
        extracted = this.extractWithReadability(text, policyUrl);
      }

      if (extracted) {
        this.cacheResponse(policyUrl, extracted, response.headers.get('cache-control'));
      }

      return extracted;
    } catch (err) {
      // Network error, timeout, etc.
      return null;
    }
  }

  /**
   * Extract main content using Mozilla Readability
   */
  private extractWithReadability(html: string, url: string): string | null {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && article.textContent) {
        return article.textContent.trim();
      }
    } catch {
      // Readability failed
    }
    return null;
  }

  /**
   * Cache policy response with Cache-Control header (D-21)
   */
  private cacheResponse(url: string, content: string, cacheControl?: string | null): void {
    policyCache.set(url, {
      content,
      timestamp: Date.now(),
      cacheControl: cacheControl || undefined,
    });
  }

  /**
   * Extract policy practices from content
   */
  private extractPolicyPractices(content: string): PolicyPractice[] {
    const practices = new Set<PolicyPractice>();
    const lowerContent = content.toLowerCase();

    for (const { practice, patterns } of PRACTICE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(lowerContent)) {
          practices.add(practice);
          break;
        }
      }
    }

    return Array.from(practices);
  }

  /**
   * Extract policy content and create consent events
   */
  private async extractPolicyContent(
    policyUrl: string,
    document: Document,
    pageUrl: string,
    pageOrigin: string,
    detectedProvider?: string
  ): Promise<ConsentEvent[]> {
    const events: ConsentEvent[] = [];

    const content = await this.fetchPolicyContent(policyUrl);
    if (!content || content.length < 100) {
      return events; // Content too short or failed to fetch
    }

    const practices = this.extractPolicyPractices(content);
    if (practices.length === 0) {
      practices.push(PolicyPractice.Unknown);
    }

    for (const practice of practices) {
      // Find relevant text snippet for evidence
      const evidenceText = this.findEvidenceSnippet(content, practice);
      
      const capability = createPolicyCapability(practice);
      
      // Evidence from network fetch
      const networkEvidence = createHeuristicEvidence({
        text: `Policy practice detected: ${practice}${detectedProvider ? ` (provider: ${detectedProvider})` : ''}. Snippet: ${evidenceText}`,
        confidence: practice === PolicyPractice.Unknown ? 0.3 : 0.85,
        url: policyUrl,
      });

      // Evidence from DOM link
      const domEvidence = createDOMEvidence({
        selector: `a[href*="${policyUrl}"]`,
        text: `Privacy policy link: ${policyUrl}`,
        confidence: 0.9,
        extractionMethod: ExtractionMethod.Attribute,
        url: pageUrl,
      });

      const event: ConsentEvent = {
        website: pageOrigin,
        consentType: ConsentType.Policy,
        capability,
        dataCollected: practice === PolicyPractice.DataCollection ? evidenceText : undefined,
        dataShared: practice === PolicyPractice.DataSharing ? evidenceText : undefined,
        aiTrainingUse: practice === PolicyPractice.AiTraining,
        retention: practice === PolicyPractice.Retention ? evidenceText : undefined,
        policyEvidence: evidenceText,
        timestamp: new Date().toISOString(),
        grantStatus: GrantStatus.Pending,
        evidence: [domEvidence, networkEvidence],
        userAction: `policy-fetch:${policyUrl}`,
        resource: policyUrl,
      };

      events.push(event);
    }

    return events;
  }

  /**
   * Find a relevant text snippet for a practice
   */
  private findEvidenceSnippet(content: string, practice: PolicyPractice): string {
    const patterns = PRACTICE_PATTERNS.find(p => p.practice === practice)?.patterns || [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 20 || trimmed.length > 500) continue;
      
      for (const pattern of patterns) {
        if (pattern.test(trimmed)) {
          return trimmed.substring(0, 300);
        }
      }
    }
    
    // Fallback: return first substantial sentence
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 50 && trimmed.length < 500) {
        return trimmed.substring(0, 300);
      }
    }
    
    return content.substring(0, 300);
  }

  /**
   * Clear the policy cache (for testing)
   */
  public static clearCache(): void {
    policyCache.clear();
  }
}