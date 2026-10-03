import { B as BaseAdapter } from '../registry-CpPLxLm3.cjs';
export { A as Adapter, a as AdapterRegistry } from '../registry-CpPLxLm3.cjs';
import { PageContext, AdapterResult } from '../shared/index.cjs';
export { AdapterError, AdapterFactory } from '../shared/index.cjs';
import '../index-CEZZYamR.cjs';

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
