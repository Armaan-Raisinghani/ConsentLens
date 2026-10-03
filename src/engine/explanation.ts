/**
 * Explanation Generator - produces human-readable "Why?" explanations for decisions
 * Critical for the side panel UI in Phase 5
 */

import type { EngineDecision, Explanation, ExplanationDetail, Decision, PrecedenceLayer, ParsedRule } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import type { Capability } from '../ir/capability.js';
import { isOAuthCapability, isCookieCapability, isBrowserPermissionCapability, isPolicyCapability, isTermsCapability } from '../ir/capability.js';

/**
 * Format capability as human-readable string
 */
function formatCapability(capability: Capability): string {
  if (isOAuthCapability(capability)) {
    const scopes = capability.scope.length > 0 ? ` (scopes: ${capability.scope.join(', ')})` : '';
    return `OAuth: ${capability.provider}${scopes}`;
  }
  if (isCookieCapability(capability)) {
    const name = capability.name ? ` (${capability.name})` : '';
    return `Cookie: ${capability.category}${name}`;
  }
  if (isBrowserPermissionCapability(capability)) {
    return `Browser Permission: ${capability.permission}`;
  }
  if (isPolicyCapability(capability)) {
    return `Policy: ${capability.practice}`;
  }
  if (isTermsCapability(capability)) {
    return `Terms: ${capability.clause}`;
  }
  return `Unknown: ${capability.type}`;
}

/**
 * Extract domain from website URL
 */
function extractDomainFromUrl(website: string): string {
  try {
    const url = new URL(website);
    return url.hostname;
  } catch {
    return website;
  }
}

/**
 * Extract evidence strings from ConsentEvent
 */
function extractEvidenceStrings(event: ConsentEvent): string[] {
  return event.evidence.map(e => {
    const parts = [];
    if (e.selector) parts.push(`selector: ${e.selector}`);
    if (e.text) parts.push(`text: "${e.text.slice(0, 100)}${e.text.length > 100 ? '...' : ''}"`);
    if (e.url) parts.push(`url: ${e.url}`);
    parts.push(`confidence: ${(e.confidence * 100).toFixed(0)}%`);
    parts.push(`method: ${e.extractionMethod}`);
    return parts.join(', ');
  });
}

/**
 * Build human-readable explanation string
 */
function buildHumanReadable(
  decision: Decision,
  matchedRule: ParsedRule | undefined,
  matchedLayer: PrecedenceLayer | 'exception',
  capabilityStr: string,
  domain: string
): string {
  const actionStr = decision === 'allow' ? 'Allowed' : decision === 'deny' ? 'Blocked' : 'Asked';
  
  if (!matchedRule) {
    return `${actionStr} per default behavior (no matching rule) for ${capabilityStr}@${domain}`;
  }

  const ruleStr = matchedRule.raw;
  
  if (matchedLayer === 'exception') {
    return `Exception rule "${ruleStr}" matched → ${actionStr.toLowerCase()} for ${capabilityStr}@${domain}`;
  }

  const layerNames: Record<PrecedenceLayer, string> = {
    user: 'your rule',
    trusted: 'trusted pack rule',
    community: 'community pack rule',
    defaults: 'defaults pack rule',
  };
  
  const layerName = layerNames[matchedLayer] || matchedLayer;
  
  if (decision === 'deny') {
    return `Blocked by ${layerName}: \`${ruleStr}\` (${matchedLayer} layer)`;
  }
  if (decision === 'allow') {
    return `Allowed by ${layerName}: \`${ruleStr}\` (${matchedLayer} layer)`;
  }
  return `Asked per ${layerName}: \`${ruleStr}\` (${matchedLayer} layer)`;
}

/**
 * ExplanationGenerator class - generates human-readable explanations for decisions
 */
export class ExplanationGenerator {
  /**
   * Generate an explanation for an engine decision
   * @param engineDecision - The decision from the engine
   * @param event - The consent event that was evaluated
   * @returns Explanation object with human-readable string and structured data
   */
  generate(engineDecision: EngineDecision, event: ConsentEvent): Explanation {
    const capabilityStr = formatCapability(event.capability);
    const domain = extractDomainFromUrl(event.website);
    const evidence = extractEvidenceStrings(event);
    
    const humanReadable = buildHumanReadable(
      engineDecision.decision,
      engineDecision.matchedRule,
      engineDecision.matchedLayer as PrecedenceLayer | 'exception',
      capabilityStr,
      domain
    );

    return {
      decision: engineDecision.decision,
      matchedRule: engineDecision.matchedRule?.raw || 'none',
      matchedLayer: (engineDecision.matchedLayer as PrecedenceLayer | 'exception') || 'defaults',
      capability: capabilityStr,
      domain,
      action: engineDecision.decision,
      confidence: engineDecision.confidence,
      humanReadable,
      evidence,
    };
  }

  /**
   * Generate structured explanation details for advanced UI
   * @param engineDecision - The decision from the engine
   * @param event - The consent event that was evaluated
   * @returns Array of ExplanationDetail objects
   */
  generateDetails(engineDecision: EngineDecision, event: ConsentEvent): ExplanationDetail[] {
    const details: ExplanationDetail[] = [];
    
    if (!engineDecision.matchedRule) {
      details.push({
        ruleType: 'defaults',
        ruleString: '(no matching rule)',
        layer: 'defaults',
        reason: 'No matching rule found in any layer, defaulting to ask',
      });
      return details;
    }

    const matchedLayer = engineDecision.matchedLayer as PrecedenceLayer | 'exception';
    
    if (matchedLayer === 'exception') {
      details.push({
        ruleType: 'exception',
        ruleString: engineDecision.matchedRule.raw,
        layer: 'exception',
        reason: `Exception rule overrides deny for ${engineDecision.matchedRule.capabilityPattern}@${engineDecision.matchedRule.domainPattern}`,
      });
      return details;
    }

    const layerMap: Record<PrecedenceLayer, ExplanationDetail['ruleType']> = {
      user: 'user',
      trusted: 'trusted',
      community: 'community',
      defaults: 'defaults',
    };

    details.push({
      ruleType: layerMap[matchedLayer] || 'defaults',
      ruleString: engineDecision.matchedRule.raw,
      layer: matchedLayer,
      reason: `Layer '${matchedLayer}': matched rule "${engineDecision.matchedRule.raw}" → ${engineDecision.decision}`,
    });

    return details;
  }
}