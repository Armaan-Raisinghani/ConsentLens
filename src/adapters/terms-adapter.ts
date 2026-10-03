/**
 * Terms Adapter - finds terms of service links, extracts material clauses with severity per ADAPTER-05
 */

import { BaseAdapter } from './adapter.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import { createTermsCapability } from '../ir/capability.js';
import { createDOMEvidence, createHeuristicEvidence } from '../ir/evidence.js';
import type { AdapterResult, AdapterError, PageContext } from '../shared/errors.js';
import { ErrorSeverity } from '../shared/errors.js';
import { ConsentType, GrantStatus, EvidenceSource, ExtractionMethod } from '../shared/types.js';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

/**
 * Terms clause severity
 */
export enum TermsSeverity {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

/**
 * Terms clause types
 */
export enum TermsClause {
  Arbitration = 'arbitration',
  AutoRenewal = 'auto-renewal',
  LiabilityLimitation = 'liability-limitation',
  ContentLicensing = 'content-licensing',
  Termination = 'termination',
  GoverningLaw = 'governing-law',
  Indemnification = 'indemnification',
  WarrantyDisclaimer = 'warranty-disclaimer',
  AccountSuspension = 'account-suspension',
  DataDeletion = 'data-deletion',
  Assignment = 'assignment',
  ForceMajeure = 'force-majeure',
  EntireAgreement = 'entire-agreement',
  Severability = 'severability',
  Modification = 'modification',
  Unknown = 'unknown',
}

/**
 * Common terms of service link selectors
 */
const TERMS_LINK_SELECTORS = [
  'a[href*="terms"]',
  'a[href*="tos"]',
  'a[href*="conditions"]',
  'a[href*="agreement"]',
  'a[href*="eula"]',
  'a[href*="legal"]',
  'link[rel="terms"]',
  'link[rel="terms-of-service"]',
] as const;

/**
 * Common terms URL paths
 */
const TERMS_URL_PATHS = [
  '/terms',
  '/terms/',
  '/terms-of-service',
  '/terms-of-service/',
  '/terms-of-use',
  '/terms-of-use/',
  '/tos',
  '/tos/',
  '/conditions',
  '/conditions/',
  '/legal/terms',
  '/legal/terms-of-service',
  '/legal/tos',
  '/eula',
  '/eula/',
  '/user-agreement',
  '/user-agreement/',
] as const;

/**
 * Clause detection patterns with severity
 */
const CLAUSE_PATTERNS: Array<{ clause: TermsClause; severity: TermsSeverity; patterns: RegExp[] }> = [
  // HIGH severity
  {
    clause: TermsClause.Arbitration,
    severity: TermsSeverity.High,
    patterns: [
      /arbitration/i,
      /binding\s+arbitration/i,
      /mandatory\s+arbitration/i,
      /waive\s+(?:your\s+)?right\s+to\s+(?:a\s+)?(?:court|jury|class\s+action)/i,
      /class\s+action\s+waiver/i,
      /dispute\s+resolution.*arbitration/i,
      /jurisdiction.*arbitration/i,
    ],
  },
  {
    clause: TermsClause.ContentLicensing,
    severity: TermsSeverity.High,
    patterns: [
      /grant.*license/i,
      /you\s+grant/i,
      /worldwide.*license/i,
      /perpetual.*license/i,
      /royalty[-\s]?free.*license/i,
      /license\s+to\s+(?:your|the)/i,
      /content\s+license/i,
      /intellectual\s+property\s+license/i,
      /sublicense/i,
      /derivative\s+works/i,
      /we\s+own\s+(?:all\s+)?(?:rights|content)/i,
      /assignment\s+of\s+(?:rights|content)/i,
    ],
  },
  {
    clause: TermsClause.AccountSuspension,
    severity: TermsSeverity.High,
    patterns: [
      /suspend\s+(?:or\s+)?terminate\s+(?:your\s+)?account/i,
      /terminate\s+(?:your\s+)?(?:access|account|use)/i,
      /we\s+may\s+(?:suspend|terminate)\s+(?:your\s+)?account/i,
      /account\s+(?:suspension|termination)/i,
      /immediate\s+(?:suspension|termination)/i,
      /without\s+(?:prior\s+)?notice\s+(?:suspend|terminate)/i,
      /ban\s+(?:your\s+)?account/i,
    ],
  },
  {
    clause: TermsClause.DataDeletion,
    severity: TermsSeverity.High,
    patterns: [
      /delete\s+(?:your\s+)?(?:data|account|content)/i,
      /right\s+to\s+(?:deletion|erasure)/i,
      /data\s+deletion\s+(?:request|policy)/i,
      /permanently\s+delete/i,
      /upon\s+(?:account\s+)?(?:closure|termination).*delete/i,
    ],
  },

  // MEDIUM severity
  {
    clause: TermsClause.AutoRenewal,
    severity: TermsSeverity.Medium,
    patterns: [
      /auto[-\s]?renew/i,
      /automatic\s+renewal/i,
      /renew\s+automatically/i,
      /subscription\s+(?:auto[-\s]?renew|renews\s+automatically)/i,
      /billing\s+cycle\s+(?:auto[-\s]?renew|renews\s+automatically)/i,
      /cancel\s+(?:before|at\s+least).*renewal/i,
    ],
  },
  {
    clause: TermsClause.LiabilityLimitation,
    severity: TermsSeverity.Medium,
    patterns: [
      /limitation\s+of\s+liability/i,
      /limited\s+liability/i,
      /not\s+liable\s+for/i,
      /disclaimer\s+of\s+(?:warranties|liability)/i,
      /in\s+no\s+event\s+(?:shall|will)\s+(?:we|the\s+company)\s+be\s+liable/i,
      /maximum\s+liability/i,
      /consequential\s+damages/i,
      /incidental\s+damages/i,
      /indirect\s+damages/i,
    ],
  },
  {
    clause: TermsClause.Indemnification,
    severity: TermsSeverity.Medium,
    patterns: [
      /indemnif(?:y|ication)/i,
      /hold\s+harmless/i,
      /defend\s+(?:us|the\s+company)/i,
      /you\s+agree\s+to\s+indemnify/i,
    ],
  },
  {
    clause: TermsClause.WarrantyDisclaimer,
    severity: TermsSeverity.Medium,
    patterns: [
      /warranty\s+disclaimer/i,
      /disclaimer\s+of\s+warrant(?:y|ies)/i,
      /as\s+is\s+(?:basis|where\s+is)/i,
      /without\s+warrant(?:y|ies)/i,
      /no\s+warrant(?:y|ies)/i,
      /merchantability/i,
      /fitness\s+for\s+a\s+particular\s+purpose/i,
    ],
  },
  {
    clause: TermsClause.Termination,
    severity: TermsSeverity.Medium,
    patterns: [
      /termination\s+(?:of\s+)?(?:this\s+)?(?:agreement|terms)/i,
      /this\s+agreement\s+(?:may\s+be\s+)?terminated/i,
      /either\s+party\s+may\s+terminate/i,
      /terminate\s+(?:this\s+)?agreement/i,
      /upon\s+termination/i,
      /effect\s+of\s+termination/i,
    ],
  },
  {
    clause: TermsClause.Assignment,
    severity: TermsSeverity.Medium,
    patterns: [
      /assignment\s+(?:of\s+)?(?:this\s+)?agreement/i,
      /you\s+may\s+not\s+assign/i,
      /we\s+may\s+assign/i,
      /transfer\s+(?:this\s+)?agreement/i,
      /successors\s+and\s+assigns/i,
    ],
  },
  {
    clause: TermsClause.Modification,
    severity: TermsSeverity.Medium,
    patterns: [
      /modif(?:y|ication)\s+(?:of\s+)?(?:this\s+)?(?:agreement|terms)/i,
      /we\s+(?:may|reserve\s+the\s+right\s+to)\s+(?:modify|change|update)\s+(?:this\s+)?(?:agreement|terms)/i,
      /amend(?:ment)?\s+(?:of\s+)?(?:this\s+)?(?:agreement|terms)/i,
      /updated\s+terms/i,
      /changes\s+to\s+(?:this\s+)?(?:agreement|terms)/i,
    ],
  },

  // LOW severity
  {
    clause: TermsClause.GoverningLaw,
    severity: TermsSeverity.Low,
    patterns: [
      /governing\s+law/i,
      /governed\s+by\s+(?:the\s+)?laws?\s+of/i,
      /jurisdiction\s+of/i,
      /courts?\s+of\s+(?:the\s+)?(?:state|country|province)/i,
      /venue\s+(?:shall\s+be\s+)?(?:in|at)/i,
      /applicable\s+law/i,
    ],
  },
  {
    clause: TermsClause.ForceMajeure,
    severity: TermsSeverity.Low,
    patterns: [
      /force\s+majeure/i,
      /acts?\s+of\s+god/i,
      /circumstances\s+beyond\s+(?:our|your)\s+control/i,
    ],
  },
  {
    clause: TermsClause.EntireAgreement,
    severity: TermsSeverity.Low,
    patterns: [
      /entire\s+agreement/i,
      /this\s+(?:agreement|terms)\s+constitutes\s+the\s+entire/i,
      /complete\s+agreement/i,
      /supersedes\s+(?:all\s+)?(?:prior|previous)/i,
    ],
  },
  {
    clause: TermsClause.Severability,
    severity: TermsSeverity.Low,
    patterns: [
      /severability/i,
      /if\s+any\s+provision\s+is\s+(?:invalid|unenforceable)/i,
      /remaining\s+provisions\s+(?:shall|will)\s+(?:remain|continue)/i,
    ],
  },
];

/**
 * In-memory cache for terms responses (Phase 1 - IndexedDB in Phase 4)
 */
interface CacheEntry {
  content: string;
  timestamp: number;
  cacheControl?: string;
}

const termsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * TermsAdapter class implementing Adapter interface
 * Priority: 50 (runs last per D-23)
 */
export class TermsAdapter extends BaseAdapter {
  public readonly name = 'terms';
  public readonly priority = 50;

