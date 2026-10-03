/**
 * Adapter Registry - manages adapter registration and execution per D-22, D-23, D-24
 */

import type { Adapter } from './adapter.js';
import type { AdapterResult, PageContext } from '../shared/errors.js';
import { ErrorSeverity } from '../shared/errors.js';

/**
 * AdapterRegistry class
 * - Explicit array registration per D-22
 * - Configurable priority sorting ascending per D-23
 * - Mutable context enrichment per D-24
 */
export class AdapterRegistry {
  private adapters: Adapter[] = [];
  private sharedContext: Map<string, unknown> = new Map();

  /**
   * Register adapters - explicit array per D-22
   */
  register(adapters: Adapter[]): void {
    this.adapters = [...adapters].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add a single adapter
   */
  add(adapter: Adapter): void {
    this.adapters.push(adapter);
    this.adapters.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove an adapter by name
   */
  remove(name: string): boolean {
    const index = this.adapters.findIndex(a => a.name === name);
    if (index >= 0) {
      this.adapters.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered adapters
   */
  getAdapters(): Adapter[] {
    return [...this.adapters];
  }

  /**
   * Get adapter by name
   */
  getAdapter(name: string): Adapter | undefined {
    return this.adapters.find(a => a.name === name);
  }

  /**
   * Run all adapters in priority order per D-23
   * Each adapter wrapped in try/catch for fail-open per D-12
   * Context is mutable and enriched per D-24
   */
  async run(context: PageContext): Promise<AdapterResult> {
    const allEvents: AdapterResult['events'] = [];
    const allErrors: AdapterResult['errors'] = [];

    // Create enriched context that adapters can mutate
    const enrichedContext: PageContext = {
      ...context,
      metadata: {
        ...context.metadata,
        registry: this,
        sharedContext: this.sharedContext,
      },
    };

    for (const adapter of this.adapters) {
      try {
        const result = await adapter.extract(enrichedContext);
        allEvents.push(...result.events);
        allErrors.push(...result.errors);
      } catch (err) {
        // Fail-open: log error but continue with other adapters per D-12
        allErrors.push({
          adapter: adapter.name,
          message: `Adapter threw unhandled error: ${err instanceof Error ? err.message : String(err)}`,
          code: 'ADAPTER_UNHANDLED_ERROR',
          severity: ErrorSeverity.Error,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { events: allEvents, errors: allErrors };
  }

  /**
   * Set shared context value (mutable enrichment per D-24)
   */
  setSharedContext(key: string, value: unknown): void {
    this.sharedContext.set(key, value);
  }

  /**
   * Get shared context value
   */
  getSharedContext(key: string): unknown {
    return this.sharedContext.get(key);
  }

  /**
   * Clear shared context
   */
  clearSharedContext(): void {
    this.sharedContext.clear();
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters = [];
    this.clearSharedContext();
  }
}