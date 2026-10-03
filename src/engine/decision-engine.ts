/**
 * Decision Engine - core engine that evaluates rules against ConsentEvents
 * Uses PrecedenceEngine for multi-layer rule evaluation with policy packs
 * Returns allow/ask/deny decisions with explanations
 */

import type { ParsedRule, EngineDecision } from './types.js';
import type { ConsentEvent } from '../ir/consent-event.js';
import { matchRule } from './rule-matcher.js';
import { PrecedenceEngine } from './precedence-engine.js';
import { createFullRuleSets, getPack } from './policy-packs.js';

/**
 * DecisionEngine class - evaluates rules against consent events using precedence engine
 */
export class DecisionEngine {
  private precedenceEngine: PrecedenceEngine;
  private userRules: ParsedRule[];
  private trustedPackIds: string[];
  private communityPackIds: string[];
  private defaultPackId: string;

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
    return this.precedenceEngine.evaluate(event);
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