  public async extract(context: PageContext): Promise<AdapterResult> {
    const { document, url, origin } = context;
    const events: ConsentEvent[] = [];
    const errors: AdapterError[] = [];

    try {
      // 1. Find terms of service links
      const termsLinks = this.findTermsLinks(document, url);
      
      if (termsLinks.length === 0) {
        return { events, errors };
      }

      // 2. Fetch and extract content from each terms link (limit to first 2)
      for (const link of termsLinks.slice(0, 2)) {
        try {
          const termsEvents = await this.extractTermsContent(link, document, url, origin);
          events.push(...termsEvents);
        } catch (err) {
          errors.push(
            this.createError(
              `Failed to extract terms from ${link}: ${err instanceof Error ? err.message : String(err)}`,
              'TERMS_EXTRACTION_FAILED',
              ErrorSeverity.Warning,
              { termsUrl: link }
            )
          );
        }
      }
    } catch (err) {
      errors.push(
        this.createError(
          `Terms adapter extraction failed: ${err instanceof Error ? err.message : String(err)}`,
          'TERMS_ADAPTER_ERROR',
          ErrorSeverity.Error
        )
      );
    }

    return { events, errors };
  }

  /**
   * Find terms of service links in the document
   */
  private findTermsLinks(document: Document, baseUrl: string): string[] {
    const links = new Set<string>();

    // 1. Check explicit selectors
    for (const selector of TERMS_LINK_SELECTORS) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const href = el.getAttribute('href') || '';
        if (href) {
          const absoluteUrl = this.resolveUrl(href, baseUrl);
          if (absoluteUrl) links.add(absoluteUrl);
        }
      }
    }

