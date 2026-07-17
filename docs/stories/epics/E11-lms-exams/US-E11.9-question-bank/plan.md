# Implementation Plan — Teacher Question Bank (US-E11.9)

Source of truth: `spec.md` (this plan follows it 1:1). Reuse baseline:
`src/features/lesson-plan/**` (US-E11.8, sibling DR-021 story, same BE
ground-truthing pass, same `core` service). Reference mockup:
`design_src/edu/question-bank.jsx` — layout/spacing mirrored exactly, no
redesign. Net-new feature: `src/features/question-bank`.

No code in this plan — phases only, task breakdown handed to
`fe-component-architect` / `fe-state-engineer` / `fe-nextjs-engineer`.

---

## 0. Pre-implementation decisions (spec §10, resolved here — not silently guessed)

1. **Subject dropdown data source → REAL, reuse `makeSubjectCatalogueRepository()`.**
   `subject-catalogue.di.ts` already toggles mock/real via `USE_MOCK` and
   `lesson-plan.di.ts` already consumes it (`getSubjectOptions()` helper,
   flattens parents→subjects, best-effort `[]` on failure). Question Bank
   gets its own thin `getSubjectOptions()` in `question-bank.di.ts` that calls
   the SAME `makeSubjectCatalogueRepository()` factory (no new integration,
   no new mock) — this resolves the "is `/core/api/v1/subjects` real" OQ by
   precedent: it's wired exactly like `lesson-plan` already does it, so if
   that was wrong it's already wrong in production, out of this story's scope
   to fix. Do NOT duplicate the repository/DI wiring — only the thin
   `getSubjectOptions()`/`SubjectOption` shape (same small duplication
   `lesson-plan` itself accepts, per its own `shared.i-vm.ts` comment
   "redeclared per-feature").

2. **`authorId` → display-name resolution: generic fallback label, not
   fabricated names.** No batch member-lookup endpoint is confirmed and a
   per-card N+1 `iam` lookup would be a performance smell on a paginated
   search page. Default: render a fixed, translated placeholder
   (`questionBank.card.unknownAuthor` — new key, see §5) instead of any name,
   for EVERY search-scope card, regardless of `authorId`. This is an interim
   decision owned by `fe-lead` per spec's explicit instruction — not a
   follow-up escalation. If/when a batch member-lookup lands, swap this label
   for a real name behind the same `QBQuestionCard` prop — no domain/use-case
   change needed (the entity already carries the opaque `authorId`).

3. **Filter-change-mid-flight request cancellation → `fe-state-engineer`'s
   call**, not decided here. Flagging so it isn't silently dropped: TanStack
   Query's built-in per-key de-dup/cancellation is the likely mechanism once
   the query-key hierarchy (§4) is designed; `fe-state-engineer` picks the
   exact `keepPreviousData`/`enabled`/`AbortSignal` strategy.

4. **i18n gaps — THREE additions needed, not two.** Spec §8/§10 names two
   (`empty.clearFilters`; the 3-way `forbidden-browse`/`forbidden-edit`/
   `not-visible` copy). Grepping the current 94-key `questionBank` namespace
   during this planning pass found a THIRD, unflagged gap: no key exists for
   the search-scope author-attribution fallback from decision #2 above
   (`card.edit`/`card.view` exist, no author label). Add all three groups to
   BOTH `messages/vi.json` and `messages/en.json`, same path, at once (see §5
   for exact strings — the two spec-named ones copied verbatim from spec.md
   §8, the third drafted here).

5. **OQ-2 (principal/admin scope) — no action.** `design-spec.jsonc
   roles:["teacher"]` is final for this story; routes/nav/guard target
   `teacher` only.

6. **Endpoint file placement — literal per spec, diverges from `lesson-plan`
   precedent.** Spec §6.1 explicitly places `QUESTION_BANK_EP` **inside**
   `bootstrap/endpoint/lms.endpoint.ts` (additive export, sibling of the
   existing `LMS_EP` const — do NOT touch `LMS_EP.questions`, the unrelated
   per-lesson Q&A thread). This differs from `lesson-plan`, which got its own
   `bootstrap/endpoint/lesson-plan.endpoint.ts` file. Follow the spec
   literally here — `QUESTION_BANK_EP` as a second named export in
   `lms.endpoint.ts`, not a new file — since the spec is the authoritative
   contract for this story and the two constants must never be confused.

