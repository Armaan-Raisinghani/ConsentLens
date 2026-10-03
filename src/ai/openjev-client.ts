/**
 * OpenJevClient - calls Codiv API for structured consent classification
 * Implements all 4 classification types (noul, choice, score) + batch
 */

import type { ConsentEvent } from '../ir/consent-event.js';
import type { PurposeInference } from './types.js';
import type {
  OpenJevRequest,
  OpenJevResponse,
  NouAnswer,
  ChoiceAnswer,
  ScoreAnswer,
} from './openjev-types.js';
import {
  buildDecisionQuestion,
  buildExcessivenessQuestion,
  buildPurposeMatchQuestion,
  buildSensitivityQuestion,
} from './openjev-types.js';
import type { OpenJevClassification } from './types.js';
import { createOpenJevEvidence } from './evidence.js';

/**
 * OpenJevError - structured error for API failures
 */
export class OpenJevError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    status: number,
    code: string,
    retryable: boolean,
    retryAfterMs?: number
  ) {
    super(message);
    this.name = 'OpenJevError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }

  static fromResponse(response: Response, message: string): OpenJevError {
    const retryable = response.status === 429 || response.status >= 500;
    let retryAfterMs: number | undefined;
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        retryAfterMs = parseInt(retryAfter, 10) * 1000;
      }
    }
    
    return new OpenJevError(
      message,
      response.status,
      `HTTP_${response.status}`,
      retryable,
      retryAfterMs
    );
  }

  static networkError(message: string): OpenJevError {
    return new OpenJevError(message, 0, 'NETWORK_ERROR', true);
  }

  static timeoutError(message: string): OpenJevError {
    return new OpenJevError(message, 0, 'TIMEOUT', true);
  }
}

/**
 * OpenJevClient configuration
 */
export interface OpenJevClientConfig {
  /** API key for Codiv API */
  apiKey: string;
  /** Base URL (defaults to https://api.codiv.ai) */
  baseUrl?: string;
  /** Request timeout in ms (default 10000) */
  timeout?: number;
}

/**
 * OpenJevClient class for classifying consent events
 */
