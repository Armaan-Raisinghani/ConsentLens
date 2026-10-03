# Roadmap: ConsentLens

**Project Mode:** mvp
**Granularity:** fine
**Phases:** 6

---

### Phase 1: Consent IR + Adapter Framework + Plugin Architecture
**Mode:** mvp
**Goal:** Define unified ConsentEvent schema, build pluggable adapter system with 5 core adapters (OAuth, Browser Perms, Cookies, Policy, Terms), and establish plugin architecture for community extensibility

**Success Criteria:**
1. ✅ TypeScript types for ConsentEvent, Capability, Purpose, Evidence, DecisionRecord compile without errors
2. ✅ Adapter interface defined; 5 adapters implemented and registered
3. ✅ Each adapter extracts structured data from test HTML fixtures
4. ✅ Adapter registry loads all adapters, runs them on a page, returns combined ConsentEvent[]
5. ✅ Unit tests for each adapter pass (85 tests)
6. ⏳ Plugin interfaces defined and working: registerAdapter, registerClassifier, registerPolicyExtractor, registerAIBackend, registerProvider
7. ⏳ Rule pack JSON schema defined; import/export config works
8. ⏳ Provider registry loads core 5 providers (Google, GitHub, Microsoft, Slack, Discord) from config

**Requirements:** IR-01..05, ADAPTER-01..06, PLUGIN-01..08

**Plans:**
- ✅ 01-01-PLAN.md — Project scaffold + Core IR + OAuth Adapter (tracer) + AdapterRegistry + registerAdapter plugin
- ✅ 01-02-PLAN.md — Browser Permissions, Cookie, Policy, Terms adapters + integration test
- ⏳ 01-03-PLAN.md — Plugin interfaces (registerAdapter, registerClassifier, registerPolicyExtractor, registerAIBackend, registerProvider), Rule Pack schema, Config, Import/Export, Provider registry

---

### Phase 2: Deterministic Policy Engine
**Mode:** mvp
**Goal:** uBlock-style rule parser, matcher, and decision engine with precedence, exceptions, policy packs

**Success Criteria:**
1. ✅ Rule parser handles: `capability@domain = action`, `@@capability@domain` exceptions, wildcards, category wildcards
2. ✅ Precedence engine: user > trusted > community > defaults
3. ✅ Domain matching: exact, suffix (example.com), wildcard (*.example.com), regex
4. ✅ Capability matching: exact, category prefix (oauth.google.*, cookie.*)
5. ✅ 5 built-in policy packs load and produce decisions
6. ⏳ Decision explanation returns matched rule, layer, capability, domain, action
7. ⏳ Temporary rules with TTL work
8. ⏳ Engine tests cover all syntax variants and precedence scenarios

**Requirements:** ENGINE-01..08

**Plans:** 3 plans

Plans:
- ✅ 02-01-PLAN.md — Core engine tracer: rule parser, domain/capability matching, basic decision engine
- ✅ 02-02-PLAN.md — Precedence engine (4 layers), exception syntax (@@), 5 built-in policy packs
- ⏳ 02-03-PLAN.md — Temporary rules with TTL, decision explanation, full Phase 1→2 integration test

---

### Phase 3: AI Semantic Layer + OpenJev Integration
**Mode:** mvp
**Goal:** Open-weight AI for purpose inference, permission interpretation, policy/terms extraction, purpose/access mismatch reasoning, and OpenJev fast classification

**Success Criteria:**
1. Purpose inference: given page text + DOM, returns structured purpose with confidence
2. Permission interpretation: OAuth scope / browser perm / cookie category → human description + sensitivity
3. Policy extraction: privacy policy text → structured data practices, AI training flag, retention
4. Terms extraction: terms text → material clauses with severity
5. Purpose/access mismatch: compares purpose vs capabilities → relevance classification with evidence
6. OpenJev client: classifies allow/ask/deny, excessiveness, purpose match, sensitivity with confidence
7. All AI outputs include evidence citations (DOM selector, text span, policy section)
8. Fallback heuristics when OpenJev unavailable
9. Integration tests with mocked OpenJev responses
10. **AI backend plugin interface works — can swap OpenJev for local LLM**

**Requirements:** AI-01..08, OPENJEV-01..06

**Plans:** 3 plans

Plans:
- [ ] 03-01-PLAN.md — Core AI types + OpenJevClient tracer: evidence citations, 4 classification types (noul/choice/score), batch, plugin interface
- [ ] 03-02-PLAN.md — AI semantic engines: purpose inference, permission interpretation, policy/terms extraction, mismatch reasoning, fallback heuristics
- [ ] 03-03-PLAN.md — Integration pipeline, OpenJev mock tests, Phase 1→3 full integration, plugin swappability verification

---

