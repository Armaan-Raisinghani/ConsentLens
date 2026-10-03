/**
 * Policy Packs - Built-in policy packs for common consent preferences
 * Packs are organized by precedence layer: 'trusted' (higher) or 'defaults' (lower)
 */

import type { ParsedRule, RuleSet, PrecedenceLayer } from './types.js';
import { parseRules } from './rule-parser.js';

/**
 * PolicyPack interface - defines a named collection of rules
 */
export interface PolicyPack {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this pack does */
  description: string;
  /** Version string */
  version: string;
  /** Array of rule strings in uBlock syntax */
  rules: string[];
  /** Precedence layer for this pack */
  layer: PrecedenceLayer;
}

/**
 * BUILTIN_PACKS - 5 built-in policy packs per ENGINE-06
 * Layer assignment:
 * - 'trusted': no-ai-training (higher precedence than defaults)
 * - 'defaults': balanced, strict, essential, paranoid
 */
export const BUILTIN_PACKS: PolicyPack[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Balanced privacy - allows essential, asks for analytics/OAuth, denies advertising',
    version: '1.0.0',
    layer: 'defaults',
    rules: [
      '! Balanced Policy Pack',
      '! Allow essential cookies',
      'cookie.essential@* = allow',
      '! Ask for analytics cookies',
      'cookie.analytics@* = ask',
      '! Deny advertising cookies',
      'cookie.advertising@* = deny',
      '! Ask for OAuth',
      'oauth.*@* = ask',
      '! Ask for browser permissions',
      'browser-permission.*@* = ask',
      '! Ask for policy/terms',
      'policy.*@* = ask',
      'terms.*@* = ask',
    ],
  },
  {
    id: 'strict',
    name: 'Strict',
    description: 'Strict privacy - denies all non-essential, asks only for necessary permissions',
    version: '1.0.0',
    layer: 'defaults',
    rules: [
      '! Strict Policy Pack',
      '! Deny all cookies except essential',
      'cookie.*@* = deny',
      'cookie.essential@* = allow',
      '! Deny all OAuth',
      'oauth.*@* = deny',
      '! Deny sensitive browser permissions',
      'browser-permission.location@* = deny',
      'browser-permission.camera@* = deny',
      'browser-permission.microphone@* = deny',
      '! Ask for other browser permissions',
      'browser-permission.*@* = ask',
      '! Deny AI training policies',
      'policy.ai-training@* = deny',
      '! Ask for other policy/terms',
      'policy.*@* = ask',
      'terms.*@* = ask',
    ],
  },
  {
    id: 'essential',
    name: 'Essential Only',
    description: 'Minimal functionality - only essential cookies allowed, everything else denied',
    version: '1.0.0',
    layer: 'defaults',
    rules: [
      '! Essential Only Policy Pack',
      '! Allow only essential cookies',
      'cookie.essential@* = allow',
      '! Deny everything else',
      '*@* = deny',
    ],
  },
  {
    id: 'no-ai-training',
    name: 'No AI Training',
    description: 'Blocks AI training and data sharing for AI - inherits Balanced for everything else',
    version: '1.0.0',
    layer: 'trusted', // Higher precedence than defaults
    rules: [
      '! No AI Training Policy Pack',
      '! Deny AI training policies',
      'policy.ai-training@* = deny',
      '! Deny data sharing for AI',
      'policy.data-sharing.ai@* = deny',
      '! Inherits Balanced for everything else via layer precedence',
    ],
  },
  {
    id: 'paranoid',
    name: 'Paranoid',
    description: 'Maximum privacy - denies all consent requests, no exceptions',
    version: '1.0.0',
    layer: 'defaults',
    rules: [
      '! Paranoid Policy Pack',
      '! Deny all',
      '*@* = deny',
    ],
  },
];

/**
 * Get a policy pack by ID
 * @param id - Pack identifier (e.g., 'balanced', 'strict', 'essential', 'no-ai-training', 'paranoid')
 * @returns PolicyPack or undefined if not found
 */
export function getPack(id: string): PolicyPack | undefined {
  return BUILTIN_PACKS.find(pack => pack.id === id);
}

/**
 * Get all built-in policy packs
 * @returns Array of all PolicyPack objects
 */
export function getAllPacks(): PolicyPack[] {
  return [...BUILTIN_PACKS];
}

/**
 * Convert policy pack IDs to RuleSets with parsed rules
 * @param packIds - Array of pack IDs to include
 * @returns Array of RuleSets ordered by precedence (trusted before defaults)
 */
