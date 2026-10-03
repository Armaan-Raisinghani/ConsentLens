---
phase: 02-deterministic-policy-engine
plan: 03
subsystem: engine
tags: [deterministic-policy-engine, temporary-rules, explanation, integration]
requires:
  - ENGINE-07
  - ENGINE-08
provides:
  - TemporaryRuleManager
  - ExplanationGenerator
  - decideWithExplanation()
  - Full Phase 1 → Phase 2 integration
affects:
  - src/engine/types.ts
  - src/engine/temporary-rules.ts
  - src/engine/explanation.ts
  - src/engine/decision-engine.ts
  - src/engine/index.ts
  - test/engine/temporary-rules.test.ts
  - test/engine/explanation.test.ts
  - test/engine/full-integration.test.ts
tech-stack:
  added:
    - TTL rule management with 4 TTL types
    - Human-readable decision explanations
  patterns:
    - uBlock-style rule precedence with temporary rules
    - Template-based explanation generation
    - End-to-end adapter-to-engine integration testing
key-files:
  created:
    - src/engine/temporary-rules.ts
    - src/engine/explanation.ts
    - test/engine/temporary-rules.test.ts
    - test/engine/explanation.test.ts
    - test/engine/full-integration.test.ts
  modified:
    - src/engine/types.ts
    - src/engine/decision-engine.ts
    - src/engine/index.ts
decisions:
  - Temporary rules injected into user precedence layer with expiry
  - Session TTL uses MAX_SAFE_INTEGER, cleared on explicit clear()
  - Explanations include matched rule, layer, capability, domain, action, confidence, evidence
  - Human-readable strings follow format: "Blocked by your rule: `rule` (user layer)"
  - All engine exports centralized in src/engine/index.ts
metrics:
  duration: "2.5 hours"
  completed_date: "2026-10-03"
  tasks: 3
  commits: 4
  files_changed: 11
status: complete
actuals:
  tokens: 45000
  tasks: 3
  commits: 4
  plan_head_before: e18f089
  plan_head_after: 33e3b33
---

# Phase 02 Plan 03: Temporary Rules with TTL, Decision Explanation, Full Integration Test Summary

**One-liner:** Complete Deterministic Policy Engine with TTL temporary rules, human-readable "Why?" explanations, and end-to-end Phase 1 AdapterRegistry → Phase 2 DecisionEngine integration test.

## Tasks Completed

### Task 1: Temporary Rules with TTL (session, 1hr, 24hr, custom) ✅
- Added `TTLType` type and `TTLRule` interface to `src/engine/types.ts`
- Created `TemporaryRuleManager` class in `src/engine/temporary-rules.ts` with:
  - `add(rule, ttl, customMs?)` — supports session, 1hr, 24hr, custom TTLs
  - `getActive()` — returns non-expired rules
  - `remove(ruleId)` — removes by ID
  - `clear()` — removes all rules
  - `clearExpired()` — removes expired rules, returns count
  - `getRemainingTime(ruleId)` — ms until expiry (null for session)
- Integrated into `DecisionEngine` with `addTemporaryRule()`, `removeTemporaryRule()`, `getTemporaryRules()`
- Temporary rules merged into user precedence layer before each decision
- 21 tests passing in `test/engine/temporary-rules.test.ts`

### Task 2: Decision Explanation Generator (ENGINE-08) ✅
- Added `Explanation` and `ExplanationDetail` types to `src/engine/types.ts`
- Created `ExplanationGenerator` class in `src/engine/explanation.ts` with:
  - `generate(engineDecision, event)` — returns full Explanation object
  - `generateDetails(engineDecision, event)` — returns structured breakdown
- Human-readable formats:
  - User deny: `"Blocked by your rule: \`oauth.google@* = deny\` (user layer)"`
  - Exception allow: `"Exception rule \`@@cookie.analytics@analytics.example.com\` matched → allow"`
  - Pack rule (Balanced): `"Asked per defaults pack rule: \`cookie.analytics@* = ask\` (defaults layer)"`
  - No match: `"No matching rules found in any layer, defaulting to ask"`
