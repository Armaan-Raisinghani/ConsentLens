/**
 * Adapter interface and types - per D-10, D-11, D-12
 */

import type { ConsentEvent } from '../ir/consent-event.js';
import type { AdapterError, AdapterResult, PageContext, AdapterFactory } from '../shared/errors.js';
import { ErrorSeverity } from '../shared/errors.js';

export type { AdapterError, AdapterResult, PageContext, AdapterFactory };

/**
 * Adapter interface - per D-11, D-12
 * Method signature: async extract(context): Promise<AdapterResult>
 * Error handling: Fail-open + error collection
 */
export interface Adapter {
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
export abstract class BaseAdapter implements Adapter {
  public abstract readonly name: string;
  public abstract readonly priority: number;

  public abstract extract(context: PageContext): Promise<AdapterResult>;

  /**
   * Creates a success result with events
   */
  protected createResult(events: ConsentEvent[] = [], errors: AdapterError[] = []): AdapterResult {
    return { events, errors };
  }

  /**
   * Creates an adapter error
   */
  protected createError(
    message: string,
    code: string,
    severity: ErrorSeverity = ErrorSeverity.Error,
    context?: Record<string, unknown>
  ): AdapterError {
    return {
      adapter: this.name,
      message,
      code,
      severity,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Safe extraction wrapper - fail-open per D-12
   */
  protected async safeExtract<T>(
    fn: () => Promise<T>,
    errorCode: string,
    errorMessage: string
  ): Promise<{ data: T | null; error: AdapterError | null }> {
    try {
      const data = await fn();
      return { data, error: null };
    } catch (err) {
      const error = this.createError(
        `${errorMessage}: ${err instanceof Error ? err.message : String(err)}`,
        errorCode,
        ErrorSeverity.Error
      );
      return { data: null, error };
    }
  }
}