/**
 * Shared type definitions for ConsentLens core
 */

/**
 * Consent type enumeration
 */
export enum ConsentType {
  OAuth = 'oauth',
  BrowserPermission = 'browser-permission',
  Cookie = 'cookie',
  Policy = 'policy',
  Terms = 'terms',
}

/**
 * Grant status enumeration
 */
export enum GrantStatus {
  Pending = 'pending',
  Granted = 'granted',
  Denied = 'denied',
  Revoked = 'revoked',
  Unknown = 'unknown',
}

/**
 * Evidence source enumeration
 */
export enum EvidenceSource {
  DOM = 'dom',
  Network = 'network',
  Storage = 'storage',
  Heuristic = 'heuristic',
  User = 'user',
}

/**
 * Extraction method enumeration
 */
export enum ExtractionMethod {
  TextContent = 'text-content',
  Attribute = 'attribute',
  Regex = 'regex',
  MetaTag = 'meta-tag',
  URLParam = 'url-param',
  DataAttribute = 'data-attribute',
  Heuristic = 'heuristic',
}

/**
 * Severity levels for adapter errors
 */
export enum ErrorSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical',
}