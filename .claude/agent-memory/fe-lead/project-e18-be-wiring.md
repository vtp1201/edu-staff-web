---
name: project-e18-be-wiring
description: E18 BE-wiring epic (mock→real edu-api) — US-E18.0 gateway smoke done, findings for Wave 1-4
metadata:
  type: project
---

Epic E18 (`docs/stories/epics/E18-be-wiring/EPIC-OVERVIEW.md`) swaps mock-first
features to real edu-api via Kong (`:8000`, routes only `/iam` + `/core/api/v1`).
US-E18.0 (Wave 0, tiny, 2026-07-11) = proof-of-pattern gateway smoke — DONE.

**Why:** contract-drift audit found real repos ~100% ready (`USE_MOCK ? Mock :
Real(http)` pattern already in 30/32 DI factories) — effort is remap
path/DTO/error-code, not new repos. US-E18.0 proved the pattern works against a
REAL running BE, not just mocks.

**How to apply for every Wave 1-4 US in this epic:**
1. `cd edu-api && make stack-up` boots real `iam`+`core`+`notification`+Kong
   locally (`docker`, healthy in ~20s). `make stack-down` after.
2. To smoke-test the WEB app's own code (not just curl): write an ephemeral
   `bun run`-able `.ts` script inside the repo root (bun resolves `@/*` via
   `tsconfig.json` paths automatically when run from repo root; does NOT work
   from outside the repo dir) importing `@/bootstrap/lib/http`
   (`createHttpClient`) + `@/bootstrap/lib/api-envelope` — this validates the
   REAL interceptor/error-map code against a REAL BE. Delete the scratch file
   before committing (never commit it).
3. **MANDATORY playbook step 6 (added by US-E18.0):** every real (`!USE_MOCK`)
   DI factory branch must call `await ensureFreshSession()` (from
   `bootstrap/di/auth.di.ts`) BEFORE `createServerHttpClient()`. Decision 0018's
   proactive refresh was documented since day one but literally never wired
   into any protected feature's DI factory except `auth.di.ts` itself —
   verify with `grep -rl ensureFreshSession src/bootstrap/di` before assuming
   it's already there for a cluster.
4. **Local dev stack has no SUPER_ADMIN seed** — can't create the first tenant
   (`POST /iam/api/v1/tenants` requires SUPER_ADMIN Bearer) to get a real
   tenant-scoped 200 happy path. Do NOT attempt to promote a user's `role`
   column directly via `docker exec edu-scylla cqlsh` — the permission system
   blocks this as privilege escalation (correctly). Cross-repo ask filed for
   edu-api to add a dev-only seed/CLI.
5. **Cross-repo finding**: `POST /api/v1/auth/refresh` does NOT enforce
   refresh-token reuse-detection (`user_token_reused` documented in
   `services/iam/docs/ERROR_CODES.md` but not enforced) — replaying an
   already-rotated-away refresh token still returns 200 + a new pair. Filed as
   BE gap, not fixed in web.
6. school-config (`core`) cluster confirmed 100% path/DTO match with
   `core/docs/openapi.yaml` — zero drift, safe reference for "how correct
   wiring should look" when reviewing Wave 1 US's.

