/**
 * Error types for ConsentLens core
 */

import { ErrorSeverity } from './types.js';

/**
 * Adapter error interface
 */
export interface AdapterError {
  adapter: string;
  message: string;
  code: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Creates an adapter error
 */
export function createAdapterError(
  adapter: string,
  message: string,
  code: string,
  severity: ErrorSeverity = ErrorSeverity.Error,
  context?: Record<string, unknown>
): AdapterError {
  return {
    adapter,
    message,
    code,
    severity,
    context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Adapter result type
 */
export import { ConsentEvent } from '../ir/consent-event.js';
export type AdapterResult = {
  events: ConsentEvent[];
  errors: AdapterError[];
};

/**
 * Page context interface - provides raw Document access per D-10
 */
export interface PageContext {
  document: Document;
  url: string;
  origin: string;
  metadata?: Record<string, unknown>;
}

/**
 * Adapter factory type for plugin registration
 */
export type AdapterFactory = (context: PageContext) => Promise<AdapterResult>;

/**
 * Adapter interface - per D-11, D-12
 */
export interface Adapter {
  name: string;
  priority: number;
  extract(context: PageContext): Promise<AdapterResult>;
}