7. **Route guard mechanism — use `requireRole(["teacher"])`
   (`bootstrap/auth-guard`), NOT the `lesson-plan` precedent.** Grepped
   `lesson-plan`'s 4 routes: none call `requireRole` — likely an
   under-scoped gap in that sibling story. Spec's NFR-008/UC-907 is explicit
   ("route guard rejects non-teacher before any request fires" is a
   Must-priority AC set, AC-907.1–.4). The correct, already-proven pattern in
   this repo is `src/app/.../student/courses/page.tsx`'s
   `const guard = await requireRole(["teacher"]); if (!guard.ok) { render a
   forbidden VM, no DI/network call }` — apply this at the top of all 3
   route `page.tsx` files AND (defensively) inside every Server Action in
   `actions.ts`, since actions are independently invocable. Do not silently
   replicate the lesson-plan gap.

---

## 1. Domain layer

**Files** (`src/features/question-bank/domain/`):

```
entities/question.entity.ts
failures/question-bank.failure.ts
repositories/i-question-bank.repository.ts
use-cases/
  search-questions.use-case.ts
  list-my-questions.use-case.ts
  create-question.use-case.ts
  get-question.use-case.ts
  update-question.use-case.ts
  publish-question.use-case.ts
  is-search-filter-satisfied.ts      // pure predicate, HTTP-free
  validate-question.ts               // client-parity field validation (FR-008)
  map-repo-error.ts                  // throwing-repo idiom → typed failure (mirrors lesson-plan)
  result.ts                          // Result<T,F> (copy shape, not import — domain has zero cross-feature deps)
```

`question.entity.ts` — mirror `QuestionResponse` **exactly** (spec §6.3 lists
14 fields, not the 12 the task brief mentioned — spec.md is authoritative,
use the full 14): `id, tenantId, authorId, questionType, subjectId,
gradeLevel, difficulty, body, expectedAnswer (string|null), status, tags
(string[]), publishedAt?, createdAt, updatedAt`. Plus:
- `QuestionType = "ESSAY"|"SHORT_ANSWER"|"FILL_IN"`, `Difficulty =
  "EASY"|"MEDIUM"|"HARD"`, `QuestionStatus = "DRAFT"|"PUBLISHED"`.
- `CreateQuestionInput` (7 fields: `questionType, subjectId, gradeLevel,
  difficulty, body, expectedAnswer?, tags?`).
- `UpdateQuestionInput` (3 fields ONLY: `body, expectedAnswer?, tags?` — the
  4 immutable fields are never sent, FR-009).
- `QuestionPage { items, nextCursor?, hasMore }`.
- `SearchQuestionsParams { subjectId?, tag?, gradeLevel?, difficulty?,
  cursor?, limit? }`, `ListMyQuestionsParams { cursor?, limit? }` (INT-202 —
  no filter params server-side at all, per spec §6.2/FR-005 table).
- Constants: `MAX_TAGS=10`, `MAX_TAG_LENGTH=50`, `MAX_BODY_LENGTH=5000`,
  `MIN_BODY_LENGTH=4` (client UX floor only), `MAX_EXPECTED_ANSWER_LENGTH=5000`.

`question-bank.failure.ts` — the 15-variant union, copied verbatim from
spec §6.4 (`not-found`, `not-visible`, `forbidden-browse`, `forbidden-edit`,
`already-published`, `type-not-supported`, `search-filter-required`,
`body-required`, `body-too-long`, `tag-limit-exceeded`, `tag-too-long`,
`invalid-difficulty`, `subject-not-found`, `invalid-cursor`,
`network-error`, `unknown`). Doc-comment the mandatory disambiguation rule
(forbidden-browse/forbidden-edit share the wire code `403 FORBIDDEN_ACTION`
— branch by call-site at the infra mapper, never by code) directly on the
union so it isn't missed downstream.

