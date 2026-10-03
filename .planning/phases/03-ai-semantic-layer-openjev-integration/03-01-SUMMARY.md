---
phase: 03-ai-semantic-layer-openjev-integration
plan: 01
type: execute
wave: 1
depends_on: []
subsystem: ai
tags: [ai, openjev, semantic-layer, types, tracer]
requirements:
  - AI-01
  - AI-08
  - OPENJEV-01
  - OPENJEV-05
status: complete
actuals:
  tokens: 185000
  tasks: 3
  commits: 3
  plan_head_before: "41442f1"
  plan_head_after: "0a8da86"
duration_seconds: 2300
completed_at: "2026-10-03T11:05:45Z"
decisions:
  - "Created comprehensive AI type system with EvidenceCitation on all outputs (AI-08)"
  - "OpenJevClient implements all 4 classification types using Codiv API (noul, choice, score)"
  - "Batch classification (OPENJEV-05) uses single API call with multiple questions per event"
  - "OpenJevError with status, code, retryable, retryAfterMs for robust error handling"
  - "FallbackHeuristics provides local implementations for all AI functions (OPENJEV-06)"
  - "OpenJevAIBackend implements Phase 1 AIBackend plugin interface (PLUGIN-04)"
  - "Plugin auto-registers as 'openjev' on module load, swappable for local LLM"
key_files:
  created:
    - src/ai/evidence.ts
    - src/ai/types.ts
    - src/ai/openjev-types.ts
    - src/ai/openjev-client.ts
    - src/ai/index.ts
    - src/ai/fallback-heuristics.ts
    - src/ai/backend-adapter.ts
    - test/ai/openjev-client.test.ts
    - test/ai/types.test.ts
    - test/ai/openjev-client.batch.test.ts
    - test/ai/openjev-client.errors.test.ts
    - test/ai/backend-adapter.test.ts
  modified:
    - src/index.ts
    - tsup.config.ts
metrics:
  test_files: 5
  test_cases: 50
  lines_added: 3500
---

# Phase 03 Plan 01: AI Semantic Layer + OpenJev Integration — Summary

**One-liner:** Core AI type system, EvidenceCitation standard, OpenJevClient with 4 classification types (noul/choice/score), batch support, error handling, fallback heuristics, and Phase 1 AI backend plugin integration.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (tracer) | Core AI types + OpenJevClient + one ConsentEvent classification end-to-end | 8187360 | src/ai/evidence.ts, types.ts, openjev-types.ts, openjev-client.ts, index.ts, test/ai/openjev-client.test.ts, test/ai/types.test.ts |
| 2 (auto) | OpenJevClient batch classification and error handling | 2a957cb | test/ai/openjev-client.batch.test.ts, test/ai/openjev-client.errors.test.ts |
| 3 (auto) | AI backend plugin interface integration | 0a8da86 | src/ai/fallback-heuristics.ts, backend-adapter.ts, index.ts, test/ai/backend-adapter.test.ts, src/index.ts, tsup.config.ts |

## Verification Results

- **All 50 tests pass**: `pnpm test test/ai/` ✓
- **TypeScript compiles**: `pnpm typecheck` ✓ (no errors in src/ai/ or test/ai/)
- **Build succeeds**: `pnpm build` ✓ (outputs to dist/ai/)
- **Tracer test proves end-to-end**: ConsentEvent → OpenJevClient → OpenJevClassification with evidence citations

## Key Artifacts Delivered

### Types (src/ai/types.ts)
- `PurposeInference`, `PermissionInterpretation`, `PolicyExtraction`, `DataPractice`
- `TermsExtraction`, `TermsClause`, `MismatchReasoning`
- `OpenJevClassification` — all 4 classifications: decision, excessiveness, purposeMatch, sensitivity with confidence
- `EvidenceCitation` — sources: dom, policy, terms, oauth-url, cookie, openjev
- `AIBackend` interface — mirrors Phase 1 PLUGIN-04
- `PageContext`, `AIAnalysisResult` — for integration pipeline

### OpenJev Types (src/ai/openjev-types.ts)
- Request/Response: `OpenJevRequest`, `OpenJevResponse`
- Questions: `NouQuestion`, `ChoiceQuestion`, `ScoreQuestion`
- Answers: `NouAnswer` (noul 0-1), `ChoiceAnswer` (choice + probabilities + confidence), `ScoreAnswer` (score 0-2 + legend + probabilities + confidence)
- Question builders: `buildDecisionQuestion`, `buildExcessivenessQuestion`, `buildPurposeMatchQuestion`, `buildSensitivityQuestion`

### OpenJev Client (src/ai/openjev-client.ts)
- `OpenJevClient` class with Codiv API integration (`https://api.codiv.ai/v1/systemone`)
- `classifyDecision` (noul → allow/ask/deny), `classifyExcessiveness` (choice), `classifyPurposeMatch` (choice), `classifySensitivity` (score 0-2)
- `classifyBatch` (OPENJEV-05) — single API call with 4 questions per event, returns 4 classifications per event in order
- `OpenJevError` — status, code, retryable, retryAfterMs (from 429 retry-after header)
- 10s default timeout via AbortController

### Evidence Citations (src/ai/evidence.ts)
- `EvidenceCitation` interface with source, selector, textSpan, url, section, scope, cookie, confidence
- Helpers: `createDomEvidence`, `createPolicyEvidence`, `createTermsEvidence`, `createOAuthEvidence`, `createCookieEvidence`, `createOpenJevEvidence`, `combineEvidence`

