/**
 * Decision Engine - core engine that evaluates rules against ConsentEvents
 * Returns allow/ask/deny decisions with explanations
 */

import type { ParsedRule, EngineDecision } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import { matchRule } from './rule-matcher.js';

/**
 * DecisionEngine class - evaluates rules against consent events
 */
export class DecisionEngine {
  private rules: ParsedRule[];
  
  /**
   * Create a new DecisionEngine
   * @param rules - Array of parsed rules to evaluate
   */
  constructor(rules: ParsedRule[]) {
    // Sort rules by precedence (highest first)
    this.rules = [...rules].sort((_a, _b) => {
      // For now, all rules are 'user' precedence, so maintain order
      // In future, sort by precedence layer weight
      return 0;
    });
  }
  
  /**
   * Decide on a ConsentEvent by evaluating all rules
   * Returns the first matching rule's decision (for tracer, single rule)
   * @param event - The consent event to evaluate
   * @returns EngineDecision with decision, matched rule, explanation, and confidence
   */
  decide(event: ConsentEvent): EngineDecision {
    // Check each rule in order
    for (const rule of this.rules) {
      const matchResult = matchRule(rule, event);
      
      if (matchResult.matched) {
        // Rule matched - return decision based on rule action
        const decision = rule.action;
        const explanation = `Matched rule: "${rule.raw}" → ${decision}`;
        
        return {
          decision,
          matchedRule: rule,
          explanation,
          confidence: 1.0,
        };
      }
    }
    
    // No rules matched - default to ask
    return {
      decision: 'ask',
      explanation: 'No matching rules found',
      confidence: 0.5,
    };
  }
  
  /**
   * Get all registered rules
   */
  getRules(): ParsedRule[] {
    return [...this.rules];
  }
  
  /**
   * Add a rule to the engine
   */
  addRule(rule: ParsedRule): void {
    this.rules.push(rule);
    // Re-sort by precedence (for future expansion)
    this.rules.sort((_a, _b) => {
      return 0; // All same precedence for now
    });
  }
}