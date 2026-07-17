# US-E11.9 — Teacher Question Bank — Use Cases & Acceptance Criteria

Inputs read this session: `requirements.md` (TR-119, FR-001..FR-014, NFR-001..008),
`integration.md` (INT-201..INT-206, `QuestionBankFailure` union, §4 mandatory-gate,
§5 secondary-filter split), `design_src/edu/question-bank.jsx` (component names),
`docs/product/design-spec.jsonc` `screens.questionBank` — **confirmed reading the
corrected version**: `builderScreen.expectedAnswerField.required: false` and
`builderScreen.publish.disabledUntil: "body (>=4 chars) — expectedAnswer is NOT a
publish gate"` (both corrected 2026-07-17 per OQ-1). Baked in per ba-lead's settled
facts (not re-litigated as open questions): expectedAnswer optional for all 3 types
(never a publish gate); FR-009 corrected to 4 immutable fields
(questionType/subjectId/gradeLevel/difficulty), not 3; teacher-only role scope for
v1 (principal/admin explicitly out of scope, backlog note only); secondary filters
that lack server support (questionType always; gradeLevel/difficulty in tag-mode;
all filters in scope=mine) are client-side post-filters — flagged as a UX caveat,
not silently presented as full server filtering; `forbidden-browse` vs
`forbidden-edit` rendered as distinct access-denied copy despite the identical wire
code `FORBIDDEN_ACTION`.

---

## 1. Use Case Scope Summary

- **7 use cases** (UC-901..UC-907) covering: list own, search cross-teacher
  (with the mandatory-filter gate as first-class, not folded into empty-state),
  create DRAFT, edit DRAFT, publish (one-way), view PUBLISHED read-only (own or
  cross-teacher), and the route-level role guard.
- **72 acceptance criteria** (AC-901.1..AC-907.x, see §5 coverage list) covering
  loading/empty/error/success for every async UC, the required-filter-prompt as
  a fifth distinct state for search, role-gating, and the split
  `forbidden-browse`/`forbidden-edit` denial copy.
- **1 actor**: `teacher` (author + browser of PUBLISHED cross-teacher content).
  No principal/admin/student/parent AC modeled — see Actor Catalogue for the
  explicit negative statement per settled fact #3.
- **Boundaries**: in scope — list/search/create/edit/publish/locked-view for
  ESSAY/SHORT_ANSWER/FILL_IN questions. Out of scope — MCQ options editor,
  delete, unpublish/revert, any non-teacher UI surface, `src/features/exam-bank`
  and `src/features/lesson-plan` (sibling stories/features).

---

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| **Teacher** | Primary, human | Create/edit/publish own DRAFT questions; list own (DRAFT+PUBLISHED); search cross-teacher PUBLISHED questions (mandatory subjectId-or-tag filter); view any question read-only once PUBLISHED. |
| Principal (MANAGER wire-role) | Secondary, human — **out of scope** | BE `canBrowseBank` technically permits search, but no route/nav/entry point is built in this story (design-spec `roles: ["teacher"]`, route family `/teacher/**`). No AC modeled. Backlog note only (OQ-2, ba-lead to decide). |
| Admin | Secondary, human — **out of scope** | BE permits search; no UI built. No AC modeled. |
| Student | N/A — **explicitly forbidden** | BE `canBrowseBank` hard-forbids (VULN-001 gate). No UI, no route, no nav item — route-level guard rejects before any request (UC-907). |
| Parent | N/A — **explicitly forbidden** | Same as Student. |
| edu-api `core` service (exercisebank sub-domain) | System/secondary | INT-201..INT-206 — search, list-mine, create, read-one, update, publish. |
| Subject-catalogue service | System/secondary | Supplies `subjectId` dropdown options — `[OPEN QUESTION]` per integration.md whether real or mock-first; ba-use-case-modeler treats its loading/error as a nested dependency of the builder form and the search filter bar (AC-903.12, AC-902.13). |

---

## 3. Use Case Catalogue

### UC-901 — List own questions (scope = Của tôi)

- **Primary actor**: Teacher. **Secondary actor**: `core` (INT-202 `GET /questions`).
- **Preconditions**: Authenticated teacher; route `/teacher/question-bank` loaded; scope toggle defaults to `mine`.
- **Main success scenario**:
  1. Teacher lands on `/teacher/question-bank` (or switches scope to `mine`).
  2. System calls `GET /questions` with `{cursor, limit}` only.
  3. System shows skeleton rows (count=4) while in flight.
  4. Response returns; system renders own DRAFT+PUBLISHED questions as row cards (type badge, difficulty badge, status chip, subject/grade, truncated body, tags — no author attribution, own scope).
  5. Teacher may apply client-side-only secondary filters (questionType/difficulty/gradeLevel/status) that narrow the already-fetched page(s).
- **Alternative flows**:
  - A1 — Own list has zero questions at all → `emptyAll` state (icon `clipboardList`, CTA "Tạo câu hỏi mới").
  - A2 — Own list has items but a client-side secondary filter yields zero → `emptyFiltered` state (icon `search`, CTA "Bỏ lọc" — distinct copy from A1).
  - A3 — Teacher scrolls/loads more; `useInfiniteQuery` fetches the next raw page and re-applies the active client-side filter across the accumulated set (per integration.md §"Caveat for client-side filtering").
