# US-E11.8 Teacher Lesson Plan Authoring

## Status

planned

## Lane

normal

(hard-gate check: no auth/RBAC change beyond existing teacher-role gating
pattern already used by exam-bank/lesson-bank, no token/session change, no
tenant isolation change beyond the standard tenant-scoped-list pattern, no
data-loss risk — no delete endpoint modeled, no PII beyond existing
teacher/subject identifiers already handled elsewhere, no validation
weakening, no new design-system token.)

## Dependencies

- Depends on: none (BE contract already exists and is stable — ground-truthed
  US-E18.16; design already delivered — DR-021).
- Blocks: none known.
- Feature module(s) chạm: `src/features/lesson-plan` (net-new).
- Shared contract/file: `src/bootstrap/endpoint/lms.endpoint.ts` (new
  `LESSON_PLAN_EP` group, additive), `docs/product/screens.md` (already has a
  placeholder row from DR-021), `docs/TEST_MATRIX.md` (new row).

## Origin

`docs/design-requests/DR-021-lesson-plan-question-bank.md` (delivered
2026-07-17) — net-new design for a BE contract ground-truthed in
`docs/stories/epics/E18-be-wiring/US-E18.16-lesson-question-bank-wiring/story.md`
(finding #27). This BA pass turns the design into an engineering-ready spec.

## Product Contract

See `requirements.md`, `integration.md`, `use-cases.md` — consolidated in
`spec.md` (the document `fe-lead` builds from).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `screens.lessonPlan` (normative layout).
- `docs/product/screens.md` (Lesson Plan Authoring + Builder row).
- `docs/product/roles-permissions.md` (teacher role).
- `.claude/rules/api-integration.md` (envelope, camelCase, service map `core`).
- `design_src/edu/lesson-plan.jsx` (reference mockup).

## Acceptance Criteria

See `use-cases.md` / `spec.md` traceability matrix.

## Design Notes

See `spec.md`.

## Validation

To be filled by `/fe` when implemented. Add a `docs/TEST_MATRIX.md` row now at
`planned` (all proof flags `0`/`no`) per `.claude/rules/tdd.md`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain use-cases (create/update/publish DRAFT lesson plan, list mine, browse by subject), mapper, failure mapping |
| Integration | repository ↔ HTTP boundary against `LMS_EP.lessonPlans` real contract (mock-first dev default per `NEXT_PUBLIC_USE_MOCK`) |
| E2E | Storybook interaction + Playwright: create→save draft→edit→publish→locked-view flow, loading/empty/error states |
| Platform | `bun build` green |

## Harness Delta

- Story registered via `harness-cli story add --id US-E11.8 --lane normal`.
- `docs/TEST_MATRIX.md` row added (`planned`).
- No ADR from this BA pass specific to E11.8 (shared ADR `0057` covers the
  publish-terminology decision for both E11.8/E11.9).

## Evidence

BA analysis artifacts: `requirements.md`, `integration.md`, `use-cases.md`,
`spec.md` in this packet.

## FE Resolution Notes (fe-lead, pre-implementation, 2026-07-17)

Resolving `spec.md` §8's 4 `[OPEN QUESTION]`s so `fe-nextjs-engineer` doesn't
guess or invent new endpoints (grepped the codebase first, per each question's
own "raise before inventing" instruction):

1. **Subject reference-data source (blocks FR-001 picker).** No existing
   teacher-facing feature currently consumes a subject picker (exam-bank's
   create/update paths are permanently-blocked stubs, US-E18.15/ADR 0056).
   However `src/bootstrap/di/subject-catalogue.di.ts` already exports a
   reusable `makeSubjectCatalogueRepository()` factory (mock/real-swapped,
   `USE_MOCK`-gated) wired to `SUBJECT_CATALOGUE_EP`. **Decision:** reuse this
   factory read-only from a new `list-subjects-for-picker` use-case (or call
   the repo directly from a Server Action) inside `lesson-plan`'s DI/actions —
   do NOT build a second subject-list integration. Loading/error sub-states
   for the picker: skeleton `<select>` while fetching, inline retry on error,
   matches `SUBJECT_NOT_FOUND`/`LESSON_PLAN_INVALID_SUBJECT_ID` handling in
   FR-001 AC-001.4/.5.
2. **`teacherId` → display-name resolution (blocks FR-007 card attribution).**
   No existing teacher-facing lookup resolves a bare uuid to a name (the only
   staff-directory-like feature, `admin/staffing`, is principal/admin-scoped,
   not reachable from teacher routes). **Decision:** per spec.md's own
   documented fallback, render `lessonPlan.card.unknownOwner` ("Giáo viên
   khác"/"Another teacher") as the "GV: <name>" attribution on browse-scope
   cards for ALL owners (not just unresolvable ones) until a real lookup is
   wired — do not invent a new name-resolution endpoint. Flagged as a backlog
   gap (name resolution), not silently dropped.
3. **FR-010 leave-confirmation scope.** No answer surfaced from user/ba-lead
   before implementation start. **Decision:** ship dot-only per spec.md's
   explicit default (passive "Chưa lưu" indicator, no navigation guard) —
   satisfies the "Should" priority without inventing new confirm-dialog UX.
4. **Error-code casing transform.** Deferred to `fe-nextjs-engineer` per
   spec.md's instruction — do one real integration-test round-trip (or best-
   effort verification against `../edu-api` source if no live instance) before
   finalizing `map-lesson-plan-error.ts`; `fe-tech-lead-reviewer` to confirm
   this was actually done, not just claimed.

## Design Review Gate (fe-lead, 2026-07-17)

```text
Design review: pass
- design-system: conform — tokens-only confirmed by fe-tech-lead-reviewer;
  the reviewer's "arbitrary font-size" consider (text-[10px]/[10.5px]/[11px]/
  [11.5px]) is resolved as NOT an anti-pattern: cross-checked against
  docs/product/design-spec.jsonc `screens.lessonPlan` — 11px (card
  sectionsProgress), 10px (card tags), 10.5px (builder field label), 12.5px
  (page subtitle) are literal normative values cited verbatim from the spec,
  not invented. No change required.
- a11y: WCAG AA confirmed by fe-accessibility-auditor after fix pass —
  A11Y-001 (tag-chip remove button touch target, blocking) and A11Y-002
  (publish CTA visual dimming, minor) both fixed by fe-nextjs-engineer,
  commit 476933a. Keyboard/focus/reduced-motion/ARIA all pass.
- impeccable audit: 0 additional findings beyond what fe-tech-lead-reviewer/
  fe-accessibility-auditor already surfaced (all resolved) — no
  redesign/token request, existing hierarchy and component reuse
  (StatusBadge/EmptyState/DetailPanelHeader) sufficient.
- states: loading/empty(×4 distinct: mine-empty, mine-filtered-empty,
  browse-prompt, browse-empty)/error/success covered per Storybook
  interaction stories (list + builder, incl. locked/publish-confirm/
  tag-limit); responsive per repo's existing viewport-story convention,
  no layout-break flag raised by either gate reviewer.
```

## Tech-lead review fix pass (fe-nextjs-engineer, commit 476933a)

Fixed: mock-fixture leak into `teacher/lesson-plans/page.tsx` (production
render path no longer imports `infrastructure/mocks/`), A11Y-001/A11Y-002,
`window.location.href`→`router.push()` SPA nav, story decorator token fix.
Verified-no-change: `revalidatePath` route-group segment (matches the
established repo-wide convention, confirmed correct as-is). Deferred:
none outstanding — design-review gate above resolved the remaining
"consider" item. Acknowledged, not a defect: builder uses
`useState`+`useTransition`+Server Actions rather than
`state-architecture.md`'s prescribed `useQuery`/`useMutation`+invalidation —
hard-rule-compliant (RSC-seeded reads, no `useEffect`-fetching, list screen
correctly uses `useInfiniteQuery`), a design deviation worth noting for future
reference but not a re-work trigger.
