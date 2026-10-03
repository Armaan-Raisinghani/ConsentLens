/**
 * FallbackHeuristics - local rule-based implementations for all 5 AI functions (OPENJEV-06)
 * Used when OpenJev API is unavailable
 */

import type { ConsentEvent } from '../ir/consent-event.js';
import type { Capability } from '../ir/capability.js';
import type { Purpose } from '../ir/purpose.js';
import type {
  PurposeInference as AIPurposeInference,
  PermissionInterpretation,
  PolicyExtraction,
  DataPractice,
  TermsExtraction,
  TermsClause,
  MismatchReasoning,
  OpenJevClassification,
  EvidenceCitation,
} from './types.js';
import type { Classification, ExtractedData, ReasoningResult } from '../plugins/ai-backend-plugin.js';
import { createOpenJevEvidence } from './evidence.js';
import { isOAuthCapability, isBrowserPermissionCapability, isCookieCapability, isPolicyCapability, isTermsCapability } from '../ir/capability.js';

/**
 * FallbackHeuristics provides local implementations for all AI functions
 * All fallback outputs have confidence ≤ 0.6 (marked as heuristic)
 */
export class FallbackHeuristics {
  private static readonly MAX_HEURISTIC_CONFIDENCE = 0.6;

  /**
   * Infer purpose from page context using keyword matching
   */
  static inferPurpose(pageContext: {
    url: string;
    title: string;
    metaTags: Record<string, string>;
    headings: string[];
    mainContent: string;
  }): AIPurposeInference {
    const text = [
      pageContext.title,
      ...Object.values(pageContext.metaTags),
      ...pageContext.headings,
      pageContext.mainContent.slice(0, 2000),
    ].join(' ').toLowerCase();

    let inferred = 'other';
    let confidence = 0.3;

    // Keyword-based classification
    if (/\b(dashboard|editor|workspace|project|task|document|spreadsheet|code|ide|developer)\b/.test(text)) {
      inferred = 'productivity';
      confidence = 0.55;
    } else if (/\b(feed|post|share|like|comment|follow|friend|social|message|chat)\b/.test(text)) {
      inferred = 'social';
      confidence = 0.55;
    } else if (/\b(cart|checkout|payment|price|product|shop|buy|order)\b/.test(text)) {
      inferred = 'ecommerce';
      confidence = 0.55;
    } else if (/\b(video|watch|stream|movie|music|article|news|read|content)\b/.test(text)) {
      inferred = 'content';
      confidence = 0.5;
    } else if (/\b(login|sign.?in|sign.?up|register|account|password|auth)\b/.test(text)) {
      inferred = 'auth';
      confidence = 0.5;
    }

    const evidence: EvidenceCitation[] = [
      createOpenJevEvidence(confidence),
    ];

    return {
      inferred,
      confidence: Math.min(confidence, this.MAX_HEURISTIC_CONFIDENCE),
      evidence,
    };
  }

