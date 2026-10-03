# Walking Skeleton — ConsentLens

**Phase:** 1
**Generated:** 2026-10-03

## Capability Proven End-to-End

> A developer can run `pnpm test` and see the OAuth adapter extract structured ConsentEvent[] from a test HTML fixture containing "Continue with Google/GitHub/Microsoft" buttons — proving the full adapter stack works: TypeScript project → IR types → Adapter interface → OAuthAdapter → AdapterRegistry → Plugin interface → Test fixture → Verified output.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Package Manager | pnpm | Fast, disk-efficient, monorepo-ready (D-01) |
| Build Tool | tsup | Zero-config, ESM/CJS dual output, esbuild-based (D-02) |
| Test Framework | Vitest | Native TS, fast, Vite-compatible (D-03) |
| Linting | ESLint + Prettier | typescript-eslint, eslint-plugin-vitest (D-04) |
| TypeScript | Strict mode, ES2022, NodeNext modules | Maximum type safety (D-05) |
| Project Structure | `src/{ir,adapters,engine,ai,extension,shared}` | Matches phase boundaries (D-06) |
| Capability Taxonomy | Structured objects `{type, provider, scope}` | Pattern matching friendly, rich metadata, extensible (D-07) |
| Required IR Fields | website, consentType, capability, timestamp, grantStatus, evidence[] | Mirrors uBlock filter decision needs (D-08) |
| Evidence References | Rich with confidence `{source, selector?, url?, text?, confidence, extractionMethod, extractedAt}` | Enables inspectable decisions (D-09) |
| Adapter Input | Raw Document (full DOM access) | Content scripts run on main thread (D-10) |
| Adapter Method | Always async `extract(context): Promise<AdapterResult>` | Uniform, future-proof (D-11) |
| Adapter Error Handling | Fail-open + error collection `{events, errors}` | One adapter failure doesn't block others (D-12) |
| OAuth Detection | All patterns + generic fallback | Button text, href regex, data-attributes, meta tags, /oauth/authorize (D-13) |
| Scope Extraction | Both URL param + data-scope, merged + deduplicated (D-14) |
| Provider Coverage | Core 5: Google, GitHub, Microsoft, Slack, Discord | Known scope taxonomies (D-15) |
| Cookie Classification | External tracker lists (Disconnect/EasyPrivacy) | More accurate, maintainable (D-16) |
| First/Third-Party | eTLD+1 via Public Suffix List (psl) | Correct subdomain handling (D-17) |
| Dynamic Cookies | CookieStore API + polling fallback | Native where supported, universal fallback (D-18) |
| Policy Fetch | CORS proxy (r.jina.ai) | Returns extracted text (D-19) |
| Content Extraction | Mozilla Readability (@mozilla/readability) | Battle-tested (D-20) |
| Caching | IndexedDB with Cache-Control (Phase 4) | Persistent, respects headers, survives reloads (D-21) |
| Adapter Registration | Explicit array `registry.register([...])` | Simple, explicit (D-22) |
| Adapter Execution | Configurable priority (ascending) | OAuth=10, Browser=20, Cookie=30, Policy=40, Terms=50 (D-23) |
| Shared Context | Mutable enrichment | Adapters can add to context (OAuth→Policy) (D-24) |

## Stack Touched in Phase 1

- [x] Project scaffold (pnpm, TypeScript, tsup, Vitest, ESLint, Prettier)
- [x] Type system — ConsentEvent, Capability, Purpose, Evidence, DecisionRecord
- [x] Adapter interface — async extract, PageContext, AdapterError, AdapterResult
- [x] 5 Adapters — OAuth, Browser Permissions, Cookies, Policy, Terms
- [x] Adapter Registry — priority-based execution, fail-open, context enrichment
- [x] Plugin Architecture — 5 extension points (adapter, classifier, policy extractor, AI backend, provider)
- [x] Provider Registry — 5 core OAuth providers with scope maps
- [x] Rule Pack Schema — JSON with metadata, validated via Zod
- [x] Config Schema — Single consentlens.config.json with Zod validation
- [x] Import/Export — Full configuration portability
- [x] Test fixtures — HTML for each adapter + combined integration
- [x] Unit tests — All adapters, plugins, registry, integration
- [x] CI/CD — GitHub Actions workflow (install, lint, typecheck, test, build)
- [x] Dual ESM/CJS build — Ready for extension consumption

## Out of Scope (Deferred to Later Slices)

- Deterministic Policy Engine (Phase 2) — uBlock-style rule parser, matcher, precedence
- AI Semantic Layer (Phase 3) — Purpose inference, permission interpretation, OpenJev integration
- Cross-Source Reasoning (Phase 4) — Unified consent view, contradiction detection, history
- Chrome Extension MV3 (Phase 5) — Content scripts, background worker, side panel, settings
- Demo Sites + Polish (Phase 6) — 4 demo sites, README, license, CONTRIBUTING.md
- IndexedDB persistence for policy/terms cache (Phase 4)
- Real network fetching for policy/terms (Phase 3+ uses mocked in tests)
- Adapter sandboxing (Phase 5)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: **Policy Engine** — uBlock-style rule parser consumes ConsentEvent[] from adapter registry, produces decisions with explanations
- Phase 3: **AI Semantic Layer + OpenJev** — AI backends (via plugin interface) consume ConsentEvent[] for purpose inference, mismatch reasoning, fast classification
- Phase 4: **Cross-Source Reasoning + History** — Combines all adapter outputs, detects overlaps/contradictions, IndexedDB consent ledger
- Phase 5: **Chrome Extension MV3** — Content scripts run adapter registry, background runs full pipeline, side panel displays unified view
- Phase 6: **Demo Sites + Polish** — 4 test sites, UX polish, documentation, contributing guides