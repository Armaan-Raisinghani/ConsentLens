/**
 * Type validation tests for AI types
 * Ensures all interfaces compile and EvidenceCitation helpers produce valid objects
 */

import { describe, it, expect } from 'vitest';
import type {
  PurposeInference,
  PermissionInterpretation,
  DataPractice,
  PolicyExtraction,
  TermsClause,
  TermsExtraction,
  MismatchReasoning,
  OpenJevClassification,
  AIBackend,
  PageContext,
  AIAnalysisResult,
} from '../../src/ai/types.js';
import type { EvidenceCitation } from '../../src/ai/evidence.js';
import {
  createDomEvidence,
  createPolicyEvidence,
  createTermsEvidence,
  createOAuthEvidence,
  createCookieEvidence,
  createOpenJevEvidence,
  combineEvidence,
} from '../../src/ai/evidence.js';
import type { Capability } from '../../src/ir/capability.js';

describe('AI Types - Type Validation', () => {
  // Helper to create a sample capability
  const sampleCapability: Capability = {
    type: 'oauth',
    provider: 'google',
    scope: ['drive.read'],
  };

  it('PurposeInference compiles with all fields', () => {
    const purpose: PurposeInference = {
      inferred: 'productivity',
      stated: 'Document editing and collaboration',
      userIntent: 'Create a new document',
      confidence: 0.85,
      evidence: [],
    };
    expect(purpose.inferred).toBe('productivity');
    expect(purpose.confidence).toBe(0.85);
  });

  it('PermissionInterpretation compiles with all fields', () => {
    const interpretation: PermissionInterpretation = {
      capability: sampleCapability,
      description: 'Access to your Google Drive files',
      sensitivity: 'high',
      evidence: [],
    };
    expect(interpretation.description).toBe('Access to your Google Drive files');
    expect(interpretation.sensitivity).toBe('high');
  });

  it('DataPractice compiles with all fields', () => {
    const practice: DataPractice = {
      category: 'collection',
      description: 'We collect your email for account creation',
      evidence: [],
    };
    expect(practice.category).toBe('collection');
  });

  it('PolicyExtraction compiles with all fields', () => {
    const extraction: PolicyExtraction = {
      practices: [],
      purposes: ['service improvement'],
      thirdParties: ['analytics providers'],
      aiTraining: true,
      retention: '2 years',
      evidence: [],
    };
    expect(extraction.aiTraining).toBe(true);
    expect(extraction.retention).toBe('2 years');
  });

  it('TermsClause compiles with all fields', () => {
    const clause: TermsClause = {
      type: 'arbitration',
      text: 'All disputes resolved by binding arbitration',
      severity: 'high',
      evidence: [],
    };
    expect(clause.type).toBe('arbitration');
    expect(clause.severity).toBe('high');
  });

  it('TermsExtraction compiles with all fields', () => {
    const extraction: TermsExtraction = {
      clauses: [],
      evidence: [],
    };
    expect(extraction.clauses).toEqual([]);
  });

  it('MismatchReasoning compiles with all fields', () => {
    const reasoning: MismatchReasoning = {
      capability: sampleCapability,
      relevance: 'relevant',
      reasoning: 'Drive access is needed for document storage',
      evidence: [],
    };
    expect(reasoning.relevance).toBe('relevant');
  });

  it('OpenJevClassification compiles with all 4 classification fields', () => {
    const classification: OpenJevClassification = {
      decision: 'allow',
      decisionConfidence: 0.9,
      excessiveness: 'appropriate',
      excessivenessConfidence: 0.8,
      purposeMatch: 'relevant',
      purposeMatchConfidence: 0.85,
      sensitivity: 'high',
      sensitivityScore: 2,
      evidence: [],
    };
    expect(classification.decision).toBe('allow');
    expect(classification.excessiveness).toBe('appropriate');
    expect(classification.purposeMatch).toBe('relevant');
    expect(classification.sensitivity).toBe('high');
    expect(classification.sensitivityScore).toBe(2);
  });

  it('AIBackend interface compiles', () => {
    // Just verify the interface shape - can't instantiate interface directly
    const backend: AIBackend = {
      async classify() { return []; },
      async extract() { return { practices: [], purposes: [], thirdParties: [], aiTraining: false, evidence: [] }; },
      async reason() { return []; },
    };
    expect(backend).toBeDefined();
  });

  it('PageContext compiles', () => {
    const context: PageContext = {
      url: 'https://example.com',
      origin: 'https://example.com',
      title: 'Test Page',
      metaTags: { description: 'A test page' },
      headings: ['Welcome'],
      mainContent: 'Page content here',
    };
    expect(context.url).toBe('https://example.com');
  });

  it('AIAnalysisResult compiles with all 7 fields', () => {
    const result: AIAnalysisResult = {
      purpose: { inferred: 'productivity', confidence: 0.8, evidence: [] },
      permissions: [],
      policy: null,
      terms: null,
      mismatches: [],
      openjevClassifications: [],
      summary: 'Page requests Drive access for productivity',
      mode: 'openjev',
    };
    expect(result.mode).toBe('openjev');
    expect(result.summary).toBeTruthy();
  });

  it('EvidenceCitation compiles for all source types', () => {
    const domEvidence: EvidenceCitation = { source: 'dom', selector: 'h1', confidence: 0.9 };
    const policyEvidence: EvidenceCitation = { source: 'policy', url: 'https://example.com/policy', section: 'Data Collection', confidence: 0.8 };
    const termsEvidence: EvidenceCitation = { source: 'terms', url: 'https://example.com/terms', section: 'Arbitration', confidence: 0.7 };
    const oauthEvidence: EvidenceCitation = { source: 'oauth-url', url: 'https://accounts.google.com', scope: 'drive.read', confidence: 0.9 };
    const cookieEvidence: EvidenceCitation = { source: 'cookie', cookie: { name: '_ga', domain: 'example.com' }, confidence: 0.6 };
    const openjevEvidence: EvidenceCitation = { source: 'openjev', confidence: 0.85 };

    expect(domEvidence.source).toBe('dom');
    expect(policyEvidence.source).toBe('policy');
    expect(termsEvidence.source).toBe('terms');
    expect(oauthEvidence.source).toBe('oauth-url');
    expect(cookieEvidence.source).toBe('cookie');
    expect(openjevEvidence.source).toBe('openjev');
  });
});

