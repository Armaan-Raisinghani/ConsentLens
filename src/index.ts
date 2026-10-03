/**
 * ConsentLens Core - Main entry point
 * Exports all public APIs for @consentlens/core
 */

// IR Types
export * from './ir/index.js';

// Adapters
export type { Adapter, BaseAdapter } from './adapters/index.js';
export { OAuthAdapter, AdapterRegistry } from './adapters/index.js';

// AI Semantic Layer
export * from './ai/index.js';

// Plugins
export * from './plugins/index.js';

// Shared
export * from './shared/index.js';