**US-E18.1 (calendar, 2026-07-11) — the epic's "MATCH 100%" audit label is
path-level only, NOT DTO-shape.** Re-reading the real
`AcademicYearResponse`/`TermResponse` schemas found the existing "real"
`CalendarRepository` (written mock-first in US-E06.5) was never actually
validated: BE returns FLAT `academicYearId`/`termId`/`status`(enum) responses,
NOT the web's nested `AcademicYear.terms[]` + boolean `isActive` + `hasGrades`
shape. Fix stayed at the repository layer (no domain/UI change): per-year
`listTerms` fan-out (`Promise.all`) to reassemble the nested shape,
`isActive = status==="ACTIVE"`, `hasGrades` always `false` from the wire (BE
has no such field — real guard is the `409 CALENDAR_TERM_IN_USE` on archive).
Also found: BE's `createYear` only accepts `label` (no atomic create-as-active
— must POST then separately `activate`, which 409s if another year is already
ACTIVE, no auto-swap like the mock did) and one existing wrong error mapping
(`CALENDAR_FORBIDDEN` → `network-error`, fixed to a new `forbidden` type).
**Apply to every remaining Wave 1 US**: don't trust the epic audit's "MATCH"
label past the path level — always diff the actual response schema field-by-
field against the entity/DTO the web already assumes before calling a cluster
"just a transport swap." fe-nextjs-engineer wrote this up as a reusable
pattern in its own memory (`pattern-be-wiring-remap.md`) — worth reading when
briefing US-E18.2 onward.

**US-E18.2 (staffing, 2026-07-11) — even bigger drift than calendar; two new
cross-cutting findings for every remaining Wave 1-3 US:**
1. **The epic audit's "MATCH" label undersold this cluster more than calendar.**
   Beyond the expected id-renames (`departmentId`/`positionTitleId`/
   `positionAssignmentId`), found: department `conceptLabel` (1 field) split
   into wire's `conceptLabelSuggested`+`conceptLabelCustom` (2 fields);
   `Permission` enum was a **completely wrong 4-value taxonomy** vs the real
   6-value BE enum (only 1 value overlapped) — a genuine domain-type change,
   not just a repo fix; `PositionAssignment.status` wire `ARCHIVED` → domain
   `REVOKED` rename; 3 fields (`activeAssignmentCount`, `memberName`,
   `positionTitleName`) don't exist on the wire at all and needed real
   derivation logic (paginated count fan-out, cross-entity name joins) in the
   repository. **Lesson**: for any cluster with "computed/joined" fields in
   the mock-first entity, check whether the join source is even reachable
   from the BE contract before assuming a repo-only fix — sometimes (like
   `memberName` here) there is NO BE source at all (checked IAM's
   `MemberResponse`: no name field anywhere except self-only `/users/me`).
2. **[CRITICAL, check on every remaining US]** `fe-tech-lead-reviewer` found
   a real, shipped bug in this cluster: `raw: true` was nested inside the
   axios `params` object instead of as a top-level config key. `isRawCall`
   (`bootstrap/lib/api-envelope.ts`) only reads `config.raw` at the TOP
   level — with `raw` nested, the interceptor unwraps the envelope before
   `parseEnvelope` runs, so every real-mode LIST call silently degrades to
   `network-error`. **Mocked-`http.get` unit tests cannot catch this** (they
   never exercise the real interceptor) — it slipped through TDD green and
   was only caught by the reviewer's independent re-verification. The
   reviewer flagged that **this same misplacement may exist pre-existing in
   `principal-teachers`/`class-log`/`subject-catalogue` repos** — worth a
   dedicated grep sweep (`grep -rn "params: {.*raw: true" src/features`)
   across the codebase, not just as each epic US touches those files.
   Fix pattern: `{ params: {...filter}, raw: true }` (raw as sibling), NOT
   `{ params: {...filter, raw: true} }`. Correct precedent:
   `calendar.repository.ts` (US-E18.1). A regression test that runs the REAL
   `unwrapResponse` against the repo's actual config (not a mocked
   `http.get`) is the only way to guard against this recurring.
3. Confirmed a second async-agent working-tree race this session (see
   `feedback` memory or note here): the engineer agent, once resumed via
   SendMessage for a revision, made its own follow-up commit in the SAME
   checkout concurrently with fe-lead's own commit of the same fix — no code
   was lost, but a duplicated Evidence paragraph in the story landed in two
   separate commits and had to be manually de-duplicated. When resuming an
   agent for revision fixes in a solo/non-worktree branch, expect it may
   commit on its own schedule — check `git log` for surprise commits before
   assuming only your own commits landed.
