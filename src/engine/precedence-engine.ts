/**
 * Precedence Engine - evaluates rules with uBlock-style 4-layer precedence
 * Layers (highest to lowest): user > trusted > community > defaults
 * Exception rules (@@) override higher-precedence deny rules for matching capability@domain
 */

import type { ParsedRule, RuleSet, EngineDecision, PrecedenceLayer } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import { matchRule } from './rule-matcher.js';

/**
 * Key for matching exceptions: capabilityPattern@domainPattern
 */
function getExceptionKey(rule: ParsedRule): string {
  return `${rule.capabilityPattern}@${rule.domainPattern}`;
}

/**
 * PrecedenceEngine class - implements 4-layer rule evaluation with exception handling
 */
export class PrecedenceEngine {
  private ruleSets: RuleSet[];
  private matcher: (rule: ParsedRule, event: ConsentEvent) => ReturnType<typeof matchRule>;

  /**
   * Create a new PrecedenceEngine
   * @param ruleSets - Array of RuleSet objects ordered by precedence (user first, defaults last)
   * @param matcher - Optional custom matcher function (defaults to matchRule)
   */
  constructor(
    ruleSets: RuleSet[],
    matcher: (rule: ParsedRule, event: ConsentEvent) => ReturnType<typeof matchRule> = matchRule
  ) {
    // Validate layer ordering: user > trusted > community > defaults
    const expectedOrder: PrecedenceLayer[] = ['user', 'trusted', 'community', 'defaults'];
    const providedLayers = ruleSets.map(rs => rs.layer);
    
    // Ensure all layers are present and in correct order
    for (let i = 0; i < providedLayers.length; i++) {
      const expectedLayer = expectedOrder[i];
      if (providedLayers[i] !== expectedLayer) {
        throw new Error(
          `RuleSets must be ordered by precedence: user > trusted > community > defaults. ` +
          `Expected ${expectedLayer} at index ${i}, got ${providedLayers[i]}`
        );
      }
    }

    this.ruleSets = ruleSets;
    this.matcher = matcher;
  }

  /**
   * Evaluate a ConsentEvent against all rule layers
   * @param event - The consent event to evaluate
   * @returns EngineDecision with decision, matched rule, layer, explanation, and confidence
   */
  evaluate(event: ConsentEvent): EngineDecision {
    // PHASE 1: Collect all matching exceptions across ALL layers
    // Exceptions are keyed by capability@domain pattern for exact matching
    const matchingExceptions = new Map<string, { rule: ParsedRule; layer: PrecedenceLayer }>();
    
    for (const ruleSet of this.ruleSets) {
      for (const rule of ruleSet.rules) {
        if (!rule.isException) continue;
        
        const matchResult = this.matcher(rule, event);
        if (matchResult.matched) {
          const key = getExceptionKey(rule);
          // First exception wins for a given key (higher precedence layer wins)
          if (!matchingExceptions.has(key)) {
            matchingExceptions.set(key, { rule, layer: ruleSet.layer });
          }
        }
      }
    }

    // PHASE 2: Evaluate non-exception rules in precedence order
    for (const ruleSet of this.ruleSets) {
      for (const rule of ruleSet.rules) {
        if (rule.isException) continue; // Skip exceptions, already processed
        
        const matchResult = this.matcher(rule, event);
        if (!matchResult.matched) continue;

        // Non-exception rule matched
        const exceptionKey = getExceptionKey(rule);
        const hasMatchingException = matchingExceptions.has(exceptionKey);

        // If rule is 'deny' and there's a matching exception, exception wins
        if (rule.action === 'deny' && hasMatchingException) {
          const exceptionInfo = matchingExceptions.get(exceptionKey)!;
          return {
            decision: 'allow',
            matchedRule: exceptionInfo.rule,
            matchedLayer: 'exception',
            explanation: `Exception rule "${exceptionInfo.rule.raw}" overrides deny from layer '${ruleSet.layer}' for ${exceptionKey}`,
            confidence: 0.9,
          };
        }

        // For 'allow' or 'ask' rules, or deny without exception, return the decision
        return {
          decision: rule.action,
          matchedRule: rule,
          matchedLayer: ruleSet.layer,
          explanation: `Layer '${ruleSet.layer}': matched rule "${rule.raw}" → ${rule.action}`,
          confidence: 1.0,
        };
      }
    }

    // PHASE 3: No non-exception rules matched
    // Check if any exception matched (implicit allow when only exceptions match)
    if (matchingExceptions.size > 0) {
      // Return the highest-precedence exception (first in map due to layer order)
      const firstException = matchingExceptions.values().next().value;
      if (firstException) {
        return {
          decision: 'allow',
          matchedRule: firstException.rule,
          matchedLayer: 'exception',
          explanation: `Exception rule "${firstException.rule.raw}" matched → allow (no conflicting rules)`,
          confidence: 0.9,
        };
      }
    }

    // No matches at all - default to 'ask' per uBlock behavior
    return {
      decision: 'ask',
      explanation: 'No matching rules found in any layer',
      confidence: 0.5,
    };
  }

  /**
   * Get all rule sets
   */
  getRuleSets(): RuleSet[] {
    return [...this.ruleSets];
  }

  /**
   * Get rules for a specific layer
   */
  getRulesForLayer(layer: PrecedenceLayer): ParsedRule[] {
    const ruleSet = this.ruleSets.find(rs => rs.layer === layer);
    return ruleSet ? [...ruleSet.rules] : [];
  }
}