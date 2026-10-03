# Roadmap: ConsentLens

**Project Mode:** mvp
**Granularity:** fine
**Phases:** 6

---

### Phase 1: Consent IR + Adapter Framework
**Mode:** mvp
**Goal:** Define unified ConsentEvent schema and build pluggable adapter system with 5 core adapters (OAuth, Browser Perms, Cookies, Policy, Terms)

**Success Criteria:**
1. TypeScript types for ConsentEvent, Capability, Purpose, Evidence, DecisionRecord compile without errors
2. Adapter interface defined; 5 adapters implemented and registered
3. Each adapter extracts structured data from test HTML fixtures
4. Adapter registry loads all adapters, runs them on a page, returns combined ConsentEvent[]
5. Unit tests for each adapter pass

**Requirements:** IR-01..05, ADAPTER-01..06

---

### Phase 2: Deterministic Policy Engine
**Mode:** mvp
**Goal:** uBlock-style rule parser, matcher, and decision engine with precedence, exceptions, policy packs

**Success Criteria:**
1. Rule parser handles: `capability@domain = action`, `@@capability@domain` exceptions, wildcards, category wildcards
2. Precedence engine: user > trusted > community > defaults
3. Domain matching: exact, suffix (example.com), wildcard (*.example.com), regex
4. Capability matching: exact, category prefix (oauth.google.*, cookie.*)
5. 5 built-in policy packs load and produce decisions
6. Decision explanation returns matched rule, layer, capability, domain, action
7. Temporary rules with TTL work
8. Engine tests cover all syntax variants and precedence scenarios

**Requirements:** ENGINE-01..08

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

**Requirements:** AI-01..08, OPENJEV-01..06

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
6. All reasoning outputs traceable to source events and AI classifications

**Requirements:** CROSS-01..04, HIST-01..03

---

### Phase 5: Chrome Extension (MV3) + Side Panel UI
**Mode:** mvp
**Goal:** Working extension with content scripts, background worker, side panel demonstrating full loop

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

**Requirements:** EXT-01..08

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

**Requirements:** DEMO-01..04

---

## Phase Dependencies

```
Phase 1 (IR + Adapters)
    ↓
Phase 2 (Policy Engine) ──→ Phase 3 (AI + OpenJev)
    ↓                          ↓
    └──────→ Phase 4 (Cross-Source + History)
                ↓
            Phase 5 (Extension)
                ↓
            Phase 6 (Demo + Polish)
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

---

## MVP Cut Line

**Must Have (Phases 1-5 core):**
- Consent IR, 5 adapters, policy engine, AI layer, OpenJev, cross-source, history, extension side panel

**Nice to Have (Phase 6 + Polish):**
- 4 demo sites, polished UX, README, license, demo script

**Cut Entirely (v2):**
- Policy change detection, consent receipts, NL→policy compiler, community packs, Agent Skill, model harness, Firefox, DNR blocking
