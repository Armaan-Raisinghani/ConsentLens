/**
 * Evidence interface - rich references with confidence per D-09
 */

import { EvidenceSource, ExtractionMethod } from '../shared/types.js';

/**
 * Evidence interface for consent event extraction
 */
export interface Evidence {
  /** Source of the evidence */
  source: EvidenceSource;
  /** CSS selector used to locate the element */
  selector?: string;
  /** URL where evidence was found */
  url?: string;
  /** Text content of the evidence */
  text?: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Method used to extract this evidence */
  extractionMethod: ExtractionMethod;
  /** Timestamp when evidence was extracted */
  extractedAt: string;
}

/**
 * Creates an evidence object
 */
export function createEvidence(params: {
  source: EvidenceSource;
  selector?: string;
  url?: string;
  text?: string;
  confidence: number;
  extractionMethod: ExtractionMethod;
}): Evidence {
  return {
    source: params.source,
    selector: params.selector,
    url: params.url,
    text: params.text,
    confidence: Math.max(0, Math.min(1, params.confidence)),
    extractionMethod: params.extractionMethod,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Creates DOM-based evidence
 */
export function createDOMEvidence(params: {
  selector: string;
  text: string;
  confidence: number;
  extractionMethod: ExtractionMethod;
  url?: string;
}): Evidence {
  return createEvidence({
    source: EvidenceSource.DOM,
    selector: params.selector,
    url: params.url,
    text: params.text,
    confidence: params.confidence,
    extractionMethod: params.extractionMethod,
  });
}

/**
 * Creates heuristic evidence
 */
export function createHeuristicEvidence(params: {
  text: string;
  confidence: number;
  url?: string;
}): Evidence {
  return createEvidence({
    source: EvidenceSource.Heuristic,
    url: params.url,
    text: params.text,
    confidence: params.confidence,
    extractionMethod: ExtractionMethod.Heuristic,
  });
}