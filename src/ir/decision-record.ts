/**
 * DecisionRecord interface - per IR-05
 */

/**
 * Decision record for consent classification
 */
export interface DecisionRecord {
  /** Matched rule identifier */
  matchedRule?: string;
  /** AI classification result */
  aiClassification?: {
    decision: 'allow' | 'ask' | 'deny';
    excessiveness: 'none' | 'moderate' | 'excessive';
    purposeMatch: boolean;
    reasoning: string;
  };
  /** Confidence score 0-1 */
  confidence: number;
  /** Provenance information */
  provenance: {
    engine: string;
    version: string;
    timestamp: string;
  };
}

/**
 * Creates a decision record
 */
export function createDecisionRecord(params: {
  matchedRule?: string;
  aiClassification?: DecisionRecord['aiClassification'];
  confidence: number;
  engine: string;
  version: string;
}): DecisionRecord {
  return {
    matchedRule: params.matchedRule,
    aiClassification: params.aiClassification,
    confidence: Math.max(0, Math.min(1, params.confidence)),
    provenance: {
      engine: params.engine,
      version: params.version,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Default empty decision record
 */
export const emptyDecisionRecord: DecisionRecord = {
  confidence: 0,
  provenance: {
    engine: 'consentlens',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  },
};