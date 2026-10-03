'use strict';

// src/plugins/adapter-plugin.ts
var globalRegistry = null;
function setPluginRegistry(registry) {
  globalRegistry = registry;
}
function getPluginRegistry() {
  return globalRegistry;
}
function registerAdapter(type, factory) {
  if (!globalRegistry) {
    throw new Error("Plugin registry not initialized. Call setPluginRegistry() first.");
  }
  const adapter = {
    name: type,
    priority: 100,
    // Default priority for plugins (runs after core adapters)
    async extract(context) {
      return factory(context);
    }
  };
  globalRegistry.add(adapter);
}
function registerAdapterInstance(adapter) {
  if (!globalRegistry) {
    throw new Error("Plugin registry not initialized. Call setPluginRegistry() first.");
  }
  globalRegistry.add(adapter);
}
function unregisterAdapter(type) {
  if (!globalRegistry) {
    return false;
  }
  return globalRegistry.remove(type);
}
async function registerPlugin(plugin) {
  if (!globalRegistry) {
    throw new Error("Plugin registry not initialized. Call setPluginRegistry() first.");
  }
  await plugin.initialize(globalRegistry);
}

exports.getPluginRegistry = getPluginRegistry;
exports.registerAdapter = registerAdapter;
exports.registerAdapterInstance = registerAdapterInstance;
exports.registerPlugin = registerPlugin;
exports.setPluginRegistry = setPluginRegistry;
exports.unregisterAdapter = unregisterAdapter;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map