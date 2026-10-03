/**
 * Adapter Plugin Interface - per PLUGIN-01
 * Allows third-party adapters to register via registerAdapter(type, factory)
 */

import { Adapter, AdapterFactory, PageContext, AdapterResult } from '../adapters/adapter.js';
import { AdapterRegistry } from '../adapters/registry.js';

// Global registry instance for plugin registration
let globalRegistry: AdapterRegistry | null = null;

/**
 * Sets the global registry instance
 * Called during application initialization
 */
export function setPluginRegistry(registry: AdapterRegistry): void {
  globalRegistry = registry;
}

/**
 * Gets the global registry instance
 */
export function getPluginRegistry(): AdapterRegistry | null {
  return globalRegistry;
}

/**
 * Registers an adapter factory for a given type
 * This is the main plugin interface per PLUGIN-01
 * 
 * @param type - Adapter type identifier (e.g., 'oauth', 'cookie', 'browser-permission')
 * @param factory - Async factory function that creates an Adapter instance
 */
export function registerAdapter(type: string, factory: AdapterFactory): void {
  if (!globalRegistry) {
    throw new Error('Plugin registry not initialized. Call setPluginRegistry() first.');
  }

  // Create adapter instance from factory
  // The factory receives a context and returns AdapterResult
  // We wrap it in an Adapter implementation
  const adapter: Adapter = {
    name: type,
    priority: 100, // Default priority for plugins (runs after core adapters)
    async extract(context: PageContext): Promise<AdapterResult> {
      return factory(context);
    },
  };

  globalRegistry.add(adapter);
}

/**
 * Registers a full Adapter instance directly
 * Alternative to registerAdapter for more control
 */
export function registerAdapterInstance(adapter: Adapter): void {
  if (!globalRegistry) {
    throw new Error('Plugin registry not initialized. Call setPluginRegistry() first.');
  }
  globalRegistry.add(adapter);
}

/**
 * Unregisters an adapter by type
 */
export function unregisterAdapter(type: string): boolean {
  if (!globalRegistry) {
    return false;
  }
  return globalRegistry.remove(type);
}

/**
 * Plugin initialization function signature
 * Plugins can export this to auto-register on import
 */
export interface AdapterPlugin {
  name: string;
  version: string;
  initialize(registry: AdapterRegistry): void | Promise<void>;
}

/**
 * Registers a full plugin
 */
export async function registerPlugin(plugin: AdapterPlugin): Promise<void> {
  if (!globalRegistry) {
    throw new Error('Plugin registry not initialized. Call setPluginRegistry() first.');
  }
  await plugin.initialize(globalRegistry);
}