export class OpenJevClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: OpenJevClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.codiv.ai';
    this.timeout = config.timeout ?? 10000;
  }

  /**
   * Classifies a consent decision (allow/ask/deny) using NouL
   */
  async classifyDecision(event: ConsentEvent): Promise<OpenJevClassification> {
    const context = this.buildContext(event);
    const question = buildDecisionQuestion(event, context);
    const request: OpenJevRequest = {
      model: 'openjev-latest',
      state: context,
      questions: { decision: question },
    };

    const response = await this.request(request);
    const answer = response.answers['decision'] as NouAnswer;
    
    return this.parseClassification(event, answer, response);
  }

  /**
   * Classifies excessiveness using choice question
   */
  async classifyExcessiveness(event: ConsentEvent): Promise<OpenJevClassification> {
    const context = this.buildContext(event);
    const question = buildExcessivenessQuestion(event, context);
    const request: OpenJevRequest = {
      model: 'openjev-latest',
      state: context,
      questions: { excessiveness: question },
    };

    const response = await this.request(request);
    const answer = response.answers['excessiveness'] as ChoiceAnswer;
    
    return this.parseClassification(event, answer, response);
  }

  /**
   * Classifies purpose match using choice question
   */
  async classifyPurposeMatch(
    event: ConsentEvent,
    purpose: PurposeInference
  ): Promise<OpenJevClassification> {
    const context = this.buildContext(event);
    const question = buildPurposeMatchQuestion(event, purpose.inferred, context);
    const request: OpenJevRequest = {
      model: 'openjev-latest',
      state: context,
      questions: { purposeMatch: question },
    };

    const response = await this.request(request);
    const answer = response.answers['purposeMatch'] as ChoiceAnswer;
    
    return this.parseClassification(event, answer, response);
  }

  /**
   * Classifies sensitivity using score question
   */
  async classifySensitivity(event: ConsentEvent): Promise<OpenJevClassification> {
    const context = this.buildContext(event);
    const question = buildSensitivityQuestion(event, context);
    const request: OpenJevRequest = {
      model: 'openjev-latest',
      state: context,
      questions: { sensitivity: question },
    };

    const response = await this.request(request);
    const answer = response.answers['sensitivity'] as ScoreAnswer;
    
    return this.parseClassification(event, answer, response);
  }

  /**
   * Batch classifies multiple events in a single API call (OPENJEV-05)
   */
  async classifyBatch(events: ConsentEvent[]): Promise<OpenJevClassification[]> {
    if (events.length === 0) return [];

    const context = events.map(e => this.buildContext(e)).join(' | ');
    const questions: Record<string, any> = {};

    events.forEach((event, index) => {
      const prefix = `event_${index}`;
      questions[`${prefix}_decision`] = buildDecisionQuestion(event, context);
      questions[`${prefix}_excessiveness`] = buildExcessivenessQuestion(event, context);
      questions[`${prefix}_purpose_match`] = buildPurposeMatchQuestion(
        event,
        'general', // Will be overridden by purpose inference in integration
        context
      );
      questions[`${prefix}_sensitivity`] = buildSensitivityQuestion(event, context);
    });

    const request: OpenJevRequest = {
      model: 'openjev-latest',
      state: context,
      questions,
    };

    const response = await this.request(request);
    return this.parseBatchResponse(events, response);
  }

  /**
   * Calls the OpenJev API with timeout and error handling
   * Public method for custom requests from AI engines
   */
  async request(request: OpenJevRequest): Promise<OpenJevResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/v1/systemone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw OpenJevError.fromResponse(
          response,
          `OpenJev API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json() as OpenJevResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof OpenJevError) {
        throw error;
      }
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw OpenJevError.timeoutError(`Request timed out after ${this.timeout}ms`);
      }
      
      throw OpenJevError.networkError(`Network error: ${error}`);
    }
  }

  /**
   * Builds context string from ConsentEvent
   */
  private buildContext(event: ConsentEvent): string {
    const parts = [
      `Website: ${event.website}`,
      `Type: ${event.consentType}`,
      `Capability: ${JSON.stringify(event.capability)}`,
    ];

    if (event.oauthScope) {
      parts.push(`OAuth Scopes: ${event.oauthScope.join(', ')}`);
    }
    if (event.browserPermission) {
      parts.push(`Browser Permission: ${event.browserPermission}`);
    }
    if (event.cookieCategory) {
      parts.push(`Cookie Category: ${event.cookieCategory}`);
    }
    if (event.dataCollected) {
      parts.push(`Data Collected: ${event.dataCollected}`);
    }
    if (event.aiTrainingUse !== undefined) {
      parts.push(`AI Training: ${event.aiTrainingUse ? 'yes' : 'no'}`);
    }

    return parts.join('; ');
  }

  /**
   * Parses a single classification response
   */
  private parseClassification(
    event: ConsentEvent,
    answer: NouAnswer | ChoiceAnswer | ScoreAnswer,
    _response: OpenJevResponse
  ): OpenJevClassification {
    const evidence = [createOpenJevEvidence(this.extractConfidence(answer))];

    // Default values
    let decision: 'allow' | 'ask' | 'deny' = 'ask';
    let decisionConfidence = 0;
    let excessiveness: 'excessive' | 'appropriate' | 'minimal' = 'appropriate';
    let excessivenessConfidence = 0;
    let purposeMatch: 'relevant' | 'unclear' | 'unrelated' = 'unclear';
    let purposeMatchConfidence = 0;
    let sensitivity: 'high' | 'medium' | 'low' = 'medium';
    let sensitivityScore: 0 | 1 | 2 = 1;

    if (answer.type === 'noul') {
      const noulAnswer = answer as NouAnswer;
      decision = noulAnswer.noul > 0.5 ? 'allow' : noulAnswer.noul < 0.5 ? 'deny' : 'ask';
      decisionConfidence = noulAnswer.noul;
    } else if (answer.type === 'choice') {
      const choiceAnswer = answer as ChoiceAnswer;
      if ('excessive' in choiceAnswer.probabilities) {
        excessiveness = choiceAnswer.choice as 'excessive' | 'appropriate' | 'minimal';
        excessivenessConfidence = choiceAnswer.confidence;
      } else {
        purposeMatch = choiceAnswer.choice as 'relevant' | 'unclear' | 'unrelated';
        purposeMatchConfidence = choiceAnswer.confidence;
      }
    } else if (answer.type === 'score') {
      const scoreAnswer = answer as ScoreAnswer;
      sensitivityScore = scoreAnswer.score as 0 | 1 | 2;
      sensitivity = sensitivityScore === 0 ? 'low' : sensitivityScore === 1 ? 'medium' : 'high';
    }

    return {
      decision,
      decisionConfidence,
      excessiveness,
      excessivenessConfidence,
      purposeMatch,
      purposeMatchConfidence,
      sensitivity,
      sensitivityScore,
      evidence,
    };
  }

  /**
   * Parses batch response into individual classifications
   */
  private parseBatchResponse(
    events: ConsentEvent[],
    response: OpenJevResponse
  ): OpenJevClassification[] {
    const results: OpenJevClassification[] = [];

    events.forEach((event, index) => {
      const prefix = `event_${index}`;
      const decisionAnswer = response.answers[`${prefix}_decision`] as NouAnswer;
      const excessivenessAnswer = response.answers[`${prefix}_excessiveness`] as ChoiceAnswer;
      const purposeMatchAnswer = response.answers[`${prefix}_purpose_match`] as ChoiceAnswer;
      const sensitivityAnswer = response.answers[`${prefix}_sensitivity`] as ScoreAnswer;

      const evidence = [createOpenJevEvidence(this.extractConfidence(decisionAnswer))];

      const decision = decisionAnswer.noul > 0.5 ? 'allow' : decisionAnswer.noul < 0.5 ? 'deny' : 'ask';
      const decisionConfidence = decisionAnswer.noul;

      const excessiveness = excessivenessAnswer.choice as 'excessive' | 'appropriate' | 'minimal';
      const excessivenessConfidence = excessivenessAnswer.confidence;

      const purposeMatch = purposeMatchAnswer.choice as 'relevant' | 'unclear' | 'unrelated';
      const purposeMatchConfidence = purposeMatchAnswer.confidence;

      const sensitivityScore = sensitivityAnswer.score as 0 | 1 | 2;
      const sensitivity = sensitivityScore === 0 ? 'low' : sensitivityScore === 1 ? 'medium' : 'high';

      results.push({
        decision,
        decisionConfidence,
        excessiveness,
        excessivenessConfidence,
        purposeMatch,
        purposeMatchConfidence,
        sensitivity,
        sensitivityScore,
        evidence,
      });
    });

    return results;
  }

  /**
   * Extracts confidence from any answer type
   */
  private extractConfidence(answer: NouAnswer | ChoiceAnswer | ScoreAnswer): number {
    if (answer.type === 'noul') return (answer as NouAnswer).noul;
    if (answer.type === 'choice') return (answer as ChoiceAnswer).confidence;
    return (answer as ScoreAnswer).confidence;
  }
}