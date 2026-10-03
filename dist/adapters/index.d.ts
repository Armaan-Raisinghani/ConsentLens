import { B as BaseAdapter } from '../registry-BKBxBp9u.js';
export { A as Adapter, a as AdapterRegistry } from '../registry-BKBxBp9u.js';
import { PageContext, AdapterResult } from '../shared/index.js';
export { AdapterError, AdapterFactory } from '../shared/index.js';
import '../index-CEZZYamR.js';

/**
 * OAuth Adapter - detects OAuth consent flows per D-13, D-14, D-15
 */

/**
 * OAuthAdapter class implementing Adapter interface
 * Priority: 10 (runs first per D-23 suggestion)
 */
declare class OAuthAdapter extends BaseAdapter {
    readonly name = "oauth";
    readonly priority = 10;
    extract(context: PageContext): Promise<AdapterResult>;
    /**
     * Detect OAuth-related elements in the DOM
     */
    private detectOAuthElements;
    /**
     * Extract OAuth event from a detected element
     */
    private extractOAuthEvent;
    /**
     * Identify OAuth provider from various signals
     */
    private identifyProvider;
    /**
     * Extract scopes from URL params and data attributes per D-14
     */
    private extractScopes;
    /**
     * Detect generic OAuth patterns (fallback per D-13)
     */
    private detectGenericOAuth;
    /**
     * Generate a CSS selector for an element
     */
    private getSelector;
}

export { AdapterResult, BaseAdapter, OAuthAdapter, PageContext };
