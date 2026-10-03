/**
 * Decision Engine - core engine that evaluates rules against ConsentEvents
 * Uses PrecedenceEngine for multi-layer rule evaluation with policy packs
 * Returns allow/ask/deny decisions with explanations
 */

import type { ParsedRule, EngineDecision, TTLType, TTLRule, Explanation } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import type { DecisionRecord } from '../ir/decision-record.js';
import { matchRule } from './rule-matcher.js';
import { PrecedenceEngine } from './precedence-engine.js';
import { createFullRuleSets, getPack } from './policy-packs.js';
import { TemporaryRuleManager } from './temporary-rules.js';
import { ExplanationGenerator } from './explanation.js';
import { createDecisionRecord } from '../ir/decision-record.js';

/**
 * DecisionEngine class - evaluates rules against consent events using precedence engine
 */
export class DecisionEngine {
  private precedenceEngine: PrecedenceEngine;
  private userRules: ParsedRule[];
  private trustedPackIds: string[];
  private communityPackIds: string[];
  private defaultPackId: string;
  private temporaryRuleManager: TemporaryRuleManager;
  private explanationGenerator: ExplanationGenerator;

  /**
   * Create a new DecisionEngine
   * @param userRules - User rules (layer: 'user')
   * @param trustedPacks - Trusted pack IDs (layer: 'trusted')
   * @param communityPacks - Community pack IDs (layer: 'community')
   * @param defaultPack - Default pack ID (layer: 'defaults', default: 'balanced')
   */
  constructor(
    userRules: ParsedRule[] = [],
    trustedPacks: string[] = [],
    communityPacks: string[] = [],
    defaultPack: string = 'balanced'
  ) {
    this.userRules = [...userRules];
    this.trustedPackIds = [...trustedPacks];
    this.communityPackIds = [...communityPacks];
    this.defaultPackId = defaultPack;
    this.temporaryRuleManager = new TemporaryRuleManager();
    this.explanationGenerator = new ExplanationGenerator();

    // Validate pack IDs
    for (const packId of [...trustedPacks, ...communityPacks, defaultPack]) {
      if (!getPack(packId)) {
        throw new Error(`Unknown policy pack: ${packId}`);
      }
    }

    // Build RuleSets from all layers
    const ruleSets = createFullRuleSets(
      this.userRules,
      this.trustedPackIds,
      this.communityPackIds,
      this.defaultPackId
    );

    // Create PrecedenceEngine
    this.precedenceEngine = new PrecedenceEngine(ruleSets, matchRule);
  }

  /**
   * Decide on a ConsentEvent by evaluating all rule layers
   * Delegates to PrecedenceEngine for multi-layer evaluation
   * @param event - The consent event to evaluate
   * @returns EngineDecision with decision, matched rule, layer, explanation, and confidence
   */
  decide(event: ConsentEvent): EngineDecision {
    // Merge temporary rules into user layer before evaluation
    this.mergeTemporaryRules();
    return this.precedenceEngine.evaluate(event);
  }

  /**
   * Add a temporary rule that affects decisions
   * @param rule - The parsed rule to add
   * @param ttl - TTL type: 'session', '1hr', '24hr', or 'custom'
   * @param customMs - Custom TTL in milliseconds (required for 'custom' type)
   * @returns The generated rule ID
   */
  addTemporaryRule(rule: ParsedRule, ttl: TTLType, customMs?: number): string {
    const ruleId = this.temporaryRuleManager.add(rule, ttl, customMs);
    this.mergeTemporaryRules();
    return ruleId;
  }

  /**
   * Remove a temporary rule by ID
   * @param ruleId - The rule ID to remove
   * @returns true if rule was found and removed, false otherwise
   */
  removeTemporaryRule(ruleId: string): boolean {
    const result = this.temporaryRuleManager.remove(ruleId);
    if (result) {
      this.mergeTemporaryRules();
    }
    return result;
  }

  /**
   * Get all active temporary rules
   * @returns Array of active TTLRule objects
   */
  getTemporaryRules(): TTLRule[] {
    return this.temporaryRuleManager.getActive();
  }

  /**
   * Decide on a ConsentEvent and generate a human-readable explanation
   * @param event - The consent event to evaluate
   * @returns Object with decision and explanation
   */
  decideWithExplanation(event: ConsentEvent): { decision: EngineDecision; explanation: Explanation } {
    // Merge temporary rules into user layer before evaluation
    this.mergeTemporaryRules();
    const decision = this.precedenceEngine.evaluate(event);
    const explanation = this.explanationGenerator.generate(decision, event);
    return { decision, explanation };
  }

  /**
   * Create a DecisionRecord with explanation data for a ConsentEvent
   * @param event - The consent event that was evaluated
   * @returns DecisionRecord with matched rule, confidence, and explanation
   */
  createDecisionRecord(event: ConsentEvent): DecisionRecord {
    const { explanation } = this.decideWithExplanation(event);
    return createDecisionRecord({
      matchedRule: explanation.matchedRule,
      confidence: explanation.confidence,
      engine: 'deterministic-policy-engine',
      version: '0.1.0',
    });
  }

  /**
   * Merge temporary rules into user layer and rebuild precedence engine
   */
  private mergeTemporaryRules(): void {
    const activeTempRules = this.temporaryRuleManager.getActive();
    const combinedUserRules = [...this.userRules, ...activeTempRules];
    
    const ruleSets = createFullRuleSets(
      combinedUserRules,
      this.trustedPackIds,
      this.communityPackIds,
      this.defaultPackId
    );
    this.precedenceEngine = new PrecedenceEngine(ruleSets, matchRule);
  }

  /**
   * Get all registered user rules
   */
  getUserRules(): ParsedRule[] {
    return [...this.userRules];
  }

  /**
   * Get active trusted pack IDs
   */
  getTrustedPacks(): string[] {
    return [...this.trustedPackIds];
  }

  /**
   * Get active community pack IDs
   */
  getCommunityPacks(): string[] {
    return [...this.communityPackIds];
  }

  /**
   * Get active default pack ID
   */
  getDefaultPack(): string {
    return this.defaultPackId;
  }

  /**
   * Update user rules (layer: 'user')
   * @param rules - New user rules array
   */
  setUserRules(rules: ParsedRule[]): void {
    this.userRules = [...rules];
    this.rebuildPrecedenceEngine();
  }

  /**
   * Update active policy packs for all layers
   * @param trusted - Trusted pack IDs
   * @param community - Community pack IDs
   * @param defaults - Default pack ID
   */
  setActivePacks(trusted: string[], community: string[], defaults: string): void {
    // Validate pack IDs
    for (const packId of [...trusted, ...community, defaults]) {
      if (!getPack(packId)) {
        throw new Error(`Unknown policy pack: ${packId}`);
      }
    }

    this.trustedPackIds = [...trusted];
    this.communityPackIds = [...community];
    this.defaultPackId = defaults;
    this.rebuildPrecedenceEngine();
  }

  /**
   * Rebuild the PrecedenceEngine with current rules and packs
   */
  private rebuildPrecedenceEngine(): void {
    const ruleSets = createFullRuleSets(
      this.userRules,
      this.trustedPackIds,
      this.communityPackIds,
      this.defaultPackId
    );
    this.precedenceEngine = new PrecedenceEngine(ruleSets, matchRule);
  }

  /**
   * Get the underlying PrecedenceEngine (for advanced use cases)
   */
  getPrecedenceEngine(): PrecedenceEngine {
    return this.precedenceEngine;
  }
}