export function createRuleSetsFromPacks(packIds: string[]): RuleSet[] {
  const trustedPacks: PolicyPack[] = [];
  const defaultsPacks: PolicyPack[] = [];

  // Separate packs by layer
  for (const packId of packIds) {
    const pack = getPack(packId);
    if (!pack) {
      throw new Error(`Unknown policy pack: ${packId}`);
    }
    if (pack.layer === 'trusted') {
      trustedPacks.push(pack);
    } else if (pack.layer === 'defaults') {
      defaultsPacks.push(pack);
    }
  }

  const ruleSets: RuleSet[] = [];

  // Add trusted layer packs (if any)
  if (trustedPacks.length > 0) {
    const allTrustedRules: ParsedRule[] = [];
    for (const pack of trustedPacks) {
      const parsedRules = parseRules(pack.rules.join('\n'));
      // Set precedenceLayer for each rule
      for (const rule of parsedRules) {
        rule.precedenceLayer = 'trusted';
      }
      allTrustedRules.push(...parsedRules);
    }
    ruleSets.push({ layer: 'trusted', rules: allTrustedRules });
  }

  // Add defaults layer packs (if any)
  if (defaultsPacks.length > 0) {
    const allDefaultsRules: ParsedRule[] = [];
    for (const pack of defaultsPacks) {
      const parsedRules = parseRules(pack.rules.join('\n'));
      // Set precedenceLayer for each rule
      for (const rule of parsedRules) {
        rule.precedenceLayer = 'defaults';
      }
      allDefaultsRules.push(...parsedRules);
    }
    ruleSets.push({ layer: 'defaults', rules: allDefaultsRules });
  }

  return ruleSets;
}

/**
 * Create RuleSets from pack IDs with a specific target layer
 * @param packIds - Array of pack IDs
 * @param targetLayer - Layer to assign to all rules (overrides pack's default layer)
 * @returns Array of RuleSets (single element with targetLayer)
 */
function createRuleSetsFromPacksWithLayer(
  packIds: string[],
  targetLayer: PrecedenceLayer
): RuleSet[] {
  if (packIds.length === 0) {
    return [];
  }

  const allRules: ParsedRule[] = [];
  for (const packId of packIds) {
    const pack = getPack(packId);
    if (!pack) {
      throw new Error(`Unknown policy pack: ${packId}`);
    }
    const parsedRules = parseRules(pack.rules.join('\n'));
    // Override precedenceLayer with targetLayer
    for (const rule of parsedRules) {
      rule.precedenceLayer = targetLayer;
    }
    allRules.push(...parsedRules);
  }

  return [{ layer: targetLayer, rules: allRules }];
}

/**
 * Create a complete RuleSet array for all 4 layers
 * @param userRules - User rules (layer: 'user')
 * @param trustedPackIds - Trusted pack IDs (layer: 'trusted')
 * @param communityPackIds - Community pack IDs (layer: 'community')
 * @param defaultPackId - Default pack ID (layer: 'defaults')
 * @returns Array of 4 RuleSets in precedence order
 */
export function createFullRuleSets(
  userRules: ParsedRule[] = [],
  trustedPackIds: string[] = [],
  communityPackIds: string[] = [],
  defaultPackId: string = 'balanced'
): RuleSet[] {
  const ruleSets: RuleSet[] = [];

  // User layer
  const userRulesWithLayer = userRules.map(r => ({ ...r, precedenceLayer: 'user' as PrecedenceLayer }));
  ruleSets.push({ layer: 'user', rules: userRulesWithLayer });

  // Trusted layer
  const trustedRuleSets = createRuleSetsFromPacksWithLayer(trustedPackIds, 'trusted');
  const trustedRules = trustedRuleSets.flatMap(rs => rs.rules);
  ruleSets.push({ layer: 'trusted', rules: trustedRules });

  // Community layer
  const communityRuleSets = createRuleSetsFromPacksWithLayer(communityPackIds, 'community');
  const communityRules = communityRuleSets.flatMap(rs => rs.rules);
  ruleSets.push({ layer: 'community', rules: communityRules });

  // Defaults layer
  const defaultsRuleSets = createRuleSetsFromPacksWithLayer([defaultPackId], 'defaults');
  const defaultsRules = defaultsRuleSets.flatMap(rs => rs.rules);
  ruleSets.push({ layer: 'defaults', rules: defaultsRules });

  return ruleSets;
}