- **Exception flows**:
  - E1 — `403 FORBIDDEN_ACTION` (non-TEACHER wire-role reaches the call somehow) → `forbidden-browse` variant → full-page access-denied state (defensive; should be unreachable given UC-907's route guard).
  - E2 — network/5xx → generic error banner + retry (retryable).
- **Business rules**: No mandatory filter for scope=mine (BR-901.1). Status/questionType/difficulty/gradeLevel filters here are 100% client-side post-filters — the server has zero query-param support for them (BR-901.2, ground-truthed `ListMyQuestions` handler).
- **Non-functional constraints**: NFR-006 (skeleton ≤100ms), NFR-005 (single-column, no break at 320px).

### UC-902 — Search cross-teacher PUBLISHED questions (scope = Tìm kiếm), incl. mandatory-filter gate

- **Primary actor**: Teacher. **Secondary actor**: `core` (INT-201 `GET /questions/search`).
- **Preconditions**: Authenticated teacher; scope toggle switched to `search`.
- **Main success scenario**:
  1. Teacher switches scope to `search`.
  2. System renders `QBFilterRequiredPrompt` immediately (no request fired) because neither `subjectId` nor `tag` is set yet — **this is the expected first landing state**, not an error or empty-state.
  3. Teacher selects a subject and/or types a tag; the `mandatoryFilterIndicator` flips to satisfied (icon `check`, success tone) the instant either condition is true.
  4. System fires `GET /questions/search` with the satisfied filter(s) (+ optional `gradeLevel`/`difficulty`/`cursor`/`limit`), debounced 300–400ms for the free-text field (FR-013).
  5. Skeleton rows show while in flight; success renders PUBLISHED-only cards with author attribution.
- **Alternative flows**:
  - A1 — Teacher clears both `subjectId` and `tag` after a successful search → system reverts to `QBFilterRequiredPrompt` (indicator flips back to unsatisfied, icon `alertTriangle`, warning tone) and does not re-fire a request.
  - A2 — Filter satisfied but zero results → `emptyFiltered` (icon `search`, CTA "Bỏ lọc"), distinct from the required-filter-prompt state.
  - A3 — Teacher satisfies the gate via `tag` (not `subjectId`) and also sets `gradeLevel`/`difficulty` → those two refinements are silently ignored server-side (by-tag partition path does not read them); system should not claim they narrowed results — treat as unresolved UX gap, flagged to `ba-spec-writer`/fe (see edge-case matrix row).
  - A4 — Teacher satisfies the gate via `subjectId` and also sets `gradeLevel`/`difficulty` → both refinements DO apply server-side (by-subject partition path).
- **Exception flows**:
  - E1 — Defense-in-depth: BE somehow still returns `422 QUESTION_SEARCH_FILTER_REQUIRED` despite the client gate (stale state, race) → maps to the SAME `QBFilterRequiredPrompt`, never a generic error banner.
  - E2 — `403 FORBIDDEN_ACTION` (role gate `canBrowseBank` denies caller) → `forbidden-browse` variant → full-page access-denied banner, explicitly NOT an empty result (defensive; unreachable in practice given UC-907's guard).
  - E3 — `400 QUESTION_INVALID_SUBJECT_ID`/`QUESTION_INVALID_DIFFICULTY`/`QUESTION_INVALID_CURSOR` → generic error banner (malformed client-built query; should not occur if dropdowns are enum-constrained).
  - E4 — network/5xx → generic error banner + retry.
- **Business rules**: BR-902.1 — mandatory-filter gate is satisfied by `subjectId != "all"` OR non-empty `tag`; both being unset/empty always renders `QBFilterRequiredPrompt`, never a request. BR-902.2 — `questionType` has zero server support in search; always client-side post-filter. BR-902.3 — `gradeLevel`/`difficulty` only take server effect when `subjectId` is the satisfying filter.
- **Non-functional constraints**: NFR-003 (mandatory-filter indicator icon+text), NFR-001 (contrast), FR-013 (debounce).

### UC-903 — Create DRAFT question

- **Primary actor**: Teacher. **Secondary actor**: `core` (INT-203 `POST /questions`), subject-catalogue service (dropdown source).
- **Preconditions**: Authenticated teacher; route `/teacher/question-bank/create`.
- **Main success scenario**:
  1. Teacher opens the create route; the 3-option questionType segmented selector defaults to none selected (or a sensible default — not prescribed here) with no MCQ option.
  2. Teacher selects `questionType`; body/expectedAnswer row counts and placeholder copy update per type (body: 6/ESSAY,4/SHORT_ANSWER,3/FILL_IN rows; expectedAnswer: 4/ESSAY,2/SHORT_ANSWER,2/FILL_IN rows).
  3. Teacher fills `subjectId`, `gradeLevel`, `difficulty`, `body` (>=4 chars), optionally `expectedAnswer`, optionally up to 10 tags (each <=50 chars).
  4. Teacher submits; submit button shows `aria-busy` + spinner while `POST /questions` is in flight.
  5. On success: question saved as DRAFT (`publishedAt: null`); system navigates to the edit/detail view (or back to list) with a success toast.
- **Alternative flows**:
  - A1 — Teacher leaves `expectedAnswer` blank for ANY questionType → save succeeds (FR-007; NOT a validation error, NOT a publish blocker later).
  - A2 — Teacher picks `FILL_IN` with a very short body (exactly 4 chars) → passes the client-side min; save succeeds.
- **Exception flows**:
  - E1 — `body` empty on submit → inline error, maps to `body-required` (client pre-validates `>=4 chars`, so a round-trip `400 QUESTION_BODY_REQUIRED` is defense-in-depth only).
  - E2 — `body` > 5000 chars → inline error `body-too-long`.
  - E3 — >10 tags or a tag >50 chars → inline error `tag-limit-exceeded`/`tag-too-long` on the tag-chips input.
  - E4 — `422 QUESTION_TYPE_NOT_SUPPORTED` (MCQ or unsupported type reaches BE) → inline error on the questionType selector — defensive only, since the selector itself excludes MCQ (belt-and-suspenders per settled fact).
  - E5 — `404 SUBJECT_NOT_FOUND` (subject archived/deleted between dropdown load and submit) → inline error on the subject selector ("subject no longer exists") + consider refetching the subject list.
  - E6 — `403 FORBIDDEN_ACTION` (non-teacher somehow reaches submit) → `forbidden-browse` → access-denied (defensive, unreachable given route guard).
  - E7 — network/5xx → generic error banner, form state preserved for retry (retryable).
  - E8 — subject-catalogue dropdown fails to load → dropdown shows its own error/retry affordance; form remains usable for other fields but cannot submit without a valid `subjectId`.
- **Business rules**: BR-903.1 — `expectedAnswer` is never required, for any type (settled fact #1). BR-903.2 — `questionType`/`subjectId`/`gradeLevel`/`difficulty` become immutable the instant the question is created (feeds UC-904).
- **Non-functional constraints**: NFR-002 (keyboard-operable segmented selector, `aria-describedby` inline errors), NFR-007 (i18n, no new keys expected).

### UC-904 — Edit own DRAFT question

- **Primary actor**: Teacher (must be `authorId`). **Secondary actor**: `core` (INT-204 read, INT-205 update).
- **Preconditions**: Question exists, `status = DRAFT`, caller is the author.
- **Main success scenario**:
  1. Teacher opens `/teacher/question-bank/:id/edit`; system fetches the question (skeleton detail card while in flight).
  2. Form renders with `questionType`/`subjectId`/`gradeLevel`/`difficulty` **read-only/disabled** (all four — corrected per settled fact #2) and `body`/`expectedAnswer`/`tags` editable.
  3. Teacher edits `body`/`expectedAnswer`/`tags`; submits; system calls `PUT /:id` with only `{body, expectedAnswer, tags}` — never sends the locked fields.
  4. On success: question updates, `updatedAt` refreshed, form re-renders with the new values (locked fields unchanged).
- **Alternative flows**:
  - A1 — Teacher clears `expectedAnswer` entirely on an existing question that had one → save succeeds (still optional on update).
  - A2 — Teacher removes all tags → save succeeds (tags optional).
- **Exception flows**:
  - E1 — `404 QUESTION_NOT_FOUND` (or `400 QUESTION_INVALID_ID`) → full-page not-found state.
  - E2 — `403 QUESTION_NOT_VISIBLE` (single-GET visibility gate, e.g. DRAFT belonging to another teacher, reached via a stale/shared link) → full-page access-denied, copy distinct from E3 ("this draft isn't visible to you").
  - E3 — `403 FORBIDDEN_ACTION` on the PUT itself (caller is not the author — ownership check) → `forbidden-edit` variant → access-denied, copy "you're not the author of this question" (distinct from `forbidden-browse`).
  - E4 — `422 QUESTION_ALREADY_PUBLISHED` (race — question published in another tab/session between load and submit) → system refreshes to the locked/read-only PUBLISHED view (UC-906) + informational toast, does NOT show a destructive red error banner.
  - E5 — `body` validation errors (`body-required`/`body-too-long`) → inline field errors, same as create.
  - E6 — tag validation errors (`tag-limit-exceeded`/`tag-too-long`) → inline field errors.
  - E7 — network/5xx → generic error banner, form state preserved.
- **Business rules**: BR-904.1 — `questionType`/`subjectId`/`gradeLevel`/`difficulty` are ALWAYS read-only on this screen regardless of any other state (ground-truthed: `UpdateQuestionRequest` has no fields for them). BR-904.2 — attempting to edit a PUBLISHED question is prevented client-side by routing to the locked view (UC-906) instead of this form; the 422 in E4 is the server-side backstop for the race case only.
- **Non-functional constraints**: NFR-002 (disabled-field semantics still keyboard-navigable/announced as disabled, not just visually greyed).

### UC-905 — Publish DRAFT → PUBLISHED (one-way, irreversible)

- **Primary actor**: Teacher (must be `authorId`). **Secondary actor**: `core` (INT-206 `PUT /:id/publish`).
- **Preconditions**: Question `status = DRAFT`, caller is the author, `body` valid (>=4 chars) — `expectedAnswer` is NEVER a gate.
- **Main success scenario**:
  1. Teacher clicks the Publish CTA (enabled once `body` is valid, regardless of `expectedAnswer`).
  2. System opens a confirm dialog stating the action is irreversible (no unpublish/revert exists at the BE).
  3. Teacher confirms; dialog CTA shows spinner while `PUT /:id/publish` is in flight; dialog does NOT auto-close during this.
  4. On success: `status → PUBLISHED`, `publishedAt` set; dialog closes; screen transitions to the locked/read-only view (UC-906) with a success toast.
- **Alternative flows**:
  - A1 — Teacher cancels the confirm dialog → no request fires, question remains DRAFT and editable.
- **Exception flows**:
  - E1 — `422 QUESTION_ALREADY_PUBLISHED` (duplicate click / already published in another tab) → treated as benign, NOT a red error banner — refresh to the locked/PUBLISHED view + informational toast "already published."
  - E2 — `403 FORBIDDEN_ACTION` (not the author) → `forbidden-edit` variant → access-denied, same copy family as UC-904 E3.
  - E3 — `404 QUESTION_NOT_FOUND`/`400 QUESTION_INVALID_ID` → full-page not-found.
  - E4 — network/5xx mid-publish → generic error banner INSIDE the still-open dialog (dialog re-offers retry, does not silently close — teacher must know whether the irreversible action actually happened before dismissing).
- **Business rules**: BR-905.1 — publish is enabled by `body` validity alone; `expectedAnswer` never blocks it (settled fact #1, corrected design-spec `publish.disabledUntil`). BR-905.2 — publish has no undo; the confirm dialog copy must say so explicitly.
- **Non-functional constraints**: NFR-004 (dialog fade-in gated behind `prefers-reduced-motion`).

### UC-906 — View a PUBLISHED question read-only (own or cross-teacher)

- **Primary actor**: Teacher. **Secondary actor**: `core` (INT-204 `GET /:id`).
- **Preconditions**: Question `status = PUBLISHED` (own, reached via list/edit-route redirect, OR cross-teacher, reached via search-result detail).
- **Main success scenario**:
  1. Teacher opens a PUBLISHED question (own via `/teacher/question-bank/:id/edit`, which detects PUBLISHED and renders locked; or cross-teacher via a search-result "Xem chi tiết" action).
  2. System fetches the question (skeleton detail card while in flight).
  3. System renders ALL fields read-only/disabled, a locked banner, and only a back/close action — no Save/Publish CTA anywhere.
- **Alternative flows**: none (this is inherently a terminal, read-only state — no write path exists from here).
- **Exception flows**:
  - E1 — `404 QUESTION_NOT_FOUND`/`400 QUESTION_INVALID_ID` → full-page not-found.
  - E2 — `403 QUESTION_NOT_VISIBLE` (should not normally occur for PUBLISHED content viewed via search, since PUBLISHED is visible to TEACHER/MANAGER/ADMIN; defensive mapping still required) → access-denied, "not visible" copy.
  - E3 — network/5xx → generic error banner + retry.
- **Business rules**: BR-906.1 — no delete, no unpublish, no edit CTA ever renders here (FR-011/FR-012). BR-906.2 — the Edit/Publish CTA on the underlying list/detail card is HIDDEN (not merely disabled) for cross-teacher PUBLISHED questions using the client-side `authorId === current memberId` comparison as a UX nicety — this is not a substitute for the server-side ownership check.
- **Non-functional constraints**: none beyond baseline a11y/skeleton.

### UC-907 — Route-level teacher-only guard

- **Primary actor**: System (route guard). **Secondary actors**: Student, Parent (negative case), Teacher (positive case).
- **Preconditions**: Any request to `/teacher/question-bank`, `/teacher/question-bank/create`, or `/teacher/question-bank/:id/edit`.
- **Main success scenario**: Teacher role → route renders normally, proceeds to UC-901/902/903/904/906 as applicable.
- **Alternative flows**: none.
- **Exception flows**:
  - E1 — Student or parent role reaches any of the three routes (direct URL entry, stale bookmark, deep link) → route guard rejects BEFORE any request fires (no skeleton flash, no API call) → renders an access-denied/not-found treatment consistent with the rest of the app's role-gating pattern (no question-bank nav item is ever shown to these roles either).
  - E2 — Principal/admin role reaches the routes → same rejection as E1 for THIS story (out of scope; BE would technically allow search, but no client entry point exists — see OQ-2 backlog note, not built here).
- **Business rules**: BR-907.1 — client-side role gate must precede any network call (NFR-008) — do not rely solely on a BE 403 as the only gate, since that would flash a loading state before denial.
- **Non-functional constraints**: NFR-008 (route guard rejects non-teacher before any request fires; zero role-gating bypass in RBAC test).

---

## 4. Acceptance Criteria

### UC-901 — List own questions

```
AC-901.1 Loading — Given the teacher opens /teacher/question-bank with scope=mine,
  When GET /questions is in flight, Then EduSkeleton (variant=rows, count=4) renders
  within <=100ms of the trigger, no blank flash.
AC-901.2 Success — Given GET /questions returns >=1 item, When the response resolves,
  Then each row card shows type badge, difficulty badge, status chip (DRAFT=warning/
  PUBLISHED=success), subject chip, grade, 140-char-truncated body, tag pills, and NO
  author attribution (own scope).
AC-901.3 Empty (no questions ever) — Given GET /questions returns zero items with no
  client filter active, When the response resolves, Then the emptyAll state renders
  (icon clipboardList, CTA "Tạo câu hỏi mới" → navigates to /teacher/question-bank/create).
AC-901.4 Empty (filtered) — Given own questions exist but a client-side secondary
  filter (questionType/difficulty/gradeLevel/status) yields zero matches, When the
  filter is applied, Then emptyFiltered renders (icon search, CTA "Bỏ lọc"), copy
  distinct from AC-901.3.
AC-901.5 Error — Given GET /questions returns network/5xx, When the request fails,
  Then a generic error banner + retry action renders; retry re-issues the request.
AC-901.6 Client-side secondary filter — Given the teacher sets status=DRAFT while
  scope=mine, When applied, Then only DRAFT rows from the already-fetched page(s)
  show, and NO server request re-fires with a status query param (BE has none).
AC-901.7 Load-more with active filter — Given a client-side filter is active and the
  teacher scrolls to load more, When useInfiniteQuery fetches the next raw page,
  Then the filter re-applies across the accumulated set (not just the new page),
  and the visible count may be less than the raw page size without implying an error.
AC-901.8 Defensive role gate — Given a non-teacher caller somehow reaches this call,
  When 403 FORBIDDEN_ACTION returns, Then forbidden-browse renders full-page
  access-denied, not an empty result.
```

### UC-902 — Search cross-teacher + mandatory-filter gate

```
AC-902.1 Required-filter-prompt (landing) — Given the teacher switches scope to
  Tìm kiếm with no subjectId/tag set, When the scope switch completes, Then
  QBFilterRequiredPrompt renders (dashed-border card, icon=search, i18n keys
  questionBank.requiredFilterPrompt.title/body) and NO GET /questions/search
  request fires — this state is DISTINCT from emptyFiltered/emptyAll.
AC-902.2 Gate satisfied via subject — Given scope=search and no filter set, When
  the teacher selects a non-"all" subjectId, Then the mandatoryFilterIndicator
  flips to satisfied (icon check, questionBank.filter.mandatorySatisfied,
  success tone) synchronously, and a search request fires.
AC-902.3 Gate satisfied via tag — Given scope=search and no filter set, When the
  teacher types a non-empty tag, Then the indicator flips to satisfied and a
  search request fires after a 300-400ms debounce with no further keystrokes.
AC-902.4 Gate re-imposed on clear — Given a satisfied search with results shown,
  When the teacher clears both subjectId (back to "all") and the tag field,
  Then the view reverts to QBFilterRequiredPrompt (indicator back to unsatisfied,
  icon alertTriangle, questionBank.filter.mandatoryRequired) and no further
  request fires until re-satisfied.
AC-902.5 Loading — Given the gate is satisfied and the request is in flight,
  Then EduSkeleton (rows, count=4) renders.
AC-902.6 Success — Given results return, Then each card additionally shows author
  attribution (scope=search only) alongside the same badges as AC-901.2, and all
  results are status=PUBLISHED only.
AC-902.7 Empty (filtered) — Given the gate is satisfied but zero PUBLISHED
  questions match, Then emptyFiltered renders (icon search, CTA "Bỏ lọc") —
  distinct from AC-902.1's required-filter-prompt.
AC-902.8 Defense-in-depth 422 — Given the client gate is somehow bypassed (stale
  state/regression) and the BE still returns 422 QUESTION_SEARCH_FILTER_REQUIRED,
  Then the SAME QBFilterRequiredPrompt renders — NOT a generic error banner.
AC-902.9 Forbidden-browse — Given a 403 FORBIDDEN_ACTION returns from the
  canBrowseBank role gate, Then forbidden-browse access-denied renders (full page,
  not an empty result) — defensive, expected unreachable given UC-907.
AC-902.10 Malformed-query error — Given a 400 QUESTION_INVALID_SUBJECT_ID/
  QUESTION_INVALID_DIFFICULTY/QUESTION_INVALID_CURSOR returns, Then a generic
  error banner renders (should not occur if dropdowns are enum-constrained).
AC-902.11 Network error — Given network/5xx, Then generic error banner + retry.
AC-902.12 questionType has no server filter — Given scope=search, When the teacher
  sets the typeDropdown to ESSAY, Then filtering happens 100% client-side over the
  already-fetched result set — no questionType query param is ever sent (no such
  param exists server-side).
AC-902.13 gradeLevel/difficulty tag-mode caveat — Given the gate is satisfied via
  tag (not subjectId) and the teacher also sets gradeLevel and/or difficulty,
  Then those two refinements do NOT affect the server-returned result set (by-tag
  partition path ignores them) — the UI must not present them as having narrowed
  results in this combination; flagged as a known UX caveat for ba-spec-writer/fe,
  not silently misrepresented as full filtering.
AC-902.14 gradeLevel/difficulty subject-mode — Given the gate is satisfied via
  subjectId and the teacher also sets gradeLevel and/or difficulty, Then both DO
  narrow the server-returned result set (by-subject partition path honors them).
AC-902.15 Subject dropdown load failure — Given the subject-catalogue lookup for
  the subjectId dropdown fails, Then the dropdown shows its own error/retry
  affordance, and the tag field remains a usable alternate path to satisfy the gate.
```

### UC-903 — Create DRAFT question

```
AC-903.1 Type selector, no MCQ — Given the teacher opens the create route, Then
  the questionType segmented selector shows exactly 3 options (ESSAY/SHORT_ANSWER/
  FILL_IN) with icons scrollText/edit/list — no MCQ option is rendered.
AC-903.2 Per-type field shape (ESSAY) — Given questionType=ESSAY, Then body has 6
  rows with ESSAY placeholder copy, expectedAnswer has 4 rows with ESSAY placeholder
  copy.
AC-903.3 Per-type field shape (SHORT_ANSWER) — Given questionType=SHORT_ANSWER,
  Then body has 4 rows, expectedAnswer has 2 rows, each with SHORT_ANSWER
  placeholder copy.
AC-903.4 Per-type field shape (FILL_IN) — Given questionType=FILL_IN, Then body has
  3 rows, expectedAnswer has 2 rows, each with FILL_IN placeholder copy, and the
  FILL_IN-only body hint text shows.
AC-903.5 expectedAnswer optional — ESSAY — Given questionType=ESSAY, body valid,
  expectedAnswer left blank, When the teacher submits, Then the question saves as
  DRAFT successfully — NOT a validation error.
AC-903.6 expectedAnswer optional — SHORT_ANSWER — same as AC-903.5 for
  questionType=SHORT_ANSWER.
AC-903.7 expectedAnswer optional — FILL_IN — same as AC-903.5 for
  questionType=FILL_IN.
AC-903.8 body required — Given body is empty, When the teacher submits, Then an
  inline error renders on the body field (body-required) and the field remains
  focused/focusable via keyboard; submit does not fire the API call.
AC-903.9 body min length — Given body is 1-3 chars, When the teacher submits, Then
  the client-side min-4 rule blocks submit with an inline error (UX floor, not a
  literal BE code — BE only enforces "required" + max).
AC-903.10 body max length — Given body exceeds 5000 chars (BE round-trip case, or
  client mirrors the same cap), Then inline error body-too-long renders.
AC-903.11 tag limit — Given the teacher adds an 11th tag, When attempted, Then the
  input blocks the 11th tag client-side with inline copy indicating the 10-tag cap
  (tag-limit-exceeded family) — a round-trip 422 is defense-in-depth only.
AC-903.12 tag length — Given a tag exceeds 50 chars, Then inline error
  tag-too-long renders, identifying which tag if determinable client-side.
AC-903.13 MCQ defense-in-depth — Given a 422 QUESTION_TYPE_NOT_SUPPORTED
  round-trips despite the selector excluding MCQ, Then an inline error renders on
  the questionType selector (belt-and-suspenders; should be unreachable in normal
  use since MCQ cannot be selected).
AC-903.14 Subject archived mid-flow — Given 404 SUBJECT_NOT_FOUND returns on
  submit, Then an inline error renders on the subject selector ("subject no
  longer exists/archived").
AC-903.15 Loading — Given the teacher submits a valid form, Then the submit button
  shows aria-busy=true + spinner, and is disabled to prevent double-submit, while
  POST /questions is in flight.
AC-903.16 Success — Given POST /questions succeeds, Then the question saves as
  DRAFT (publishedAt=null), and the teacher is navigated to the edit/detail view
  (or list) with a success toast.
AC-903.17 Network error — Given network/5xx on submit, Then a generic error banner
  renders and all entered form field values are preserved (not cleared) for retry.
AC-903.18 Forbidden defensive — Given 403 FORBIDDEN_ACTION returns (non-teacher
  reaches submit), Then forbidden-browse access-denied renders (defensive,
  unreachable given the route guard).
```

### UC-904 — Edit own DRAFT question

```
AC-904.1 Immutable fields locked (4, not 3) — Given the teacher opens the edit
  route for a DRAFT question they authored, Then questionType, subjectId,
  gradeLevel, AND difficulty all render read-only/disabled (corrected per
  ground-truthed UpdateQuestionRequest — difficulty is immutable, not editable);
  body, expectedAnswer, tags render editable.
AC-904.2 Loading — Given the edit route is opened, Then a skeleton detail card
  renders while GET /:id is in flight.
AC-904.3 Success save — Given the teacher edits body/expectedAnswer/tags and
  submits, When PUT /:id succeeds, Then the form re-renders with the updated
  values, updatedAt refreshed, and only {body, expectedAnswer, tags} were sent in
  the request body (never questionType/subjectId/gradeLevel/difficulty).
AC-904.4 expectedAnswer clearable — Given an existing question has a non-empty
  expectedAnswer, When the teacher clears it entirely and submits, Then the save
  succeeds (still optional on update).
AC-904.5 Not-found — Given 404 QUESTION_NOT_FOUND or 400 QUESTION_INVALID_ID,
  Then a full-page not-found state renders.
AC-904.6 Not-visible (distinct from forbidden-edit) — Given 403
  QUESTION_NOT_VISIBLE on the initial GET (e.g. stale link to another teacher's
  DRAFT), Then a full-page access-denied state renders with copy "this draft
  isn't visible to you" — visually/textually distinct from AC-904.7.
AC-904.7 Forbidden-edit (ownership, distinct from forbidden-browse) — Given 403
  FORBIDDEN_ACTION on the PUT itself (caller is not the authorId), Then a
  full-page access-denied state renders with copy "you're not the author of this
  question" — distinct wording from forbidden-browse's search-role-gate copy,
  despite the identical wire code.
AC-904.8 Already-published race — Given 422 QUESTION_ALREADY_PUBLISHED returns on
  submit (published elsewhere between load and submit), Then the screen refreshes
  to the locked/read-only PUBLISHED view (UC-906) with an informational toast —
  NOT a red destructive error banner.
AC-904.9 body validation — same inline-error behavior as AC-903.8/9/10, scoped to
  the edit form.
AC-904.10 tag validation — same inline-error behavior as AC-903.11/12, scoped to
  the edit form.
AC-904.11 Network error — Given network/5xx on submit, Then generic error banner
  + all form values preserved.
AC-904.12 Keyboard/disabled semantics — Given the 4 locked fields render disabled,
  Then they are still reachable in the reading tab order and announced as
  disabled (not simply visually greyed with no ARIA signal) — NFR-002.
```

### UC-905 — Publish (one-way)

```
AC-905.1 Enabled purely on body validity — Given a DRAFT question with a valid
  body (>=4 chars) and an EMPTY expectedAnswer, Then the Publish CTA is enabled
  (expectedAnswer never gates publish — corrected design-spec).
AC-905.2 Confirm dialog irreversibility copy — Given the teacher clicks Publish,
  Then a confirm dialog opens stating explicitly that the action is irreversible
  (no unpublish/revert exists).
AC-905.3 Cancel — Given the confirm dialog is open, When the teacher cancels,
  Then no request fires and the question remains DRAFT/editable.
AC-905.4 Loading — Given the teacher confirms, Then the dialog's confirm CTA
  shows aria-busy + spinner while PUT /:id/publish is in flight; the dialog does
  NOT auto-close during this.
AC-905.5 Success — Given the publish call succeeds, Then status becomes
  PUBLISHED, publishedAt is set, the dialog closes, and the screen transitions to
  the locked/read-only view (UC-906) with a success toast.
AC-905.6 Already-published (benign) — Given 422 QUESTION_ALREADY_PUBLISHED
  returns (duplicate click / already published in another tab), Then the UI
  refreshes to the locked/PUBLISHED view with an informational toast "already
  published" — explicitly NOT rendered as a red error banner.
AC-905.7 Forbidden-edit — Given 403 FORBIDDEN_ACTION returns (not the author),
  Then forbidden-edit access-denied renders, same copy family as AC-904.7.
AC-905.8 Not-found — Given 404 QUESTION_NOT_FOUND/400 QUESTION_INVALID_ID, Then
  full-page not-found renders.
AC-905.9 Network error mid-publish — Given network/5xx while the publish call is
  in flight, Then a generic error banner renders INSIDE the still-open dialog,
  offering retry — the dialog does NOT silently close, so the teacher is never
  left uncertain whether the irreversible action occurred.
```

### UC-906 — View PUBLISHED read-only

```
AC-906.1 Loading — Given a PUBLISHED question is opened (own edit route or
  cross-teacher search detail), Then a skeleton detail card renders while GET /:id
  is in flight.
AC-906.2 Success — Given the fetch succeeds, Then ALL fields render read-only/
  disabled, a locked banner shows (questionBank lockedNotice.* keys), and no
  Save/Publish CTA renders anywhere on the screen — only a back/close action.
AC-906.3 Not-found — Given 404 QUESTION_NOT_FOUND/400 QUESTION_INVALID_ID, Then
  full-page not-found renders.
AC-906.4 Not-visible (defensive) — Given 403 QUESTION_NOT_VISIBLE returns (should
  not normally occur for PUBLISHED content), Then access-denied "not visible"
  copy renders.
AC-906.5 Network error — Given network/5xx, Then generic error banner + retry.
AC-906.6 Edit CTA hidden for non-owned PUBLISHED — Given a search-result card for
  a PUBLISHED question NOT authored by the current teacher, Then no Edit CTA is
  rendered on the card (only "Xem chi tiết") — hidden client-side via
  authorId === current memberId comparison, understood as a UX nicety only, not a
  substitute for the server-side ownership check.
```

### UC-907 — Route-level role guard

```
AC-907.1 Teacher access — Given an authenticated teacher navigates to
  /teacher/question-bank (or /create or /:id/edit), Then the route renders
  normally with no denial.
AC-907.2 Student/parent blocked before request — Given a student or parent role
  navigates directly to any of the three routes (URL entry, bookmark, deep link),
  Then the route guard rejects BEFORE any network request fires (no skeleton
  flash, no API call), and no question-bank nav item is ever shown to these
  roles in the first place.
AC-907.3 Principal/admin — out of scope — Given a principal or admin role
  navigates to any of the three routes, Then the same rejection as AC-907.2
  applies for this story (no client entry point exists here; BE-level
  permissiveness for MANAGER/ADMIN search is a backlog decision, not built).
AC-907.4 Guard precedes BE 403 — Given the client-side guard is bypassed by a
  regression, Then a defensive 403 FORBIDDEN_ACTION mapping still exists (see
  AC-901.8/AC-902.9/AC-903.18) so a bypass never results in a silent
  loading-state hang or an unhandled crash.
```

---

## 5. Edge Case Matrix

| Feature / UC | Empty | Max-length / boundary | Concurrent / race | Auth-expired | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| List own (UC-901) | AC-901.3 emptyAll; AC-901.4 emptyFiltered | n/a (read path) | Load-more while a filter is active mid-scroll (AC-901.7) | Handled by hybrid refresh (decision 0018), out of this story's AC scope — 401 retried transparently by the http client interceptor, not a question-bank-specific state | AC-901.5 | AC-901.8 forbidden-browse (defensive) |
| Search (UC-902) | AC-902.1 requiredFilterPrompt (no filter); AC-902.7 emptyFiltered (filter satisfied, zero results) | Tag field at 1 char (still satisfies gate — no min-length gate on tag) | Clearing filters while a search is in flight (debounce race) — the in-flight request's response should be discarded/ignored if the gate becomes unsatisfied before it resolves (flagged UX nuance, not silently prescribed) | Same as above (out of scope) | AC-902.11 | AC-902.9 forbidden-browse (defensive) |
| Create (UC-903) | n/a | body exactly 4 chars (min boundary, passes); body exactly 5000 chars (max boundary, passes); 5001 chars (fails, AC-903.10); 10 tags (passes); 11th tag (blocked, AC-903.11); tag exactly 50 chars (passes); 51 chars (fails, AC-903.12) | Subject deleted/archived between dropdown load and submit → 404 SUBJECT_NOT_FOUND (AC-903.14) | Same as above (out of scope) | AC-903.17, form state preserved | AC-903.18 forbidden-browse (defensive) |
| Edit DRAFT (UC-904) | n/a | expectedAnswer cleared to empty (passes, AC-904.4); body/tag boundaries same as create | Published in another tab between GET and PUT → 422 already-published (AC-904.8), non-owner reaches PUT via stale link → forbidden-edit (AC-904.7) | Same as above (out of scope) | AC-904.11 | AC-904.6 not-visible vs AC-904.7 forbidden-edit — two DISTINCT wrong-role/wrong-owner outcomes, both must render differently |
| Publish (UC-905) | n/a | expectedAnswer empty at publish time (never blocks, AC-905.1) | Double-click Publish (two concurrent PUT /:id/publish calls) → second resolves to already-published, benign (AC-905.6); network drop mid-publish leaves dialog open for retry, teacher must not be left unsure if it succeeded (AC-905.9) | Same as above (out of scope) | AC-905.9 (dialog stays open, does not silently close) | AC-905.7 forbidden-edit |
| Locked view (UC-906) | n/a | n/a | Question published by author exactly as another teacher opens the search-result detail view (benign — GET /:id simply returns PUBLISHED) | Same as above (out of scope) | AC-906.5 | AC-906.4 not-visible (defensive) |
| Route guard (UC-907) | n/a | n/a | n/a | Same as above (out of scope) | n/a | AC-907.2 (student/parent), AC-907.3 (principal/admin, out of scope) |
| Secondary filters (cross-cutting, UC-901/902) | n/a | questionType filter always client-side (AC-902.12); gradeLevel/difficulty client-side in scope=mine always, and in scope=search only when the gate is satisfied via tag not subjectId (AC-902.13/14) | Filter change while a request is in flight — the UI should reflect the LATEST filter state, discarding a stale in-flight response if filters changed before it resolved (flagged UX nuance) | n/a | n/a | n/a |

---

## 6. Open Questions

Carried forward from `requirements.md`/`integration.md` (not re-litigated, but
listed here per the format contract so `ba-spec-writer`'s traceability matrix can
link AC to them where relevant):

- `[OPEN QUESTION]` **OQ-1 status**: already resolved this session by ba-lead's
  design-spec correction (`expectedAnswerField.required:false`,
  `publish.disabledUntil` no longer names expectedAnswer) — AC above bake this in
  as settled. No further action needed from `ba-spec-writer` beyond citing the
  correction.
- `[OPEN QUESTION]` **OQ-2 (principal/admin scope)** — carried, unresolved: should
  a principal (MANAGER wire-role, BE-permitted via `canBrowseBank`) get any
  question-bank entry point in a future story? UC-907/AC-907.3 model the CURRENT
  teacher-only decision as a hard boundary for this story; no AC assumes a future
  principal surface.
- `[OPEN QUESTION]` **Subject dropdown data source** (integration.md §9) — is
  `SUBJECT_CATALOGUE_EP` real or still mock-first? AC-903 (subject selector) and
  AC-902.15 (dropdown load failure) are written generically enough to hold either
  way, but the actual wiring decision affects whether AC-902.15/AC-903's subject-
  load-error path is reachable via a real endpoint or only via the dev mock toggle.
- `[OPEN QUESTION]` **`authorId` → display-name resolution** for search-scope
  cards (integration.md §9) — AC-902.6 assumes author attribution renders, but the
  exact resolution mechanism (single lookup vs batch-by-id) is unresolved; if a
  batch lookup doesn't exist, AC-902.6 may need a loading/fallback sub-state
  (e.g. show `authorId` truncated or a generic "another teacher" label while
  resolving) — flagging to `ba-spec-writer`/`fe-lead` to decide the fallback copy,
  not fabricated here.
- `[OPEN QUESTION]` **Filter-change-mid-flight race** (edge-case matrix, both
  UC-901 and UC-902) — whether an in-flight request's response is discarded when
  filters change before it resolves is a component/state-management decision
  (`fe-state-engineer`'s call, e.g. TanStack Query's built-in request
  de-duplication/cancellation), not prescribed as a specific AC number here —
  flagged so it isn't silently dropped.

---

## AC-ID Coverage List (for `ba-spec-writer` traceability matrix)

| UC | AC range | Count |
| --- | --- | --- |
| UC-901 List own | AC-901.1 – AC-901.8 | 8 |
| UC-902 Search + mandatory gate | AC-902.1 – AC-902.15 | 15 |
| UC-903 Create DRAFT | AC-903.1 – AC-903.18 | 18 |
| UC-904 Edit DRAFT | AC-904.1 – AC-904.12 | 12 |
| UC-905 Publish (one-way) | AC-905.1 – AC-905.9 | 9 |
| UC-906 View PUBLISHED read-only | AC-906.1 – AC-906.6 | 6 |
| UC-907 Route-level role guard | AC-907.1 – AC-907.4 | 4 |
| **Total** | | **72** |

Traceability hooks: FR-001→UC-901/902; FR-002/003→UC-902 (AC-902.1–.4, .8);
FR-004→AC-901.2/AC-902.6; FR-005→AC-901.6/AC-902.12–.14 (+ edge-case matrix row);
FR-006→UC-903 (AC-903.1–.4); FR-007→AC-903.5–.7/AC-904.4/AC-905.1; FR-008→AC-903.8–
.12; FR-009 (corrected)→AC-904.1; FR-010→UC-905; FR-011→UC-906; FR-012→ (negative,
no AC needed, confirmed no delete UI anywhere in this doc); FR-013→AC-902.3;
NFR-001/002/003/004/005/006/007/008→ cited inline per relevant AC above.
