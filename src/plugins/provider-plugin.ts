/**
 * Provider Plugin Interface - per PLUGIN-06
 * Allows custom OAuth provider registration
 */

import type { PageContext } from '../shared/errors.js';

/**
 * Provider configuration for OAuth providers
 */
export interface ProviderConfig {
  /** Unique provider ID (e.g., 'google', 'github', 'custom-provider') */
  id: string;
  /** Display name */
  name: string;
  /** OAuth authorization URL */
  authUrl: string;
  /** Scope mapping: category -> scope array */
  scopeMap: Record<string, string[]>;
  /** Icon (SVG data URI, URL, or emoji) */
  icon: string;
  /** Brand color (hex) */
  color: string;
  /** Detection patterns for this provider */
  detectionPatterns?: {
    /** URL patterns to detect this provider */
    urlPatterns?: RegExp[];
    /** Button text patterns */
    buttonTextPatterns?: RegExp[];
    /** Data attribute patterns */
    dataAttributes?: Record<string, string>;
  };
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Provider detection result
 */
export interface ProviderDetection {
  provider: ProviderConfig;
  confidence: number;
  matchedElement?: Element;
  matchedPattern?: string;
}

/**
 * Global provider registry
 */
const providerRegistry = new Map<string, ProviderConfig>();

/**
 * Registers an OAuth provider
 * 
 * @param id - Unique provider ID
 * @param config - Provider configuration
 * 
 * @example
 * ```typescript
 * registerProvider('gitlab', {
 *   id: 'gitlab',
 *   name: 'GitLab',
 *   authUrl: 'https://gitlab.com/oauth/authorize',
 *   scopeMap: {
 *     read: ['read_user', 'read_repository'],
 *     write: ['write_repository', 'api'],
 *     admin: ['admin_mode', 'sudo'],
 *   },
 *   icon: 'data:image/svg+xml,...', // or '🦊'
 *   color: '#FC6D26',
 *   detectionPatterns: {
 *     urlPatterns: [/gitlab\.com\/oauth/],
 *     buttonTextPatterns: [/sign in with gitlab/i, /continue with gitlab/i],
 *   },
 * });
 * ```
 */
export function registerProvider(id: string, config: ProviderConfig): void {
  if (providerRegistry.has(id)) {
    throw new Error(`Provider '${id}' already registered`);
  }
  // Validate required fields
  if (!config.name || !config.authUrl || !config.scopeMap || !config.icon || !config.color) {
    throw new Error(`Provider '${id}' missing required fields: name, authUrl, scopeMap, icon, color`);
  }
  providerRegistry.set(id, config);
}

/**
 * Unregisters a provider by ID
 */
export function unregisterProvider(id: string): boolean {
  return providerRegistry.delete(id);
}

/**
 * Gets a provider by ID
 */
export function getProvider(id: string): ProviderConfig | undefined {
  return providerRegistry.get(id);
}

/**
 * Gets all registered providers
 */
export function getAllProviders(): ProviderConfig[] {
  return [...providerRegistry.values()];
}

/**
 * Clears all providers
 */
export function clearProviders(): void {
  providerRegistry.clear();
}

/**
 * Finds a provider by authorization URL
 * Used by OAuthAdapter to detect providers from OAuth URLs
 */
export function findProviderByAuthUrl(authUrl: string): ProviderConfig | undefined {
  for (const provider of providerRegistry.values()) {
    try {
      const providerUrl = new URL(provider.authUrl);
      const checkUrl = new URL(authUrl);
      if (providerUrl.hostname === checkUrl.hostname && 
          providerUrl.pathname === checkUrl.pathname) {
        return provider;
      }
    } catch {
      // Invalid URLs, skip
    }
  }
  return undefined;
}

/**
 * Detects providers from page context
 * Used by OAuthAdapter for custom provider detection
 */
export function detectProviders(context: PageContext): ProviderDetection[] {
  const detections: ProviderDetection[] = [];
  const { document, url } = context;
  
  // Check if document has querySelectorAll (JSDOM/browser environment)
  const hasQuerySelector = typeof document?.querySelectorAll === 'function';
  
  for (const provider of providerRegistry.values()) {
    if (!provider.detectionPatterns) continue;
    
    let maxConfidence = 0;
    let matchedElement: Element | undefined;
    let matchedPattern: string | undefined;
    
    // Check URL patterns
    if (provider.detectionPatterns.urlPatterns) {
      for (const pattern of provider.detectionPatterns.urlPatterns) {
        if (pattern.test(url)) {
          maxConfidence = Math.max(maxConfidence, 0.9);
          matchedPattern = pattern.source;
        }
      }
    }
    
    // Check button text patterns (only if document has querySelectorAll)
    if (hasQuerySelector && provider.detectionPatterns.buttonTextPatterns) {
      const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"], input[type="submit"]');
      for (const button of buttons) {
        const text = (button.textContent || '').trim().toLowerCase();
        for (const pattern of provider.detectionPatterns.buttonTextPatterns) {
          if (pattern.test(text)) {
            maxConfidence = Math.max(maxConfidence, 0.85);
            matchedElement = button;
            matchedPattern = pattern.source;
          }
        }
      }
    }
    
    // Check data attributes (only if document has querySelectorAll)
    if (hasQuerySelector && provider.detectionPatterns.dataAttributes) {
      for (const [attr, value] of Object.entries(provider.detectionPatterns.dataAttributes)) {
        const elements = document.querySelectorAll(`[${attr}="${value}"]`);
        if (elements.length > 0) {
          maxConfidence = Math.max(maxConfidence, 0.8);
          matchedElement = elements[0];
          matchedPattern = `${attr}=${value}`;
        }
      }
    }
    
    if (maxConfidence > 0) {
      detections.push({
        provider,
        confidence: maxConfidence,
        matchedElement,
        matchedPattern,
      });
    }
  }
  
  // Sort by confidence descending
  return detections.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Gets scopes for a provider by category
 */
export function getProviderScopes(providerId: string, category: string): string[] {
  const provider = providerRegistry.get(providerId);
  return provider?.scopeMap[category] ?? [];
}

/**
 * Gets all scopes for a provider (flattened)
 */
export function getAllProviderScopes(providerId: string): string[] {
  const provider = providerRegistry.get(providerId);
  if (!provider) return [];
  return Object.values(provider.scopeMap).flat();
}

/**
 * ProviderRegistry class - wraps the global provider registry
 * Provides a class-based interface for testing and advanced usage
 */
export class ProviderRegistry {
  private registry = new Map<string, ProviderConfig>();

  /**
   * Register multiple providers at once
   */
  register(providers: ProviderConfig[]): void {
    for (const provider of providers) {
      this.add(provider);
    }
  }

  /**
   * Add a single provider
   */
  add(provider: ProviderConfig): void {
    if (this.registry.has(provider.id)) {
      throw new Error(`Provider '${provider.id}' already registered`);
    }
    // Validate required fields
    if (!provider.name || !provider.authUrl || !provider.scopeMap || !provider.icon || !provider.color) {
      throw new Error(`Provider '${provider.id}' missing required fields: name, authUrl, scopeMap, icon, color`);
    }
    this.registry.set(provider.id, provider);
  }

  /**
   * Remove a provider by ID
   */
  remove(id: string): boolean {
    return this.registry.delete(id);
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): ProviderConfig | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): ProviderConfig[] {
    return [...this.registry.values()];
  }

  /**
   * Find a provider by authorization URL
   */
  findByAuthUrl(authUrl: string): ProviderConfig | undefined {
    for (const provider of this.registry.values()) {
      try {
        const providerUrl = new URL(provider.authUrl);
        const checkUrl = new URL(authUrl);
        if (providerUrl.hostname === checkUrl.hostname && 
            providerUrl.pathname === checkUrl.pathname) {
          return provider;
        }
      } catch {
        // Invalid URLs, skip
      }
    }
    return undefined;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.registry.clear();
  }
}