  /**
   * Interpret permission capability using capability-type-based rules
   */
  static interpretPermission(capability: Capability): PermissionInterpretation {
    let description = 'Unknown permission';
    let sensitivity: 'high' | 'medium' | 'low' = 'medium';
    let confidence = 0.4;

    if (isOAuthCapability(capability)) {
      const provider = capability.provider;
      const scopes = capability.scope;
      const scopeStr = scopes.join(', ');
      
      if (provider === 'google') {
        if (scopes.some(s => s === 'drive' || s.startsWith('drive.'))) {
          description = `Access to your Google Drive files (${scopeStr})`;
          sensitivity = 'high';
        } else if (scopes.some(s => s === 'calendar' || s.startsWith('calendar.'))) {
          description = `Access to your Google Calendar (${scopeStr})`;
          sensitivity = 'high';
        } else if (scopes.some(s => s === 'mail' || s === 'gmail' || s.startsWith('mail.') || s.startsWith('gmail.'))) {
          description = `Access to your Gmail (${scopeStr})`;
          sensitivity = 'high';
        } else if (scopes.some(s => s === 'profile' || s === 'email' || s === 'openid')) {
          description = `Access to your basic Google profile (${scopeStr})`;
          sensitivity = 'low';
        } else {
          description = `Access to Google services (${scopeStr})`;
          sensitivity = 'medium';
        }
      } else if (provider === 'github') {
        description = `Access to your GitHub account (${scopeStr})`;
        sensitivity = scopes.some(s => s.includes('admin') || s.includes('delete')) ? 'high' : 'medium';
      } else if (provider === 'microsoft') {
        description = `Access to your Microsoft account (${scopeStr})`;
        sensitivity = 'high';
      } else {
        description = `Access to ${provider} (${scopeStr})`;
        sensitivity = 'medium';
      }
      confidence = 0.55;
    } else if (isBrowserPermissionCapability(capability)) {
      const perm = capability.permission;
      if (perm === 'geolocation') {
        description = 'Access to your precise location';
        sensitivity = 'high';
      } else if (perm === 'camera') {
        description = 'Access to your camera';
        sensitivity = 'high';
      } else if (perm === 'microphone') {
        description = 'Access to your microphone';
        sensitivity = 'high';
      } else if (perm === 'notifications') {
        description = 'Permission to send notifications';
        sensitivity = 'low';
      } else if (perm === 'clipboard-read' || perm === 'clipboard-write') {
        description = 'Access to your clipboard';
        sensitivity = 'medium';
      } else {
        description = `Browser permission: ${perm}`;
        sensitivity = 'medium';
      }
      confidence = 0.55;
    } else if (isCookieCapability(capability)) {
      const cat = capability.category.toLowerCase();
      const name = capability.name || 'unknown';
      if (cat === 'advertising' || cat === 'tracking') {
        description = `Tracking cookie for advertising analytics (${name})`;
        sensitivity = 'high';
      } else if (cat === 'analytics') {
        description = `Analytics cookie for site usage tracking (${name})`;
        sensitivity = 'low';
      } else if (cat === 'essential' || cat === 'necessary') {
        description = `Essential cookie for site functionality (${name})`;
        sensitivity = 'low';
      } else if (cat === 'personalization' || cat === 'preferences') {
        description = `Preference cookie for personalization (${name})`;
        sensitivity = 'low';
      } else {
        description = `Cookie: ${cat} (${name})`;
        sensitivity = 'medium';
      }
      confidence = 0.5;
    } else if (isPolicyCapability(capability)) {
      description = `Data practice: ${capability.practice}`;
      sensitivity = capability.practice.includes('ai') || capability.practice.includes('training') ? 'high' : 'medium';
      confidence = 0.4;
    } else if (isTermsCapability(capability)) {
      description = `Terms clause: ${capability.clause}`;
      const clause = capability.clause.toLowerCase();
      // Per plan: arbitration=high, content-license=high, auto-renewal=medium, liability=medium, termination=medium, governing-law=low
      if (clause.includes('arbitration') || clause.includes('content-license')) {
        sensitivity = 'high';
      } else if (clause.includes('liability') || clause.includes('auto-renewal') || clause.includes('termination')) {
        sensitivity = 'medium';
      } else if (clause.includes('governing-law')) {
        sensitivity = 'low';
      } else {
        sensitivity = 'medium';
      }
      confidence = 0.4;
    }

    const evidence: EvidenceCitation[] = [createOpenJevEvidence(confidence)];

    return {
      capability,
      description,
      sensitivity,
      confidence: Math.min(confidence, this.MAX_HEURISTIC_CONFIDENCE),
      evidence,
    };
  }