`i-question-bank.repository.ts` — 6 methods, one per INT-201..206:
`search(params): Promise<QuestionPage>`, `listMine(params):
Promise<QuestionPage>`, `create(input): Promise<QuestionEntity>`,
`getById(id): Promise<QuestionEntity>`, `update(id, input):
Promise<QuestionEntity>`, `publish(id): Promise<QuestionEntity>`.

`is-search-filter-satisfied.ts` — pure predicate, the FR-002/FR-003 gate:
`isSearchFilterSatisfied(subjectId: string, tag: string): boolean` = `true`
iff `subjectId !== "all" && subjectId !== ""` OR `tag.trim().length > 0`.
Zero HTTP/framework deps — independently unit-testable, and reused both by
the builder-side gate check (list screen, blocks the request) and by the
`search-filter-required` defense-in-depth UI mapping (same predicate proves
the client gate SHOULD have blocked it).

**Test first (Red):**
- `is-search-filter-satisfied.test.ts` — table: `("all","")→false`,
  `("all"," ")→false` (whitespace-only tag doesn't satisfy), `("uuid","")→true`,
  `("all","toán")→true`.
- One test file per use-case (mirror lesson-plan's `__tests__/*.use-case.test.ts`
  + `fake-repo.ts`) — success path + each relevant failure mapped through
  `map-repo-error.ts`. `publish-question.use-case.test.ts` explicitly covers
  the `already-published` race.
- `validate-question.test.ts` — body min/max boundaries, tag count/length
  boundaries, confirms `expectedAnswer` NEVER required for any `questionType`
  (FR-007 — the one rule that must never regress).

**Done when:** all domain unit tests green, zero framework imports in
`domain/`.

---

## 2. Infrastructure layer (server-only)

**Files** (`src/features/question-bank/infrastructure/`):

```
dtos/question-response.dto.ts
dtos/list-questions-response.dto.ts
mappers/question.mapper.ts
repositories/question-bank.repository.ts        // real, against QUESTION_BANK_EP
repositories/map-question-bank-error.ts          // code + call-site branch
repositories/mocks/fixtures.ts
repositories/mocks/mock-question-bank.repository.ts
```

Plus bootstrap additions:
- `bootstrap/endpoint/lms.endpoint.ts` — additive `QUESTION_BANK_EP` export
  (§0 item 6), exactly the shape in spec §6.1 (`search`, `list`, `detail(id)`,
  `publish(id)`).

`question.mapper.ts` — DTO→entity, mirrors `lesson-plan.mapper.ts` 1:1
(camelCase passthrough, `tags ?? []`, `publishedAt` left `undefined` when
absent from the wire, never coerced to `null`/`""`).

`question-bank.repository.ts` — real repo, same idiom as
`lesson-plan.repository.ts`: single-resource calls unwrap directly (`as
unknown as QuestionResponseDto`, no `.data`); list calls (`search`,
`listMine`) use `{ raw: true }` as a **top-level sibling of `params`**
(never nested — the exact regression class US-E18.2/19 flagged) then
`parseEnvelope()` for `meta.pagination`; every method wraps in try/catch,
rethrows `new Error(mapQuestionBankApiError(err, callSite))`
(throwing-repo idiom, domain's `map-repo-error.ts` rebuilds the typed
failure).

`map-question-bank-error.ts` — **the one repository file that must NOT
mirror `map-lesson-plan-error.ts`'s single-arg signature.** Signature:
`mapQuestionBankApiError(err: unknown, callSite: "browse" | "edit"):
QuestionBankFailure["type"]`. Branch order:
1. `NETWORK_ERROR`/no status → `network-error`.
2. `QUESTION_NOT_VISIBLE` → `not-visible` (INT-204 only — distinct code,
   no call-site ambiguity).
3. `FORBIDDEN_ACTION` → `callSite === "browse" ? "forbidden-browse" :
   "forbidden-edit"` (the mandatory disambiguation, spec §6.4 — **the
   mapper is called with `callSite` fixed PER REPOSITORY METHOD**: `search`/
   `listMine`/`create` pass `"browse"`; `update`/`publish` pass `"edit"`;
   `getById` never passes `FORBIDDEN_ACTION` through this branch at all
   since its only 403 is the distinct `QUESTION_NOT_VISIBLE` code).
4. Remaining 11 codes (`QUESTION_ALREADY_PUBLISHED`,
   `QUESTION_TYPE_NOT_SUPPORTED`, `QUESTION_SEARCH_FILTER_REQUIRED`,
   `QUESTION_BODY_REQUIRED`, `QUESTION_BODY_TOO_LONG`,
   `QUESTION_TAG_LIMIT_EXCEEDED`, `QUESTION_TAG_TOO_LONG`,
   `QUESTION_INVALID_DIFFICULTY`, `SUBJECT_NOT_FOUND`,
   `QUESTION_INVALID_CURSOR`, `QUESTION_NOT_FOUND`/`QUESTION_INVALID_ID`)
   map 1:1 per spec §6.4's comment column.
5. Status-code fallback (403→`forbidden-browse` default, 404→`not-found`,
   retryable→`network-error`, else `unknown`) — same shape as
   `map-lesson-plan-error.ts`.

**Mock repository** (`mocks/mock-question-bank.repository.ts` +
`fixtures.ts`) — same in-memory `Map` + `mockDelay` idiom as
`mock-lesson-plan.repository.ts`:
- `MOCK_CURRENT_TEACHER_ID` constant; fixtures: ≥1 DRAFT (own), ≥1 PUBLISHED
  (own), ≥1 PUBLISHED (other author), one of each `questionType`, one of
  each `difficulty` — every badge-mapping path exercised without a live BE
  (spec §6.7).
- Natural (non-forced) failure triggers, mirroring the lesson-plan mock:
  `getById`/`update`/`publish` on unknown id → `not-found`; `update`/
  `publish` on an already-`PUBLISHED` question → `already-published`;
  `update`/`publish` on a question whose `authorId !==
  MOCK_CURRENT_TEACHER_ID` → `forbidden-edit` (exercises the call-site
  branch in mock mode too); `search` called with neither `subjectId` nor
  `tag` → `search-filter-required` (defense-in-depth path, reachable only if
  a caller bypasses the client gate — exactly the scenario spec §6.7 flags).
- The remaining failure variants (`forbidden-browse`, `type-not-supported`,
  `body-required`/`body-too-long`, `tag-limit-exceeded`/`tag-too-long`,
  `invalid-difficulty`, `subject-not-found`, `invalid-cursor`, `unknown`)
  are proven at the **mapper unit-test layer**
  (`map-question-bank-error.test.ts`, one assertion per code + explicit
  call-site-branch assertions for `FORBIDDEN_ACTION`), not necessarily
  reachable through the mock's happy-path fixtures — this matches how
  `map-lesson-plan-error.test.ts` already covers its union exhaustively
  without every code being mock-reachable.

**Test first (Red):**
- `question.mapper.test.ts` — DTO→entity, `publishedAt` absence handling.
- `map-question-bank-error.test.ts` — all 15 variants + the call-site branch
  (same `FORBIDDEN_ACTION` code, two different `callSite` args, two
  different results) as its own explicit assertion.
- `question-bank.repository.test.ts` — envelope unwrap, `{ raw: true }`
  sibling-of-params placement, cursor pagination parse, error passthrough.
- `mock-question-bank.repository.test.ts` — natural triggers above.

**Done when:** integration-layer tests green; repo is a drop-in swap behind
`i-question-bank.repository.ts` with zero domain/use-case changes (spec §6.7
seam requirement).

---

## 3. Bootstrap DI

**File:** `bootstrap/di/question-bank.di.ts` (mirrors `lesson-plan.di.ts`
exactly):

```
makeRepo() → USE_MOCK ? MockQuestionBankRepository : (ensureFreshSession() +
             new QuestionBankRepository(await createServerHttpClient()))
makeSearchQuestionsUseCase()
makeListMyQuestionsUseCase()
makeCreateQuestionUseCase()
makeGetQuestionUseCase()
makeUpdateQuestionUseCase()
makePublishQuestionUseCase()
getSubjectOptions()   // thin wrapper over makeSubjectCatalogueRepository() — §0 item 1
```

`ensureFreshSession()` proactive-refresh call before every real-mode
protected-call factory, same as `lesson-plan.di.ts`/`subject-catalogue.di.ts`.

**Done when:** `question-bank.di.ts` compiles, `USE_MOCK` toggles cleanly (no
UI/domain change needed either direction).

---

## 4. Presentation

**Component reuse check (decision `0026`, done before writing anything new):**

| Need | Existing candidate | Decision |
| --- | --- | --- |
| Tag-chips input | `lesson-plan/presentation/lesson-plan-builder-screen/lp-tag-chips-input.tsx` | **PROMOTE now** — its own doc-comment already says "promote to shared on question-bank (0026)". Move to `src/components/shared/tag-chips-input/` (folder + `index.ts` + `.stories.tsx`), generalize `MAX_TAGS`/`MAX_TAG_LENGTH` to props (currently imported from `lesson-plan`'s entity file — must become caller-supplied constants so the shared component has zero feature-domain import). Both `lesson-plan` and `question-bank` (`QBTagChipsInput` = a thin re-export/wrapper, not a fork) import from the shared home. |
| Publish confirm dialog | `lesson-plan/presentation/lesson-plan-builder-screen/publish-confirm-dialog.tsx` | **PROMOTE now** — identical need (one-way DRAFT→PUBLISHED, non-destructive/positive tone, spinner-stays-open-on-error). Its own doc-comment flags this exact deferral ("fe-lead deferred promoting exam-bank's dialog"); this is the 2nd real consumer, so move (not copy) to `src/components/shared/publish-confirm-dialog/`. Do NOT reuse `destructive-confirm-dialog` — that's a different (negative/destructive) tone, wrong semantics for a positive one-way action. `QBConfirmDialog` = the shared component, used directly. |
| Status chip (DRAFT/PUBLISHED) | `components/shared/status-badge` | Reuse via variant/tone prop if shape matches `LPStatusChip`'s usage; `QBStatusChip` should be a thin wrapper passing `questionBank.status.*` labels — do not fork markup. |
| Empty/skeleton/error states | `components/shared/empty-state`, generic `EduSkeleton`/`EduError` primitives already used by `lesson-plan-list-screen` | Reuse directly; `QBFilterRequiredPrompt` is genuinely distinct (dashed border, own icon/copy) — new component, feature-local (single-screen, no promotion trigger yet). |
| Dropdown filters | `lesson-plan-list-screen/lesson-plan-filter-bar.tsx`'s dropdown pattern | `QBDropdown` can mirror its shape but has 5 filter instances (subject/grade/type/difficulty/status) vs lesson-plan's fewer — keep feature-local for now (not yet a 2nd-screen promotion case beyond lesson-plan's own filter bar, which uses inline selects, not a named `Dropdown` component) unless `fe-component-architect` finds an exact structural match worth extracting. Flag, don't force.

**Files** (`src/features/question-bank/presentation/`):

```
question-bank.query-keys.ts
shared.i-vm.ts

question-bank-list-screen/
  question-bank-list-screen.tsx
  question-bank-list-screen.i-vm.ts
  question-bank-list-screen.stories.tsx
  qb-scope-toggle.tsx
  qb-filter-bar.tsx                 // subject/grade/type/difficulty/status dropdowns + QBDropdown + mandatoryFilterIndicator
  qb-filter-required-prompt.tsx     // QBFilterRequiredPrompt (5th distinct UI state, never folded into emptyFiltered)
  qb-question-card.tsx              // QBQuestionCard (composes QBTypeBadge/QBDifficultyBadge/QBStatusChip)
  qb-type-badge.tsx                 // QBTypeBadge
  qb-difficulty-badge.tsx           // QBDifficultyBadge
  qb-skeleton.tsx

question-bank-builder-screen/
  question-bank-builder-screen.tsx
  question-bank-builder-screen.i-vm.ts
  question-bank-builder-screen.stories.tsx
  use-question-bank-builder.ts      // mirrors use-lesson-plan-builder.ts hook shape
  qb-question-type-selector.tsx     // 3-option segmented control
  qb-meta-grid.tsx                  // subject/grade/difficulty grid (1.4fr 1fr 1fr)
  qb-locked-banner.tsx              // mirrors published-locked-banner.tsx
```

`QBStatusChip`, `QBTagChipsInput`, `QBConfirmDialog` are thin
feature-local wrappers around the promoted shared components (props →
`questionBank.*` i18n labels), not new implementations.

**9 UI states** (spec §5) mapped onto the list/builder pair — `loading`,
`requiredFilterGate` (`QBFilterRequiredPrompt`, DISTINCT 5th state per spec,
never folded into `emptyFiltered`), `emptyAll`, `emptyFiltered`, `error`,
`success`, `form-validation-error`, `locked/read-only`, `publish-confirm`.

**Test first (Red):** Storybook interaction stories per screen covering
all applicable states (list: loading/requiredFilterGate/emptyAll/
emptyFiltered/error/success; builder: loading/success/form-validation-error/
locked/publish-confirm), plus the mandatory-filter-gate behavioral test
(typing a tag flips the indicator + fires after debounce; clearing both
filters reverts to the gate — AC-902.1–.4).

**Done when:** design-review gate ready (states complete, tokens-only,
a11y checklist — NFR-001..004 — satisfied per component).

---

## 5. Routes + Server Actions + i18n

**Routes** (`src/app/[locale]/t/[tenant]/(app)/teacher/question-bank/`):

```
page.tsx + actions.ts                          // list (mine + search)
create/page.tsx + create/actions.ts
[id]/edit/page.tsx + [id]/edit/actions.ts
```

Each `page.tsx` mirrors the `lesson-plan` RSC-seed pattern (seed the first
page server-side, pass Server Action refs for load-more/mutations) **PLUS**
the `requireRole(["teacher"])` guard from §0 item 7 as the FIRST statement,
before any DI call — on `guard.ok === false`, render the screen with an
empty/forbidden VM, never call `makeXUseCase()`. Same guard repeated inside
each Server Action in `actions.ts` (defensive — actions are independently
invocable, NFR-008/AC-901.8 etc.).

`[id]/edit/page.tsx` additionally gates on question visibility exactly like
`lesson-plan`'s edit page: `not-found`/`invalid-cursor`-adjacent →
`redirect(...?notice=not-found)`; `not-visible`/`forbidden-edit` →
`redirect(...?notice=access-denied)` (reusing the 3 distinct 403 copy keys
from below — the list screen's notice banner must be able to show the
specific `forbidden-edit`/`not-visible` copy, not a generic one, since the
list page is where the redirect lands).

**i18n — add to BOTH `messages/vi.json` and `messages/en.json`, same
`questionBank.*` path, before/while building the corresponding state:**

1. `questionBank.empty.clearFilters` — vi: `"Xoá bộ lọc"` / en:
   `"Clear filters"` (spec §8, copied verbatim).
2. `questionBank.errors["forbidden-browse"]` — vi:
   `"Bạn không có quyền tìm kiếm trong kho câu hỏi."` / en: `"You don't have
   permission to search the question bank."`
3. `questionBank.errors["forbidden-edit"]` — vi: `"Bạn không phải là người
   tạo câu hỏi này nên không thể chỉnh sửa."` / en: `"You're not the author
   of this question, so you can't edit it."`
4. `questionBank.errors["not-visible"]` — vi: `"Câu hỏi nháp này không hiển
   thị với bạn."` / en: `"This draft question isn't visible to you."`
5. **New, found this planning pass (§0 item 4):**
   `questionBank.card.unknownAuthor` — vi: `"Giáo viên khác"` / en:
   `"Another teacher"` (search-scope author-attribution fallback, decision
   §0 item 2).

Existing `questionBank.errors.forbidden` (generic) stays as-is, unused by
the new specific mappings — `fe-lead`'s call per spec, not retired this
story. **Do NOT wire `questionBank.errors["expected-answer-required"]`**
to any validation path — it is confirmed dead (FR-007), leave unused.

**Test first (Red):** `actions.test.ts` per route (mirror `lesson-plan`'s
`actions.test.ts` shape) — guard-rejection path (non-teacher role →
`errorKey`/forbidden result, zero DI call asserted), success path, each
relevant failure passthrough. `page.test.ts` for the edit route's
redirect-on-gated-visibility behavior.

**Done when:** `bunx tsc --noEmit` clean (catches any missed i18n key),
route guard test proves rejection precedes any network call.

---

## 6. Component + state sketch (hand-off notes)

**`fe-component-architect`** — needed. Non-trivial tree: 8 named
sub-components (§4) plus 2 promotions out of `lesson-plan` into
`components/shared/` (tag-chips-input, publish-confirm-dialog) that must
land BEFORE or ALONGSIDE `question-bank`'s own components import them (a
sequencing note: promoting `lesson-plan`'s components is itself a small
edit to an already-shipped, merged feature — coordinate as a first small
commit/phase, not bundled invisibly into `question-bank`'s file list, so the
diff is legible and `lesson-plan`'s own Storybook stories still pass after
the move).

**`fe-state-engineer`** — needed. Non-trivial state:
- TanStack Query key hierarchy — propose starting shape (mirrors
  `lessonPlanKeys`, client-side filters NOT in any key since only
  `subjectId`/`tag`/`gradeLevel`/`difficulty` are sometimes real server
  params per the FR-005 split table):
  ```
  questionBankKeys = {
    all: () => ["question-bank"],
    listMineRoot: () => ["question-bank","list","mine"],
    searchRoot: (subjectId?: string, tag?: string) =>
      ["question-bank","search", subjectId ?? null, tag ?? null],
    detail: (id: string) => ["question-bank","detail", id],
  }
  ```
  — note `searchRoot` must NOT include `gradeLevel`/`difficulty` even though
  they're sometimes real server params in subject-mode (FR-005 table), since
  per AC-902.13/.14 those need to visually/functionally differ from a
  cache-fragmenting key; `fe-state-engineer` decides whether they're
  additional key segments (safe, more re-fetches) or purely client-filtered
  over the `(subjectId, tag)`-keyed page (fewer re-fetches, but must not
  misrepresent narrowing per AC-902.13's warning). This is the single most
  important state decision in the story — flag prominently.
- Cache invalidation on create/update/publish (mirrors `revalidatePath` +
  `invalidateQueries` combo already used by `lesson-plan`'s actions).
- RSC↔client boundary for the seeded infinite list — same pattern as
  `lesson-plan-list-screen` (`initialMinePage` seeded server-side,
  `useInfiniteQuery` with `initialData` on the client).
- `already-published` race handling on update/publish — invalidate
  `detail(id)` + relevant list keys, `form.reset()`-equivalent re-render
  from the fresh server value, toast (not banner) — mirrors `lesson-plan`'s
  UC-905/AC-905.6 handling 1:1.
- Filter-change-mid-flight cancellation strategy (§0 item 3) — explicitly
  theirs to decide.

---

## 7. Risks, dependencies, open questions

- **[RISK]** Promoting `lp-tag-chips-input.tsx` and
  `publish-confirm-dialog.tsx` out of `lesson-plan` touches an
  already-merged, already-shipped feature (US-E11.8). Re-run
  `lesson-plan`'s existing Storybook stories + tests after the move to
  confirm zero regression — this is a mandatory verification step of
  Phase 4, not optional cleanup.
- **[RISK]** The `forbidden-browse`/`forbidden-edit` call-site branch is the
  single highest-risk correctness detail in this story (identical wire code,
  two different meanings) — `fe-tech-lead-reviewer` should specifically
  check the mapper signature takes `callSite` as a parameter (not inferred
  from the entity/failure shape) and that each repository method passes the
  correct literal.
- **[OPEN QUESTION]** Whether `gradeLevel`/`difficulty` become part of the
  `search` query key (state-engineer's call, §6) is unresolved here by
  design — do not let it get decided implicitly by whoever writes the query
  hook first.
- **[DEPENDENCY]** None on other in-flight US — `lesson-plan` is already
  merged to `main` (2026-07-17), so the promotion work in Phase 4 operates
  on stable, already-integrated code, not a moving target.
- **[NOTE]** Entity field count: spec.md's own Handoff section (§10) says
  "12 fields" but §6.3's actual field list is 14 — treat §6.3 (the literal
  list) as authoritative; this is a spec self-inconsistency, not a new
  discovery to re-litigate with `ba-lead`, just build the correct 14.
