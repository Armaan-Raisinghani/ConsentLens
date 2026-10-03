import { b as ConsentEvent, E as ErrorSeverity } from '../index-CEZZYamR.cjs';
export { c as ConsentType, f as EvidenceSource, g as ExtractionMethod, G as GrantStatus } from '../index-CEZZYamR.cjs';

/**
 * Error types for ConsentLens core
 */

/**
 * Adapter error interface
 */
interface AdapterError {
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
declare function createAdapterError(adapter: string, message: string, code: string, severity?: ErrorSeverity, context?: Record<string, unknown>): AdapterError;
/**
 * Adapter result type
 */
type AdapterResult = {
    events: ConsentEvent[];
    errors: AdapterError[];
};
/**
 * Page context interface - provides raw Document access per D-10
 */
interface PageContext {
    document: Document;
    url: string;
    origin: string;
    metadata?: Record<string, unknown>;
}
/**
 * Adapter factory type for plugin registration
 */
type AdapterFactory = (context: PageContext) => Promise<AdapterResult>;
/**
 * Adapter interface - per D-11, D-12
 */
interface Adapter {
    name: string;
    priority: number;
    extract(context: PageContext): Promise<AdapterResult>;
}

export { type Adapter, type AdapterError, type AdapterFactory, type AdapterResult, ErrorSeverity, type PageContext, createAdapterError };
