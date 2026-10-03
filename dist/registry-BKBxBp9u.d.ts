import { b as ConsentEvent, E as ErrorSeverity } from './index-CEZZYamR.js';
import { PageContext, AdapterResult, AdapterError } from './shared/index.js';

/**
 * Adapter interface and types - per D-10, D-11, D-12
 */

/**
 * Adapter interface - per D-11, D-12
 * Method signature: async extract(context): Promise<AdapterResult>
 * Error handling: Fail-open + error collection
 */
interface Adapter {
    /** Unique adapter name */
    name: string;
    /** Execution priority (lower runs first) per D-23 */
    priority: number;
    /**
     * Extract consent events from page context
     * @param context PageContext with raw Document access per D-10
     * @returns Promise resolving to events and errors (fail-open)
     */
    extract(context: PageContext): Promise<AdapterResult>;
}
/**
 * Base adapter class with common functionality
 */
declare abstract class BaseAdapter implements Adapter {
    abstract readonly name: string;
    abstract readonly priority: number;
    abstract extract(context: PageContext): Promise<AdapterResult>;
    /**
     * Creates a success result with events
     */
    protected createResult(events?: ConsentEvent[], errors?: AdapterError[]): AdapterResult;
    /**
     * Creates an adapter error
     */
    protected createError(message: string, code: string, severity?: ErrorSeverity, context?: Record<string, unknown>): AdapterError;
    /**
     * Safe extraction wrapper - fail-open per D-12
     */
    protected safeExtract<T>(fn: () => Promise<T>, errorCode: string, errorMessage: string): Promise<{
        data: T | null;
        error: AdapterError | null;
    }>;
}

/**
 * Adapter Registry - manages adapter registration and execution per D-22, D-23, D-24
 */

/**
 * AdapterRegistry class
 * - Explicit array registration per D-22
 * - Configurable priority sorting ascending per D-23
 * - Mutable context enrichment per D-24
 */
declare class AdapterRegistry {
    private adapters;
    private sharedContext;
    /**
     * Register adapters - explicit array per D-22
     */
    register(adapters: Adapter[]): void;
    /**
     * Add a single adapter
     */
    add(adapter: Adapter): void;
    /**
     * Remove an adapter by name
     */
    remove(name: string): boolean;
    /**
     * Get all registered adapters
     */
    getAdapters(): Adapter[];
    /**
     * Get adapter by name
     */
    getAdapter(name: string): Adapter | undefined;
    /**
     * Run all adapters in priority order per D-23
     * Each adapter wrapped in try/catch for fail-open per D-12
     * Context is mutable and enriched per D-24
     */
    run(context: PageContext): Promise<AdapterResult>;
    /**
     * Set shared context value (mutable enrichment per D-24)
     */
    setSharedContext(key: string, value: unknown): void;
    /**
     * Get shared context value
     */
    getSharedContext(key: string): unknown;
    /**
     * Clear shared context
     */
    clearSharedContext(): void;
    /**
     * Clear all adapters
     */
    clear(): void;
}

export { type Adapter as A, BaseAdapter as B, AdapterRegistry as a };