    // 2. Check common terms URL paths
    try {
      const base = new URL(baseUrl);
      for (const path of TERMS_URL_PATHS) {
        links.add(`${base.origin}${path}`);
      }
    } catch {
      // Invalid base URL
    }

    // 3. Check footer links
    const footerLinks = document.querySelectorAll('footer a[href]');
    for (const link of footerLinks) {
      const text = (link.textContent || '').toLowerCase();
      const href = link.getAttribute('href') || '';
      if (text.includes('terms') || text.includes('tos') || text.includes('conditions') || text.includes('agreement') || text.includes('eula') || text.includes('legal')) {
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
      if (absolute.protocol === 'http:' || absolute.protocol === 'https:') {
        return absolute.href;
      }
    } catch {
      // Invalid URL
    }
    return null;
  }

  /**
   * Fetch terms content via r.jina.ai CORS proxy and extract with Readability
   */
  private async fetchTermsContent(termsUrl: string): Promise<string | null> {
    // Check cache first
    const cached = termsCache.get(termsUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.content;
    }

    try {
      const proxyUrl = `https://r.jina.ai/http://${termsUrl.replace(/^https?:\/\//, '')}`;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, text/html, application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        // Fallback: try direct fetch
        try {
          const directResponse = await fetch(termsUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/html, application/xhtml+xml' },
            signal: AbortSignal.timeout(10000),
          });
          if (directResponse.ok) {
            const html = await directResponse.text();
            const extracted = this.extractWithReadability(html, termsUrl);
            if (extracted) {
              this.cacheResponse(termsUrl, extracted, directResponse.headers.get('cache-control'));
            }
            return extracted;
          }
        } catch {
          // Direct fetch failed
        }
        return null;
      }

