import { a as AdapterRegistry, A as Adapter } from '../registry-CpPLxLm3.cjs';
import { AdapterFactory } from '../shared/index.cjs';
import '../index-CEZZYamR.cjs';

/**
 * Adapter Plugin Interface - per PLUGIN-01
 * Allows third-party adapters to register via registerAdapter(type, factory)
 */

/**
 * Sets the global registry instance
 * Called during application initialization
 */
declare function setPluginRegistry(registry: AdapterRegistry): void;
/**
 * Gets the global registry instance
 */
declare function getPluginRegistry(): AdapterRegistry | null;
/**
 * Registers an adapter factory for a given type
 * This is the main plugin interface per PLUGIN-01
 *
 * @param type - Adapter type identifier (e.g., 'oauth', 'cookie', 'browser-permission')
 * @param factory - Async factory function that creates an Adapter instance
 */
declare function registerAdapter(type: string, factory: AdapterFactory): void;
/**
 * Registers a full Adapter instance directly
 * Alternative to registerAdapter for more control
 */
declare function registerAdapterInstance(adapter: Adapter): void;
/**
 * Unregisters an adapter by type
 */
declare function unregisterAdapter(type: string): boolean;
/**
 * Plugin initialization function signature
 * Plugins can export this to auto-register on import
 */
interface AdapterPlugin {
    name: string;
    version: string;
    initialize(registry: AdapterRegistry): void | Promise<void>;
}
/**
 * Registers a full plugin
 */
declare function registerPlugin(plugin: AdapterPlugin): Promise<void>;

export { type AdapterPlugin, getPluginRegistry, registerAdapter, registerAdapterInstance, registerPlugin, setPluginRegistry, unregisterAdapter };
