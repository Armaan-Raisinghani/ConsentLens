/**
 * PermissionInterpretationEngine - converts capabilities to human descriptions with sensitivity ratings
 * Implements AI-02: Permission interpretation with evidence
 */

import { OpenJevClient } from './openjev-client.js';
import type { Capability, PermissionInterpretation, EvidenceCitation } from './types.js';
import { FallbackHeuristics } from './fallback-heuristics.js';
import {
  createOAuthEvidence,
  createCookieEvidence,
  createOpenJevEvidence,
  combineEvidence,
} from './evidence.js';
import { isOAuthCapability, isBrowserPermissionCapability, isCookieCapability, isPolicyCapability, isTermsCapability } from '../ir/capability.js';

/**
 * PermissionInterpretationEngine class for interpreting capabilities
 */
export class PermissionInterpretationEngine {
  private readonly openjevClient: OpenJevClient | null;
  private readonly fallback: typeof FallbackHeuristics;

  constructor(openjevClient?: OpenJevClient) {
    this.openjevClient = openjevClient ?? null;
    this.fallback = FallbackHeuristics;
  }

  /**
   * Interprets a capability into human-readable description with sensitivity
   * @param capability - Capability from Phase 1 taxonomy
   * @returns Promise<PermissionInterpretation> with description, sensitivity, and evidence
   */
  async interpret(capability: Capability): Promise<PermissionInterpretation> {
    // Try OpenJev first for sensitivity scoring if available
    if (this.openjevClient) {
      try {
        return await this.interpretWithOpenJev(capability);
      } catch (error) {
        console.warn('OpenJev permission interpretation failed, falling back to heuristics:', error);
      }
    }

    // Fallback to local heuristics
    return this.fallback.interpretPermission(capability);
  }

  /**
   * Interprets permission using OpenJevClient for sensitivity scoring
   */
  private async interpretWithOpenJev(capability: Capability): Promise<PermissionInterpretation> {
    // Build context for OpenJev
    const context = this.buildContext(capability);

    // Get base interpretation from fallback (description generation)
    const baseInterpretation = this.fallback.interpretPermission(capability);

    // Use OpenJev for sensitivity scoring
    const question = {
      type: 'score' as const,
      instructions: `Rate the sensitivity of this permission (0-2). ${context}`,
      criteria: [
        'Low: Anonymous analytics, non-identifying preferences',
        'Medium: Account access, contact info, non-sensitive files',
        'High: Precise location, camera/mic, financial data, private messages',
      ],
    };

    const request = {
      model: 'openjev-latest' as const,
      state: context,
      questions: { sensitivity: question },
    };

    const response = await this.openjevClient['callOpenJev'](request);
    const answer = response.answers['sensitivity'] as { type: 'score'; score: number; confidence: number };

    if (!answer || answer.type !== 'score') {
      throw new Error('Invalid OpenJev response for sensitivity scoring');
    }

    const sensitivityScore = answer.score as 0 | 1 | 2;
    const sensitivity = sensitivityScore === 0 ? 'low' : sensitivityScore === 1 ? 'medium' : 'high';
    const confidence = answer.confidence;

    // Build evidence
    const evidence = this.buildEvidence(capability, baseInterpretation.description, confidence);

    return {
      capability,
      description: baseInterpretation.description,
      sensitivity,
      confidence: Math.max(0, Math.min(1, confidence)),
      evidence,
    };
  }

  /**
   * Builds context string for OpenJev from capability
   */
  private buildContext(capability: Capability): string {
    const parts: string[] = [];

    if (isOAuthCapability(capability)) {
      parts.push(`OAuth Provider: ${capability.provider}`);
      parts.push(`Scopes: ${capability.scope.join(', ')}`);
    } else if (isBrowserPermissionCapability(capability)) {
      parts.push(`Browser Permission: ${capability.permission}`);
    } else if (isCookieCapability(capability)) {
      parts.push(`Cookie Category: ${capability.category}`);
      if (capability.name) parts.push(`Cookie Name: ${capability.name}`);
      if (capability.domain) parts.push(`Cookie Domain: ${capability.domain}`);
    } else if (isPolicyCapability(capability)) {
      parts.push(`Policy Practice: ${capability.practice}`);
    } else if (isTermsCapability(capability)) {
      parts.push(`Terms Clause: ${capability.clause}`);
    }

    return parts.join('; ');
  }

  /**
   * Builds evidence citations based on capability type
   */
  private buildEvidence(capability: Capability, description: string, confidence: number): EvidenceCitation[] {
    const citations: EvidenceCitation[] = [];

    if (isOAuthCapability(capability)) {
      // OAuth URL with scopes
      const oauthUrl = this.getOAuthUrl(capability.provider);
      citations.push(createOAuthEvidence(oauthUrl, capability.scope.join(', '), 0.85));
    } else if (isBrowserPermissionCapability(capability)) {
      // Browser permission evidence
      citations.push(createOpenJevEvidence(confidence));
    } else if (isCookieCapability(capability)) {
      // Cookie evidence
      if (capability.name && capability.domain) {
        citations.push(createCookieEvidence(capability.name, capability.domain, 0.8));
      } else {
        citations.push(createOpenJevEvidence(confidence));
      }
    } else if (isPolicyCapability(capability)) {
      citations.push(createOpenJevEvidence(confidence));
    } else if (isTermsCapability(capability)) {
      citations.push(createOpenJevEvidence(confidence));
    }

    // Always add OpenJev evidence for the sensitivity scoring
    citations.push(createOpenJevEvidence(confidence));

    return combineEvidence(...citations);
  }

  /**
   * Gets OAuth authorization URL for a provider
   */
  private getOAuthUrl(provider: string): string {
    const urls: Record<string, string> = {
      google: 'https://accounts.google.com/o/oauth2/auth',
      github: 'https://github.com/login/oauth/authorize',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
      apple: 'https://appleid.apple.com/auth/authorize',
    };
    return urls[provider.toLowerCase()] || `https://${provider.toLowerCase()}.com/oauth/authorize`;
  }

  /**
   * Gets the OpenJev client instance (for testing/inspection)
   */
  getOpenJevClient(): OpenJevClient | null {
    return this.openjevClient;
  }

  /**
   * Checks if using OpenJev or fallback mode
   */
  getMode(): 'openjev' | 'fallback' {
    return this.openjevClient ? 'openjev' : 'fallback';
  }
}