/**
 * OpenJev (Codiv API) request/response types
 * Matches Codiv API specification for System One classification
 */

import type { ConsentEvent } from '../ir/consent-event.js';

/**
 * Base question interface
 */
export interface BaseQuestion {
  type: string;
  instructions: string;
}

/**
 * NouL (Yes/No probability) question
 */
export interface NouQuestion extends BaseQuestion {
  type: 'noul';
}

/**
 * Choice question with criteria
 */
export interface ChoiceQuestion extends BaseQuestion {
  type: 'choice';
  /** Criteria mapping for choice options */
  criteria: Record<string, string>;
}

/**
 * Score question with criteria
 */
export interface ScoreQuestion extends BaseQuestion {
  type: 'score';
  /** Criteria descriptions for score levels */
  criteria: string[];
}

/**
 * Discriminated union of question types
 */
export type Question = NouQuestion | ChoiceQuestion | ScoreQuestion;

/**
 * Base answer interface
 */
export interface BaseAnswer {
  type: string;
}

/**
 * NouL answer with probability
 */
export interface NouAnswer extends BaseAnswer {
  type: 'noul';
  /** Probability of "yes" (0-1) */
  noul: number;
}

/**
 * Choice answer with selected option and probabilities
 */
export interface ChoiceAnswer extends BaseAnswer {
  type: 'choice';
  /** Selected choice */
  choice: string;
  /** Probabilities for each option */
  probabilities: Record<string, number>;
  /** Confidence in selection (0-1) */
  confidence: number;
}

/**
 * Score answer with numeric score
 */
export interface ScoreAnswer extends BaseAnswer {
  type: 'score';
  /** Numeric score */
  score: number;
  /** Legend mapping scores to labels */
  legend: Record<string, string>;
  /** Probabilities for each score level */
  probabilities: Record<string, number>;
  /** Confidence in score (0-1) */
  confidence: number;
}

/**
 * Discriminated union of answer types
 */
export type Answer = NouAnswer | ChoiceAnswer | ScoreAnswer;

/**
 * OpenJev request to Codiv API
 */
export interface OpenJevRequest {
  /** Model identifier */
  model: 'openjev-latest';
  /** State/context string */
  state: string;
  /** Questions keyed by identifier */
  questions: Record<string, Question>;
}

/**
 * OpenJev response from Codiv API
 */
export interface OpenJevResponse {
  /** Model used */
  model: string;
  /** Answers keyed by question identifier */
  answers: Record<string, Answer>;
  /** Token usage */
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Builds a NouL question for consent decision
 */
export function buildDecisionQuestion(
  event: ConsentEvent,
  context: string
): NouQuestion {
  return {
    type: 'noul',
    instructions: `Should this consent request be allowed? Context: ${context}. Capability: ${JSON.stringify(event.capability)}`,
  };
}

/**
 * Builds a choice question for excessiveness
 */
export function buildExcessivenessQuestion(
  event: ConsentEvent,
  context: string
): ChoiceQuestion {
  return {
    type: 'choice',
    instructions: `How excessive is this consent request? Context: ${context}. Capability: ${JSON.stringify(event.capability)}`,
    criteria: {
      excessive: 'Request asks for significantly more than needed',
      appropriate: 'Request matches the stated purpose reasonably',
      minimal: 'Request asks for the bare minimum needed',
    },
  };
}

/**
 * Builds a choice question for purpose match
 */
export function buildPurposeMatchQuestion(
  event: ConsentEvent,
  purpose: string,
  context: string
): ChoiceQuestion {
  return {
    type: 'choice',
    instructions: `How relevant is this capability to the page purpose? Purpose: ${purpose}. Context: ${context}. Capability: ${JSON.stringify(event.capability)}`,
    criteria: {
      relevant: 'Capability directly supports the stated purpose',
      unclear: 'Relationship between capability and purpose is ambiguous',
      unrelated: 'Capability has no clear connection to the purpose',
    },
  };
}

/**
 * Builds a score question for sensitivity
 */
export function buildSensitivityQuestion(
  event: ConsentEvent,
  context: string
): ScoreQuestion {
  return {
    type: 'score',
    instructions: `Rate the sensitivity of this permission (0-2). Context: ${context}. Capability: ${JSON.stringify(event.capability)}`,
    criteria: [
      'Low: Anonymous analytics, non-identifying preferences',
      'Medium: Account access, contact info, non-sensitive files',
      'High: Precise location, camera/mic, financial data, private messages',
    ],
  };
}