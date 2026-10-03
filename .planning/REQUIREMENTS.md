# Requirements: ConsentLens

**Defined:** 2026-10-03
**Core Value:** Users understand and control what they're consenting to across all web consent surfaces, with AI explaining mismatches between stated purpose and requested access.

## v1 Requirements

### Consent IR (Intermediate Representation)

- [ ] **IR-01**: ConsentEvent schema captures website, user action, consent type, requested capability, resource, OAuth scope, browser permission, cookie category, data collected, data shared, retention, AI training use, policy evidence, terms evidence, timestamp, grant status
- [ ] **IR-02**: Capability taxonomy covers OAuth scopes (Google, GitHub, Microsoft, etc.), browser permissions (location, camera, mic, notifications, clipboard, sensors), cookie categories (essential, analytics, advertising, personalization), policy data practices, terms clauses
- [ ] **IR-03**: Purpose schema captures inferred site purpose, stated purpose from policy/terms, user intent from context
- [ ] **IR-04**: Evidence references preserve DOM selectors, policy section URLs, OAuth scope strings, cookie names for traceability
- [ ] **IR-05**: Decision record captures matched rule, AI classification, confidence, provenance (user rule, community, default, AI suggestion)

### Adapter System

- [ ] **ADAPTER-01**: OAuth adapter detects "Continue with [Provider]" buttons, extracts provider, requested scopes from OAuth URL/state
- [ ] **ADAPTER-02**: Browser permission adapter detects Permissions API usage, navigator.permissions queries, permission request patterns in DOM
- [ ] **ADAPTER-03**: Cookie adapter reads document.cookie, classifies cookies by name patterns and known tracker lists into categories
- [ ] **ADAPTER-04**: Policy adapter finds privacy policy links, fetches content, extracts data practices, purposes, third parties, AI training, retention
- [ ] **ADAPTER-05**: Terms adapter finds terms of service links, extracts material clauses (arbitration, auto-renewal, liability, content licensing, termination)
- [ ] **ADAPTER-06**: Adapter registry allows adding new consent mechanism extractors without engine changes

### Plugin Architecture & Extensibility (Core Customizability)

- [ ] **PLUGIN-01**: Adapter plugin interface — `registerAdapter(type, factory)` allows third-party adapters without core changes
- [ ] **PLUGIN-02**: Classifier plugin interface — `registerClassifier(name, fn)` for custom cookie/tracker classification logic
- [ ] **PLUGIN-03**: Policy extractor plugin interface — `registerPolicyExtractor(name, fn)` for custom policy parsing
- [ ] **PLUGIN-04**: AI backend plugin interface — `registerAIBackend(name, { classify, extract, reason })` for swappable AI models
- [ ] **PLUGIN-05**: Rule pack format — JSON schema with metadata (name, version, author, description, rules[], dependencies)
- [ ] **PLUGIN-06**: Provider registry — `registerProvider(id, { name, authUrl, scopeMap, icon, color })` for OAuth providers
- [ ] **PLUGIN-07**: Configuration schema — Single `consentlens.config.json` with all user-customizable settings
- [ ] **PLUGIN-08**: Import/export API — `exportConfig()` / `importConfig(json)` for full portability

### Policy Engine

- [ ] **ENGINE-01**: uBlock-style rule syntax: `capability[@domain] = action` where action ∈ {allow, ask, deny}
- [ ] **ENGINE-02**: Rule precedence: user rules > trusted policies > community rules > defaults
- [ ] **ENGINE-03**: Domain matching supports exact, suffix, wildcard, regex
- [ ] **ENGINE-04**: Capability matching supports exact, category wildcard (cookie.*, oauth.google.*)
- [ ] **ENGINE-05**: Exception syntax: `@@capability@domain` to override higher-precedence deny
- [ ] **ENGINE-06**: Policy packs as named rule sets (Balanced, Strict, Essential, NoAITraining, Paranoid)
- [ ] **ENGINE-07**: Temporary rules with TTL (session, 1hr, 24hr, custom)
- [ ] **ENGINE-08**: Decision explanation shows matched rule, precedence layer, capability, domain, action

### AI Semantic Layer

- [ ] **AI-01**: Purpose inference from page content, meta tags, headings, main text → structured purpose description
- [ ] **AI-02**: Permission interpretation: OAuth scope + browser permission + cookie category → human-readable capability description with sensitivity rating
- [ ] **AI-03**: Policy extraction: privacy policy text → structured data practices, purposes, third parties, AI training flags, retention periods
- [ ] **AI-04**: Terms extraction: terms text → material clauses with severity (arbitration, auto-renewal, content license, termination)
- [ ] **AI-05**: Purpose/access mismatch reasoning: compare inferred purpose vs each requested capability → relevance score (relevant, unclear, potentially excessive, unrelated)
- [ ] **AI-06**: Least-privilege estimation: for a given purpose, what minimum capabilities seem necessary
- [ ] **AI-07**: Cross-source consent summary: unified natural-language explanation of all consent events on page
- [ ] **AI-08**: All AI outputs include evidence citations (DOM selector, policy section, scope string) and confidence

### OpenJev Integration

- [ ] **OPENJEV-01**: Classify consent decision: allow/ask/deny with confidence (noul type)
- [ ] **OPENJEV-02**: Classify excessiveness: excessive / appropriate / minimal (choice type with criteria)
- [ ] **OPENJEV-03**: Classify purpose match: relevant / unclear / unrelated (choice type)
- [ ] **OPENJEV-04**: Classify sensitivity: high / medium / low (score type 0-2)
- [ ] **OPENJEV-05**: Batch classification for multiple consent events on one page
- [ ] **OPENJEV-06**: Fallback to local heuristics if API unavailable

