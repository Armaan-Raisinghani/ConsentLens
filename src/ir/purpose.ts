/**
 * Purpose interface - per IR-03
 */

/**
 * Purpose interface representing the inferred/stated purpose of a consent request
 */
export interface Purpose {
  /** Inferred purpose from AI analysis */
  inferred?: string;
  /** Stated purpose from the consent UI/text */
  stated?: string;
  /** User's apparent intent */
  userIntent?: string;
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * Creates a purpose object
 */
export function createPurpose(params: {
  inferred?: string;
  stated?: string;
  userIntent?: string;
  confidence: number;
}): Purpose {
  return {
    inferred: params.inferred,
    stated: params.stated,
    userIntent: params.userIntent,
    confidence: Math.max(0, Math.min(1, params.confidence)),
  };
}

/**
 * Default empty purpose
 */
export const emptyPurpose: Purpose = {
  confidence: 0,
};