describe('EvidenceCitation Helpers', () => {
  it('createDomEvidence produces valid citation', () => {
    const evidence = createDomEvidence('h1', 'Welcome', 0.9);
    expect(evidence.source).toBe('dom');
    expect(evidence.selector).toBe('h1');
    expect(evidence.textSpan).toEqual({ start: 0, end: 7 });
    expect(evidence.confidence).toBe(0.9);
  });

  it('createPolicyEvidence produces valid citation', () => {
    const evidence = createPolicyEvidence('https://example.com/policy', 'Data Collection', 0.8);
    expect(evidence.source).toBe('policy');
    expect(evidence.url).toBe('https://example.com/policy');
    expect(evidence.section).toBe('Data Collection');
    expect(evidence.confidence).toBe(0.8);
  });

  it('createTermsEvidence produces valid citation', () => {
    const evidence = createTermsEvidence('https://example.com/terms', 'Arbitration', 0.7);
    expect(evidence.source).toBe('terms');
    expect(evidence.url).toBe('https://example.com/terms');
    expect(evidence.section).toBe('Arbitration');
    expect(evidence.confidence).toBe(0.7);
  });

  it('createOAuthEvidence produces valid citation', () => {
    const evidence = createOAuthEvidence('https://accounts.google.com', 'drive.read', 0.9);
    expect(evidence.source).toBe('oauth-url');
    expect(evidence.url).toBe('https://accounts.google.com');
    expect(evidence.scope).toBe('drive.read');
    expect(evidence.confidence).toBe(0.9);
  });

  it('createCookieEvidence produces valid citation', () => {
    const evidence = createCookieEvidence('_ga', 'example.com', 0.6);
    expect(evidence.source).toBe('cookie');
    expect(evidence.cookie).toEqual({ name: '_ga', domain: 'example.com' });
    expect(evidence.confidence).toBe(0.6);
  });

  it('createOpenJevEvidence produces valid citation', () => {
    const evidence = createOpenJevEvidence(0.85);
    expect(evidence.source).toBe('openjev');
    expect(evidence.confidence).toBe(0.85);
  });

  it('createOpenJevEvidence clamps confidence to 0-1', () => {
    const high = createOpenJevEvidence(1.5);
    const low = createOpenJevEvidence(-0.5);
    expect(high.confidence).toBe(1);
    expect(low.confidence).toBe(0);
  });

  it('combineEvidence filters falsy values', () => {
    const evidence = combineEvidence(
      createDomEvidence('h1', 'Title', 0.9),
      null as any,
      undefined as any,
      createPolicyEvidence('https://example.com', 'Section', 0.8)
    );
    expect(evidence.length).toBe(2);
  });
});