### Fallback Heuristics (src/ai/fallback-heuristics.ts) — OPENJEV-06
- `inferPurpose` — keyword-based (productivity/social/ecommerce/content/auth/other)
- `interpretPermission` — capability-type rules with sensitivity (OAuth high for drive/calendar/mail, browser high for geolocation/camera/mic, cookie high for advertising)
- `extractPolicy` — regex patterns for collection/sharing/selling/ai-training, purposes, third parties, retention
- `extractTerms` — regex for arbitration/auto-renewal/liability/content-license/termination/governing-law with severity
- `reasonMismatch` — keyword matching between purpose keywords and capability text
- `classifyBatchForPlugin` — plugin-compatible Classification[] output
- All outputs confidence ≤ 0.6

### Backend Adapter (src/ai/backend-adapter.ts) — PLUGIN-04
- `OpenJevAIBackend` implements Phase 1 `AIBackend` interface
- `classify()` → OpenJevClient.classifyBatch with fallback
- `extract()` → FallbackHeuristics for policy/terms
- `reason()` → FallbackHeuristics for mismatch
- `initializeOpenJevBackend(apiKey)` — registers with API key
- `getDefaultOpenJevBackend()` — lazy fallback-mode initialization
- Auto-registers as 'openjev' on module load

### Tests (50 passing)
- `test/ai/types.test.ts` (20) — type validation for all interfaces, EvidenceCitation helpers
- `test/ai/openjev-client.test.ts` (6) — tracer: classifyDecision with mocked fetch, verify request/response, 401/network error handling
- `test/ai/openjev-client.batch.test.ts` (3) — classifyBatch 3 events = 12 classifications, empty array, defaults for missing answers
- `test/ai/openjev-client.errors.test.ts` (9) — 401, 403, 429 (retryAfterMs), 500, 503, network, timeout, batch errors
- `test/ai/backend-adapter.test.ts` (12) — plugin registration, classify delegation/fallback, extract/return ExtractedData, reason/return ReasoningResult, custom backend swappability

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] OpenJevClient classify methods accessed response.answers with dot notation**
- **Found during**: TypeScript compilation
- **Issue**: `response.answers.decision` failed with "Property comes from index signature, must use ['decision']"
- **Fix**: Changed to bracket notation `response.answers['decision']` in all classify methods

**2. [Rule 1 - Bug] FallbackHeuristics used instance methods instead of static**
- **Found during**: Test execution
- **Issue**: `this.fallback.classifyBatch` not a function — FallbackHeuristics methods are static
- **Fix**: Changed to `FallbackHeuristics.classifyBatch()` etc.

**3. [Rule 1 - Bug] Plugin interface mismatch between Phase 1 AIBackend and Plan types**
- **Found during**: TypeScript compilation / test implementation
- **Issue**: Phase 1 `AIBackend` expects `Classification[]` (from DecisionRecord.aiClassification), `ExtractedData`, `ReasoningResult` — different from Plan's `OpenJevClassification[]`, `PolicyExtraction`, `MismatchReasoning[]`
- **Fix**: OpenJevAIBackend implements Phase 1 `AIBackend` exactly, with conversion methods and FallbackHeuristics plugin-compatible static methods (`classifyBatchForPlugin`, `extractPolicyForPlugin`, `extractTermsForPlugin`, `reasonMismatchForPlugin`)

**4. [Rule 2 - Missing Critical] AIBackend plugin interface not auto-registered on module load**
- **Found during**: Test "registerAIBackend('openjev', ...) called on module load"
- **Issue**: clearAIBackends() in tests cleared the default registration
- **Fix**: `getDefaultOpenJevBackend()` now re-registers if registry was cleared

### Architectural Changes (Rule 4)

None — all changes were within task scope.

## Acceptance Criteria Met

- ✅ pnpm test test/ai/openjev-client.test.ts test/ai/types.test.ts exits 0
- ✅ TypeScript compiles with zero errors in src/ai/**/*.ts
- ✅ OpenJevClient classifies a ConsentEvent and returns OpenJevClassification with all 4 classification fields populated
- ✅ EvidenceCitation helpers create valid citations for dom, policy, terms, oauth-url, cookie sources
- ✅ OpenJevRequest/Response types match Codiv API specification
- ✅ classifyBatch accepts array and returns array of classifications (4 per event)
- ✅ pnpm test test/ai/openjev-client.batch.test.ts test/ai/openjev-client.errors.test.ts exits 0
- ✅ classifyBatch(3 events) makes single API call, returns 12 classifications in correct order
- ✅ OpenJevError has status, code, retryable for network/401/429/500/timeout
- ✅ Rate limit error includes retryAfterMs from header
- ✅ pnpm test test/ai/backend-adapter.test.ts exits 0
- ✅ OpenJevAIBackend implements AIBackend interface from Phase 1 PLUGIN-04
- ✅ registerAIBackend('openjev', instance) called on module load
- ✅ classify() delegates to OpenJevClient.classifyBatch
- ✅ extract() and reason() return valid typed structures (via fallback)
- ✅ Custom backend registration works (test registers mock, verifies it's used)
- ✅ Multiple backends can be registered and selected

## Next Steps

Plan 03-02 will implement the 5 AI engines:
- PurposeInferenceEngine, PermissionInterpretationEngine, PolicyExtractionEngine, TermsExtractionEngine, MismatchReasoningEngine
- Each with OpenJevClient integration and FallbackHeuristics fallback
- Complete OpenJevAIBackend with real extract() and reason() implementations