### Phase 4: Cross-Source Reasoning + Consent History
**Mode:** mvp
**Goal:** Unified consent view aggregating all adapters, detecting overlaps/contradictions, local history ledger

**Success Criteria:**
1. CrossSourceAnalyzer combines adapter outputs into unified ConsentView per page
2. Detects duplicate capabilities across mechanisms (OAuth Drive + file input)
3. Clusters by data sensitivity (high/medium/low)
4. Flags policy/terms contradictions
5. IndexedDB schema for consent events, decisions, timestamps
6. History queries: by capability, domain, date range
7. Audit view: unused permissions, old consents, changed policies
8. All reasoning outputs traceable to source events and AI classifications

**Requirements:** CROSS-01..04, HIST-01..03

**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md — CrossSourceAnalyzer tracer: unified ConsentView, overlap detection, sensitivity clustering
- [ ] 04-02-PLAN.md — Contradiction detection, IndexedDB history ledger, history queries
- [ ] 04-03-PLAN.md — Audit view (unused permissions, old consents, changed policies), full Phase 1→4 integration test

---

### Phase 5: Chrome Extension (MV3) + Side Panelnew UI + Settings
**Mode:** mvp
**Goal:** Working extension with content scripts, background worker, side panel demonstrating full loop, and settings page for customization

**Success Criteria:**
1. Manifest V3 loads without errors
2. Content script extracts consent events on page load, sends to background
3. Background worker runs full pipeline: adapters → engine → AI → OpenJev → cross-source → history
4. Side panel opens, displays unified consent view with: capability, purpose match, AI flags, policy decision, evidence
5. "Why?" expandable shows rule matched, AI classification, evidence citations
6. User actions: Allow Once, Always Allow, Deny, Ask create appropriate rules
7. Policy pack selector switches active pack, decisions update live
8. History tab shows chronological analyzed pages with decisions
9. Extension icons/badge reflect current page consent status
10. **Settings page: manage providers, classifiers, rule packs, AI backends, import/export config**

**Requirements:** EXT-01..09

---

### Phase 6: Demo Sites + Polish + Package
**Mode:** mvp
**Goal:** 4 demo sites showcasing different consent scenarios, extension polished, repo ready for submission

**Success Criteria:**
1. Demo site 1: OAuth (Google Drive+Calendar) + location + advertising cookies + AI training policy
2. Demo site 2: GitHub OAuth (repo+admin) + notifications + analytics cookies
3. Demo site 3: Microsoft OAuth (Mail+Calendars+Files) + camera/mic + arbitration terms
4. Demo site 4: Real-site test configurations for Notion, Canva, PDF converter
5. Side panel UX polished: loading states, empty states, error handling
6. README with architecture diagram, installation, demo instructions
7. MIT license file
8. GitHub repo initialized, all code committed
9. 3-minute demo script recorded/written
10. **CONTRIBUTING.md with provider/classifier/adapter contribution guides**

**Requirements:** DEMO-01..04

---

## Phase Dependencies

```
Phase 1 (IR + Adapters + Plugins) → 66% complete
    ↓
Phase 2 (Policy Engine) → 66% complete ──→ Phase 3 (AI + OpenJev) → Planned
    ↓                          ↓
    └──────→ Phase 4 (Cross-Source + History) → Planned
                ↓
            Phase 5 (Extension + Settings) → Pending
                ↓
            Phase 6 (Demo + Polish + Contributing) → Pending
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OpenJev API rate limits / downtime | Local fallback heuristics; cache classifications |
| Manifest V3 side panel API bugs | Test early; fallback to popup if needed |
| AI latency kills UX | OpenJev for fast classification; async AI reasoning; loading states |
| 6-hour timebox | Strict phase time limits; cut v2 scope ruthlessly; engine first |
| Adapter extraction fails on real sites | Test fixtures first; graceful degradation; log failures |
| Plugin architecture over-engineering | Keep interfaces minimal; only expose what's needed for v1 |

---

## MVP Cut Line

**Must Have (Phases 1-5 core):**
- ✅ Consent IR (Phase 1: 01-01, 01-02)
- ✅ 5 adapters (Phase 1: 01-02)
- ⏳ Plugin architecture (Phase 1: 01-03)
- ✅ Policy engine core (Phase 2: 02-01, 02-02)
- ⏳ Policy engine: TTL, explanation, integration (Phase 2: 02-03)
- ⏳ AI layer + OpenJev (Phase 3)
- ⏳ Cross-source reasoning + history (Phase 4)
- ⏳ Extension side panel + settings (Phase 5)

**Nice to Have (Phase 6 + Polish):**
- 4 demo sites, polished UX, README, license, demo script, CONTRIBUTING.md

**Cut Entirely (v2):**
- Policy change detection, consent receipts, NL→policy compiler, community packs, Agent Skill, model harness, Firefox, DNR blocking