  /**
   * Extract policy data using regex patterns
   */
  static extractPolicy(text: string): PolicyExtraction {
    const lowerText = text.toLowerCase();
    const practices: DataPractice[] = [];
    const purposes: string[] = [];
    const thirdParties: string[] = [];
    let aiTraining = false;
    let retention: string | undefined;

    // Data practice patterns
    const practicePatterns = [
      { category: 'collection' as const, patterns: ['collect', 'gather', 'obtain', 'receive'] },
      { category: 'sharing' as const, patterns: ['share', 'disclose', 'provide to', 'transfer to'] },
      { category: 'selling' as const, patterns: ['sell', 'monetize', 'commercial'] },
      { category: 'ai-training' as const, patterns: ['ai training', 'machine learning', 'artificial intelligence', 'train.*model', 'model training'] },
    ];

    for (const { category, patterns } of practicePatterns) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lowerText)) {
          const match = lowerText.match(new RegExp(`.{0,100}${pattern}.{0,100}`, 'i'));
          practices.push({
            category,
            description: `${category} detected in policy`,
            evidence: [createOpenJevEvidence(0.4)],
          });
          if (category === 'ai-training') aiTraining = true;
          break; // Only add once per category
        }
      }
    }

    // Purpose extraction (simplified)
    const purposePatterns = ['improve', 'personalize', 'analytics', 'marketing', 'security', 'legal', 'service'];
    for (const p of purposePatterns) {
      if (lowerText.includes(p)) purposes.push(p);
    }

    // Third party patterns
    const thirdPartyPatterns = ['third party', 'partner', 'affiliate', 'service provider', 'vendor'];
    for (const p of thirdPartyPatterns) {
      if (lowerText.includes(p)) thirdParties.push(p);
    }

    // Retention patterns
    const retentionMatch = lowerText.match(/retain.{0,50}(day|month|year|period)/i);
    if (retentionMatch) retention = retentionMatch[0];

    const evidence: EvidenceCitation[] = [createOpenJevEvidence(0.4)];

    return {
      practices,
      purposes: [...new Set(purposes)],
      thirdParties: [...new Set(thirdParties)],
      aiTraining,
      retention,
      evidence,
    };
  }

  /**
   * Extract terms clauses using regex patterns
   */
  static extractTerms(text: string): TermsExtraction {
    const lowerText = text.toLowerCase();
    const clauses: TermsClause[] = [];

    const clausePatterns: Array<{ type: TermsClause['type']; patterns: string[]; severity: TermsClause['severity'] }> = [
      { type: 'arbitration', patterns: ['arbitration', 'binding arbitration', 'arbitrate'], severity: 'high' },
      { type: 'auto-renewal', patterns: ['auto-renew', 'automatic renewal', 'auto renew', 'renew automatically'], severity: 'medium' },
      { type: 'liability', patterns: ['limitation of liability', 'liable', 'liability', 'damages'], severity: 'medium' },
      { type: 'content-license', patterns: ['license', 'intellectual property', 'copyright', 'content license'], severity: 'high' },
      { type: 'termination', patterns: ['terminat', 'cancel', 'end this agreement'], severity: 'medium' },
      { type: 'governing-law', patterns: ['governing law', 'jurisdiction', 'venue'], severity: 'low' },
    ];

    for (const { type, patterns, severity } of clausePatterns) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lowerText)) {
          const match = lowerText.match(new RegExp(`.{0,200}${pattern}.{0,200}`, 'i'));
          clauses.push({
            type,
            text: match ? match[0] : `Clause related to ${type}`,
            severity,
            evidence: [createOpenJevEvidence(0.4)],
          });
          break;
        }
      }
    }

    const evidence: EvidenceCitation[] = [createOpenJevEvidence(0.4)];

    return {
      clauses,
      evidence,
    };
  }

  /**
   * Reason about purpose/access mismatch using keyword matching
   */
  static reasonMismatch(
    events: ConsentEvent[],
    purpose: Purpose
  ): MismatchReasoning[] {
    const purposeInferred = purpose.inferred || '';
    const purposeKeywords = this.getPurposeKeywords(purposeInferred);

    return events.map(event => {
      let relevance: MismatchReasoning['relevance'] = 'unclear';
      let reasoning = 'Unable to determine relevance';

      const capText = this.getCapabilityText(event.capability).toLowerCase();

      // Check for relevant keywords
      const relevantMatches = purposeKeywords.filter(k => capText.includes(k.toLowerCase()));
      const excessiveIndicators = ['admin', 'delete', 'write', 'manage', 'full', 'all'];

      if (relevantMatches.length > 0) {
        if (excessiveIndicators.some(e => capText.includes(e))) {
          relevance = 'potentially-excessive';
          reasoning = `Capability (${this.getCapabilityText(event.capability)}) is relevant to ${purpose.inferred} but may request excessive permissions`;
        } else {
          relevance = 'relevant';
          reasoning = `Capability (${this.getCapabilityText(event.capability)}) supports the inferred purpose: ${purpose.inferred}`;
        }
      } else if (capText.includes('analytics') || capText.includes('tracking') || capText.includes('advertising')) {
        relevance = 'potentially-excessive';
        reasoning = `Analytics/tracking capability may be excessive for ${purpose.inferred} purpose`;
      } else if (purposeKeywords.length > 0) {
        // Has purpose keywords but no direct match - unclear relevance
        relevance = 'unclear';
        reasoning = `Unclear relationship between capability and purpose (${purpose.inferred})`;
      } else {
        relevance = 'unrelated';
        reasoning = `Capability (${this.getCapabilityText(event.capability)}) does not clearly relate to ${purpose.inferred} purpose`;
      }

      const confidence = relevance === 'unclear' ? 0.3 : 0.5;
      const evidence: EvidenceCitation[] = [createOpenJevEvidence(confidence)];

      return {
        capability: event.capability,
        relevance,
        reasoning,
        evidence,
      };
    });
  }

  /**
   * Classify batch using fallback (delegates to individual classify methods)
   */
  static classifyBatch(events: ConsentEvent[]): OpenJevClassification[] {
    return events.map(event => this.classifyEvent(event));
  }

  /**
   * Classify a single event using fallback heuristics
   */
  static classifyEvent(event: ConsentEvent): OpenJevClassification {
    const permInterp = this.interpretPermission(event.capability);
    
    let decision: 'allow' | 'ask' | 'deny' = 'ask';
    let decisionConfidence = 0.4;
    let excessiveness: 'excessive' | 'appropriate' | 'minimal' = 'appropriate';
    let excessivenessConfidence = 0.4;
    let purposeMatch: 'relevant' | 'unclear' | 'unrelated' = 'unclear';
    let purposeMatchConfidence = 0.3;
    let sensitivity = permInterp.sensitivity;
    let sensitivityScore: 0 | 1 | 2 = sensitivity === 'high' ? 2 : sensitivity === 'medium' ? 1 : 0;

    // Simple heuristic for decision based on sensitivity
    if (sensitivity === 'low') {
      decision = 'allow';
      decisionConfidence = 0.5;
    } else if (sensitivity === 'high') {
      decision = 'ask';
      decisionConfidence = 0.5;
    }

    const evidence: EvidenceCitation[] = [createOpenJevEvidence(0.4)];

    return {
      decision,
      decisionConfidence,
      excessiveness,
      excessivenessConfidence,
      purposeMatch,
      purposeMatchConfidence,
      sensitivity,
      sensitivityScore,
      evidence,
    };
  }

  private static getPurposeKeywords(purpose: string): string[] {
    const keywordMap: Record<string, string[]> = {
      productivity: ['document', 'edit', 'file', 'drive', 'workspace', 'project', 'task'],
      social: ['post', 'share', 'friend', 'message', 'profile', 'social', 'feed'],
      ecommerce: ['cart', 'payment', 'product', 'order', 'buy', 'shop', 'checkout'],
      content: ['video', 'watch', 'read', 'article', 'stream', 'media', 'content'],
      auth: ['login', 'account', 'password', 'signin', 'signup', 'auth'],
      other: [],
    };
    return keywordMap[purpose] || [];
  }

  private static getCapabilityText(cap: Capability): string {
    if (isOAuthCapability(cap)) return `OAuth ${cap.provider} ${cap.scope.join(', ')}`;
    if (isBrowserPermissionCapability(cap)) return `Browser ${cap.permission}`;
    if (isCookieCapability(cap)) return `Cookie ${cap.category} ${cap.name || ''}`;
    if (isPolicyCapability(cap)) return `Policy ${cap.practice}`;
    if (isTermsCapability(cap)) return `Terms ${cap.clause}`;
    return 'Unknown';
  }

  /**
   * Plugin-compatible classify for AIBackend interface
   * Returns Classification[] matching DecisionRecord.aiClassification structure
   */
  static classifyBatchForPlugin(events: ConsentEvent[]): Classification[] {
    return events.map(event => this.classifyEventForPlugin(event));
  }

  /**
   * Classify a single event for plugin interface
   */
  static classifyEventForPlugin(event: ConsentEvent): Classification {
    const permInterp = this.interpretPermission(event.capability);
    
    let decision: 'allow' | 'ask' | 'deny' = 'ask';
    let excessiveness: 'none' | 'moderate' | 'excessive' = 'moderate';
    let purposeMatch = false;

    // Simple heuristic for decision based on sensitivity
    if (permInterp.sensitivity === 'low') {
      decision = 'allow';
      excessiveness = 'none';
      purposeMatch = true;
    } else if (permInterp.sensitivity === 'high') {
      decision = 'ask';
      excessiveness = 'excessive';
      purposeMatch = false;
    } else {
      decision = 'ask';
      excessiveness = 'moderate';
      purposeMatch = false;
    }

    return {
      decision,
      excessiveness,
      purposeMatch,
      reasoning: `Fallback classification for ${this.getCapabilityText(event.capability)}: sensitivity=${permInterp.sensitivity}`,
    };
  }

  /**
   * Plugin-compatible extract for policy
   */
  static extractPolicyForPlugin(text: string): ExtractedData {
    const extraction = this.extractPolicy(text);
    return {
      practices: extraction.practices.map(p => ({
        type: p.category,
        text: p.description,
        confidence: 0.4,
      })),
      purposes: extraction.purposes.map(p => ({
        stated: p,
        inferred: p,
        confidence: 0.4,
      })),
      metadata: {
        aiTraining: extraction.aiTraining,
        retention: extraction.retention,
        thirdParties: extraction.thirdParties,
      },
    };
  }

  /**
   * Plugin-compatible extract for terms
   */
  static extractTermsForPlugin(text: string): ExtractedData {
    const extraction = this.extractTerms(text);
    return {
      clauses: extraction.clauses.map(c => ({
        type: c.type,
        text: c.text,
        severity: c.severity,
        confidence: 0.4,
      })),
      metadata: {
        clauseCount: extraction.clauses.length,
      },
    };
  }

  /**
   * Plugin-compatible reason for mismatch
   */
  static reasonMismatchForPlugin(events: ConsentEvent[], purpose: Purpose): ReasoningResult {
    const reasonings = this.reasonMismatch(events, { 
      inferred: purpose.inferred || '', 
      confidence: purpose.confidence 
    });
    
    const hasMismatch = reasonings.some(r => r.relevance === 'potentially-excessive' || r.relevance === 'unrelated');
    const highRisk = reasonings.some(r => r.relevance === 'unrelated');
    
    return {
      mismatch: hasMismatch,
      mismatchDetails: hasMismatch ? reasonings.map(r => `${r.relevance}: ${r.reasoning}`).join('; ') : undefined,
      userIntentAlignment: hasMismatch ? (highRisk ? 'misaligned' : 'partial') : 'aligned',
      riskLevel: highRisk ? 'high' : hasMismatch ? 'medium' : 'low',
      recommendations: hasMismatch ? ['Review excessive permissions', 'Consider denying unrelated requests'] : [],
      confidence: 0.4,
      metadata: {
        totalEvents: events.length,
        mismatchCount: reasonings.filter(r => r.relevance !== 'relevant').length,
      },
    };
  }
}