- Evidence from ConsentEvent included in explanation
- Added `decideWithExplanation(event)` and `createDecisionRecord(event)` to `DecisionEngine`
- 16 tests passing in `test/engine/explanation.test.ts`

### Task 3: Full Integration Test — Phase 1 AdapterRegistry → Phase 2 DecisionEngine ✅
- Created `test/engine/full-integration.test.ts` with capstone test:
  - Runs all 5 adapters (OAuth, BrowserPermission, Cookie, Policy, Terms)
  - Verifies Balanced pack decisions for all 5 event types
  - Tests user rule overrides pack decisions
  - Tests temporary rules with TTL affecting decisions
  - Tests NoAITraining (trusted layer) overriding Balanced (defaults)
- Updated `src/engine/index.ts` to export `TemporaryRuleManager`, `ExplanationGenerator`, and new types
- All 217 engine tests pass
- 7 integration tests passing

## Key Files Created/Modified

### New Files (5)
| File | Purpose |
|------|---------|
| `src/engine/temporary-rules.ts` | TemporaryRuleManager with 4 TTL types |
| `src/engine/explanation.ts` | ExplanationGenerator for human-readable "Why?" |
| `test/engine/temporary-rules.test.ts` | 21 tests for TTL rule management |
| `test/engine/explanation.test.ts` | 16 tests for explanation generation |
| `test/engine/full-integration.test.ts` | 7 tests for Phase 1 → Phase 2 flow |

### Modified Files (3)
| File | Changes |
|------|---------|
| `src/engine/types.ts` | Added TTLType, TTLRule, Explanation, ExplanationDetail |
| `src/engine/decision-engine.ts` | Integrated TemporaryRuleManager, ExplanationGenerator, decideWithExplanation(), createDecisionRecord() |
| `src/engine/index.ts` | Exports for TemporaryRuleManager, ExplanationGenerator, new types |

## Verification

- ✅ All 217 engine tests pass (`pnpm test test/engine/`)
- ✅ All 340 core project tests pass (excluding pre-existing plugin tests)
- ✅ TypeScript compiles (new test files clean, pre-existing errors unchanged)
- ✅ Lint passes for new test files
- ✅ Temporary rules with 4 TTL types work and expire correctly
- ✅ Decision explanations show matched rule, layer, capability, domain, action, confidence
- ✅ Full integration test proves AdapterRegistry → DecisionEngine data flow
- ✅ All ENGINE-01..08 requirements covered by tests

## Deviations from Plan

### Auto-fixed Issues (Rule 1/2)

1. **Rule parser domain validation** — The rule parser requires domain patterns to contain a dot (e.g., `localhost` fails). Fixed test to use `*` wildcard instead.
2. **Evidence creation API** — `createDOMEvidence()` doesn't accept `source` or `extractedAt` parameters (set automatically). Fixed test calls.
3. **Type-only exports** — TypeScript type exports are erased at runtime. Fixed integration test to check value exports only.
4. **Variable naming** — ESLint flags `_unused` vars. Fixed by removing unused variable assignments entirely.

### No Architectural Changes Required (Rule 4)

All fixes were inline corrections to test code or minor API adjustments. No structural changes needed.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: ttl_bypass | src/engine/temporary-rules.ts | TTL expiry checked on every getActive(); session rules use MAX_SAFE_INTEGER |
| threat_flag: xss_explanation | src/engine/explanation.ts | Human-readable strings are template-based, no user input interpolation |

## Known Stubs

None — all functionality fully implemented and tested.

## Next Steps

Plan 02-03 completes the Deterministic Policy Engine (Phase 2). Ready to proceed to:
- Phase 3: AI Semantic Layer + OpenJev (plans 03-01, 03-02, 03-03)
- Phase 4: Cross-Source Reasoning + Consent History (plans 04-01, 04-02, 04-03)

---

**Commits in this plan:**
- `c57c0f3` feat(02-03): add temporary rules with TTL support
- `a3e6ded` feat(02-03): add decision explanation generator (ENGINE-08)
- `b899e2a` feat(02-03): add full integration test (Phase 1 AdapterRegistry → Phase 2 DecisionEngine)
- `33e3b33` feat(02-03): fix lint and finalize full integration test