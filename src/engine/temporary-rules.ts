/**
 * Temporary Rule Manager - manages time-limited user rules with TTL
 * Supports session, 1hr, 24hr, and custom TTL types
 */

import type { ParsedRule, TTLRule, TTLType } from './types.js';
import { generateRuleId } from './types.js';

/**
 * TemporaryRuleManager class - manages temporary rules with automatic expiry
 * Rules are injected into the user layer of the precedence engine with expiry timestamps
 */
export class TemporaryRuleManager {
  private rules: Map<string, TTLRule> = new Map();
  private sessionRules: Set<string> = new Set();

  /**
   * Add a temporary rule with specified TTL
   * @param rule - The parsed rule to add
   * @param ttl - TTL type: 'session', '1hr', '24hr', or 'custom'
   * @param customMs - Custom TTL in milliseconds (required for 'custom' type)
   * @returns The generated rule ID
   */
  add(rule: ParsedRule, ttl: TTLType, customMs?: number): string {
    const now = Date.now();
    let expiresAt: number;

    switch (ttl) {
      case 'session':
        // Session rules: very large number, cleared on explicit clear()
        expiresAt = Number.MAX_SAFE_INTEGER;
        break;
      case '1hr':
        expiresAt = now + 60 * 60 * 1000; // 1 hour
        break;
      case '24hr':
        expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'custom':
        if (customMs === undefined || customMs < 0) {
          throw new Error('customMs is required and must be non-negative for custom TTL type');
        }
        expiresAt = now + customMs;
        break;
      default:
        throw new Error(`Unknown TTL type: ${ttl}`);
    }

    const ruleId = generateRuleId(`${rule.raw}_${now}`);

    const ttlRule: TTLRule = {
      ...rule,
      id: ruleId,
      expiresAt,
      ttlType: ttl,
      createdAt: now,
    };

    this.rules.set(ruleId, ttlRule);

    // Track session rules for special handling
    if (ttl === 'session') {
      this.sessionRules.add(ruleId);
    }

    return ruleId;
  }

  /**
   * Get all non-expired temporary rules
   * @returns Array of active TTLRule objects
   */
  getActive(): TTLRule[] {
    this.clearExpired(); // Clean up expired rules first
    return Array.from(this.rules.values());
  }

  /**
   * Remove a temporary rule by ID
   * @param ruleId - The rule ID to remove
   * @returns true if rule was found and removed, false otherwise
   */
  remove(ruleId: string): boolean {
    const existed = this.rules.has(ruleId);
    this.rules.delete(ruleId);
    this.sessionRules.delete(ruleId);
    return existed;
  }

  /**
   * Clear all temporary rules
   */
  clear(): void {
    this.rules.clear();
    this.sessionRules.clear();
  }

  /**
   * Clear all expired temporary rules
   * @returns Number of rules removed
   */
  clearExpired(): number {
    const now = Date.now();
    let removed = 0;

    for (const [ruleId, rule] of this.rules.entries()) {
      if (rule.expiresAt !== Number.MAX_SAFE_INTEGER && rule.expiresAt <= now) {
        this.rules.delete(ruleId);
        this.sessionRules.delete(ruleId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get remaining time until rule expiry in milliseconds
   * @param ruleId - The rule ID
   * @returns Milliseconds until expiry, or null if rule not found or is session type
   */
  getRemainingTime(ruleId: string): number | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    if (rule.expiresAt === Number.MAX_SAFE_INTEGER) {
      return null; // Session rule - no expiry
    }

    const remaining = rule.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Get a specific rule by ID (including expired)
   * @param ruleId - The rule ID
   * @returns The TTLRule or undefined if not found
   */
  getRule(ruleId: string): TTLRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules including expired (for debugging/inspection)
   * @returns Array of all TTLRule objects
   */
  getAll(): TTLRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Check if a rule is expired
   * @param ruleId - The rule ID
   * @returns true if rule exists and is expired, false otherwise
   */
  isExpired(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return true; // Non-existent rules are effectively expired
    if (rule.expiresAt === Number.MAX_SAFE_INTEGER) return false; // Session rules never expire
    return rule.expiresAt <= Date.now();
  }
}