      const text = await response.text();
      
      let extracted: string | null = null;
      
      if (text.length > 500 && !text.includes('<html') && !text.includes('<body')) {
        extracted = text;
      } else {
        extracted = this.extractWithReadability(text, termsUrl);
      }

      if (extracted) {
        this.cacheResponse(termsUrl, extracted, response.headers.get('cache-control'));
      }

      return extracted;
    } catch {
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
   * Cache terms response with Cache-Control header
   */
  private cacheResponse(url: string, content: string, cacheControl?: string | null): void {
    termsCache.set(url, {
      content,
      timestamp: Date.now(),
      cacheControl: cacheControl || undefined,
    });
  }

  /**
   * Extract terms clauses from content
   */
  private extractTermsClauses(content: string): Array<{ clause: TermsClause; severity: TermsSeverity; snippet: string }> {
    const results: Array<{ clause: TermsClause; severity: TermsSeverity; snippet: string }> = [];
    const lowerContent = content.toLowerCase();

    for (const { clause, severity, patterns } of CLAUSE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(lowerContent)) {
          const snippet = this.findClauseSnippet(content, pattern);
          results.push({ clause, severity, snippet });
          break; // Only add once per clause type
        }
      }
    }

    if (results.length === 0) {
      results.push({ clause: TermsClause.Unknown, severity: TermsSeverity.Low, snippet: content.substring(0, 300) });
    }

    return results;
  }

  /**
   * Find relevant snippet for a clause
   */
  private findClauseSnippet(content: string, pattern: RegExp): string {
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < 20 || trimmed.length > 500) continue;
      
      if (pattern.test(trimmed)) {
        return trimmed.substring(0, 300);
      }
    }
    
    // Fallback
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 50 && trimmed.length < 500) {
        return trimmed.substring(0, 300);
      }
    }
    
    return content.substring(0, 300);
  }

  /**
   * Extract terms content and create consent events
   */
  private async extractTermsContent(
    termsUrl: string,
    document: Document,
    pageUrl: string,
    pageOrigin: string
  ): Promise<ConsentEvent[]> {
    const events: ConsentEvent[] = [];

    const content = await this.fetchTermsContent(termsUrl);
    if (!content || content.length < 100) {
      return events;
    }

    const clauses = this.extractTermsClauses(content);

    for (const { clause, severity, snippet } of clauses) {
      const capability = createTermsCapability(clause);
      
      // Evidence from network fetch
      const networkEvidence = createHeuristicEvidence({
        text: `Terms clause detected: ${clause} (severity: ${severity}). Snippet: ${snippet}`,
        confidence: clause === TermsClause.Unknown ? 0.3 : 0.85,
        url: termsUrl,
      });

      // Evidence from DOM link
      const domEvidence = createDOMEvidence({
        selector: `a[href*="${termsUrl}"]`,
        text: `Terms of service link: ${termsUrl}`,
        confidence: 0.9,
        extractionMethod: ExtractionMethod.Attribute,
        url: pageUrl,
      });

      const event: ConsentEvent = {
        website: pageOrigin,
        consentType: ConsentType.Terms,
        capability,
        termsEvidence: snippet,
        timestamp: new Date().toISOString(),
        grantStatus: GrantStatus.Pending,
        evidence: [domEvidence, networkEvidence],
        userAction: `terms-fetch:${termsUrl}`,
        resource: termsUrl,
        // Store severity in evidence text since capability doesn't have severity field
      };

      events.push(event);
    }

    return events;
  }

  /**
   * Clear the terms cache (for testing)
   */
  public static clearCache(): void {
    termsCache.clear();
  }
}