### Cross-Source Reasoning

- [ ] **CROSS-01**: Unified consent view aggregates all adapters' events for current page
- [ ] **CROSS-02**: Detects duplicate/overlapping requests (e.g., OAuth Drive + file input both accessing files)
- [ ] **CROSS-03**: Identifies consent clusters by data sensitivity (high: location, drive, calendar; medium: contacts, photos; low: analytics)
- [ ] **CROSS-04**: Flags policy/terms contradictions (e.g., policy says "no AI training" but terms allows "service improvement")

### Chrome Extension

- [ ] **EXT-01**: Manifest V3 with content scripts, background service worker, side panel
- [ ] **EXT-02**: Content script runs on all pages, extracts consent events via adapters, sends to background
- [ ] **EXT-03**: Background service worker runs policy engine, AI layer, OpenJev classification
- [ ] **EXT-04**: Side panel shows unified consent view: each event with capability, purpose match, AI flags, policy decision, evidence
- [ ] **EXT-05**: Side panel "Why?" expandable for each decision showing rule matched, AI classification, evidence
- [ ] **EXT-06**: Side panel actions: Allow Once, Always Allow, Deny, Ask (creates temporary/user rule)
- [ ] **EXT-07**: Policy pack selector in side panel header
- [ ] **EXT-08**: Consent history view: chronological list of analyzed pages with decisions
- [ ] **EXT-09**: Settings page: manage providers, classifiers, rule packs, AI backends, import/export config

### Consent History

- [ ] **HIST-01**: Local IndexedDB stores consent events with decisions, timestamps, page URLs
- [ ] **HIST-02**: Query by capability (which sites have Drive access?), by domain, by date range
- [ ] **HIST-03**: Audit view: unused permissions (granted but never exercised), old consents (>90 days), changed policies

### Demo / Test Sites

- [ ] **DEMO-01**: Test page with OAuth (Google Drive + Calendar), browser location, advertising cookies, policy with AI training clause
- [ ] **DEMO-02**: Test page with GitHub OAuth (repo read + admin), notifications, analytics cookies
- [ ] **DEMO-03**: Test page with Microsoft OAuth (Mail + Calendars + Files), camera, microphone, terms with arbitration
- [ ] **DEMO-04**: Real-site test: Notion (OAuth + cookies + policy), Canva, PDF converter site

## v2 Requirements

### Advanced

- [ ] **ADV-01**: Policy change detection (diff privacy policy/terms over time)
- [ ] **ADV-02**: Consent receipts (exportable JSON/PDF of what was agreed to)
- [ ] **ADV-03**: Natural language → policy compiler (user says "no advertising tracking" → generates rules)
- [ ] **ADV-04**: Community rule pack import/export (JSON format)
- [ ] **ADV-05**: Agent Skill: `analyze_consent(url)`, `explain_permission(scope)`, `audit_site(domain)`
- [ ] **ADV-06**: Model harness: evaluate OpenJev vs local models on consent classification benchmark
- [ ] **ADV-07**: Firefox Manifest V2/V3 port
- [ ] **ADV-08**: DeclarativeNetRequest integration for actual blocking (not just analysis)

### Community & Extensibility (v2)

- [ ] **COMM-01**: Rule pack repository index format — `packs.json` with name, url, version, hash, description
- [ ] **COMM-02**: Provider contribution template — docs + PR template for adding new OAuth providers
- [ ] **COMM-03**: Classifier contribution guide — how to write custom cookie/tracker classifiers
- [ ] **COMM-04**: Adapter development SDK — TypeScript types, test utilities, example adapters
- [ ] **COMM-05**: Community rule pack gallery (GitHub Pages or similar) — discoverable, versioned packs
- [ ] **COMM-06**: Automated testing for community contributions — CI validates pack format, provider config

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time network interception | DNR API limited, DOM analysis covers consent surfaces |
| Mobile browsers | Hackathon scope, desktop first |
| Multi-browser | Chrome MV3 only for speed |
| Remote policy sync | Local-first principle (import/export enables sharing) |
| Legal advice | Liability, not legal counsel |
| OAuth token revocation | Read-only analysis, user must revoke in provider dashboard |
| Community rule hosting (centralized) | Distribution via Git/GitHub — standard OSS |
| Fine-tuning/custom models | Use existing open-weight models |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IR-01 to IR-05 | Phase 1 | Pending |
| ADAPTER-01 to ADAPTER-06 | Phase 1 | Pending |
| PLUGIN-01 to PLUGIN-08 | Phase 1 | Pending |
| ENGINE-01 to ENGINE-08 | Phase 2 | Pending |
| AI-01 to AI-08 | Phase 3 | Pending |
| OPENJEV-01 to OPENJEV-06 | Phase 3 | Pending |
| CROSS-01 to CROSS-04 | Phase 4 | Pending |
| EXT-01 to EXT-09 | Phase 5 | Pending |
| HIST-01 to HIST-03 | Phase 5 | Pending |
| DEMO-01 to DEMO-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 46 total (38 original + 8 plugin/extensibility)
- Mapped to phases: 46
- Unmapped: 0 ✓

---

*Requirements defined: 2026-10-03*
*Last updated: 2026-10-03 after adding extensibility requirements*