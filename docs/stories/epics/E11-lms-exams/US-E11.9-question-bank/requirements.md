# US-E11.9 — Teacher Question Bank — Requirements

## 1. Requirements Summary

The Teacher Question Bank is a net-new screen pair — a list/search screen
(`/teacher/question-bank`) and a create/edit builder
(`/teacher/question-bank/create`, `/teacher/question-bank/:id/edit`) — that
lets a teacher author reusable ESSAY/SHORT_ANSWER/FILL_IN questions as
DRAFT, publish them one-way to PUBLISHED, and search the school-wide
PUBLISHED bank of other teachers' questions gated behind a **mandatory
subjectId-or-tag filter** (client-side pre-validation of BE's `422
QUESTION_SEARCH_FILTER_REQUIRED`). Primary actor: `teacher`. The screen
consumes the `core` service's `exercisebank` sub-domain
(`GET/POST /api/v1/lms/questions`, `GET /:id`, `PUT /:id`,
`PUT /:id/publish`, `GET /questions/search`). Constraints: single-column
layout only (no 2-col builder for this screen, per DR-021), WCAG 2.1 AA,
i18n via the already-delivered `questionBank` namespace (94 keys, vi source
+ en mirror), tokens-only (zero new tokens — reuses the existing GPA-tier
success/warning/error difficulty convention and the exam-bank DRAFT/
PUBLISHED warning/success 2-value convention).

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-119",
  "title": "Teacher Question Bank — search, create/edit DRAFT, one-way publish",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "Create a DRAFT question (questionType + subjectId + gradeLevel + difficulty + body [+ optional expectedAnswer] + tags)",
        "List own questions (DRAFT + PUBLISHED, no mandatory filter)",
        "Edit own DRAFT question (all fields except questionType/subjectId/gradeLevel, which are immutable after create)",
        "Publish own DRAFT question one-way to PUBLISHED (irreversible)",
        "View own PUBLISHED question read-only (locked, no edit)",
        "Search cross-teacher PUBLISHED questions with a mandatory subjectId-or-tag filter",
        "View a cross-teacher PUBLISHED question read-only (detail, no edit)"
      ]
    },
    {
      "role": "principal",
      "capabilities": [
        "[OUT OF SCOPE for this screen] BE `canBrowseBank` permits MANAGER (principal's wire-role) to call the search endpoint, but design-spec.jsonc scopes this screen to `roles: [\"teacher\"]` only and the route family lives under `/teacher/**`. No principal-facing entry point is built in this story — flagged as an open question below, not silently granted."
      ]
    },
    {
      "role": "admin",
      "capabilities": [
        "[OUT OF SCOPE] BE permits ADMIN to search; no admin surface is designed or built in this story."
      ]
    },
    {
      "role": "student",
      "capabilities": [
        "None. BE `canBrowseBank` explicitly forbids STUDENT from search (VULN-001 gate); no question-bank UI is exposed to the student role at all."
      ]
    },
    {
      "role": "parent",
      "capabilities": [
        "None. BE `canBrowseBank` explicitly forbids PARENT from search; no question-bank UI is exposed to the parent role at all."
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL render a Question Bank list screen at `/teacher/question-bank` with a scope toggle (`Của tôi` / `Tìm kiếm`) defaulting to `Của tôi` (own scope, `GET /questions`, no mandatory filter), where switching to `Tìm kiếm` scope calls `GET /questions/search` (cross-teacher, PUBLISHED only).",
      "trigger": "Teacher navigates to /teacher/question-bank, or toggles scope",
      "preconditions": ["Actor is authenticated with role teacher"],
      "postconditions": ["Correct scope's data source is queried and rendered", "scope selection persists for the session (not required to persist across reload)"],
      "errorConditions": ["Network/5xx → generic error banner + retry (FR-009)"]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL block any `GET /questions/search` request client-side, and instead render the `QBFilterRequiredPrompt` state, whenever scope=`Tìm kiếm` AND neither `subjectId` nor a non-empty `tag` value is set — mirroring BE's `422 QUESTION_SEARCH_FILTER_REQUIRED` as a client-side pre-validation gate, not merely a caught error.",
      "trigger": "Scope=search rendered with no subjectId/tag set, or teacher clears both filters",
      "preconditions": ["scope=Tìm kiếm active"],
      "postconditions": ["No search request fires", "QBFilterRequiredPrompt shown (distinct from empty-state, dashed-border card, icon=search, title+body copy from questionBank.requiredFilterPrompt.*)"],
      "errorConditions": ["If the client-side gate is somehow bypassed and the BE still returns 422 QUESTION_SEARCH_FILTER_REQUIRED, the system SHALL map it back to the same QBFilterRequiredPrompt state, not a generic error banner"]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL satisfy the mandatory-filter gate (FR-002) when EITHER the subjectId dropdown has a non-\"all\" value OR the free-text search/tag input is non-empty, and SHALL reflect the satisfied/unsatisfied state via the `mandatoryFilterIndicator` (icon+text, check/success when satisfied, alertTriangle/warning when not — never color alone).",
      "trigger": "Teacher selects a subject or types a tag in scope=search",
      "preconditions": ["scope=Tìm kiếm active"],
      "postconditions": ["Indicator updates synchronously with input", "search request fires only once satisfied (may still be debounced for the free-text field)"],
      "errorConditions": []
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL render each question as a row card showing: type badge (ESSAY/SHORT_ANSWER/FILL_IN, icon+label, distinct hues per design-spec, not tied to difficulty colors), difficulty badge (EASY→success, MEDIUM→warning, HARD→error, icon+label), status chip (DRAFT=warning, PUBLISHED=success, scope=mine only shows DRAFT), subject chip, grade, truncated body preview (140 chars), tag pills, and (scope=search only) author attribution.",
      "trigger": "List/search results render",
      "preconditions": ["Data fetch succeeded (own or search)"],
      "postconditions": ["Card content matches the QuestionResponse fields returned"],
      "errorConditions": []
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL support additional optional filters in scope=search — questionType, difficulty — and (scope=mine only) a status filter (all/DRAFT/PUBLISHED); a gradeLevel filter SHALL be available in both scopes. These SHALL be combinable with the mandatory subjectId/tag filter but SHALL NOT themselves satisfy the mandatory-filter gate.",
      "trigger": "Teacher adjusts a secondary filter",
      "preconditions": [],
      "postconditions": ["Result set narrows client-request-side per selected filters (server params where the BE contract supports them; otherwise flagged to ba-integration-analyst for client vs server-side filtering split)"],
      "errorConditions": []
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL provide a create-question builder at `/teacher/question-bank/create` with a 3-option segmented questionType selector (ESSAY/SHORT_ANSWER/FILL_IN — no MCQ option, matching the BE's `oneof ESSAY SHORT_ANSWER FILL_IN` validation), a subject/grade/difficulty field group, a body textarea (row count varies by type: 6/ESSAY, 4/SHORT_ANSWER, 3/FILL_IN, min 4 chars, max 5000 chars, type-specific placeholder copy), an expectedAnswer textarea (row count varies by type: 4/ESSAY, 2/SHORT_ANSWER, 2/FILL_IN, max 5000 chars, type-specific placeholder copy), and a tag-chips input (max 10 tags, each max 50 chars).",
      "trigger": "Teacher opens the create route",
      "preconditions": ["Actor is authenticated with role teacher"],
      "postconditions": ["Form fields render per questionType selection with correct placeholder copy and row counts"],
      "errorConditions": []
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL treat `expectedAnswer` as OPTIONAL for all three questionTypes (ESSAY, SHORT_ANSWER, FILL_IN) when submitting create/update, matching the ground-truthed BE contract (`*string` pointer, `omitempty,max=5000` on both CreateQuestionRequest and UpdateQuestionRequest — no per-type required rule exists server-side). The system SHALL NOT block save-as-draft or the Save action on an empty expectedAnswer for any questionType. This deviates from `docs/product/design-spec.jsonc` `questionBank.builderScreen.expectedAnswerField.required: true` and `.publish.disabledUntil` (which names expectedAnswer non-empty as a publish precondition) — the design-spec's stricter UX intent is REJECTED in favor of the ground-truthed BE contract; see Open Question OQ-1 for the flag to ba-lead re: correcting the design-spec entry.",
      "trigger": "Teacher submits create/update with expectedAnswer left blank",
      "preconditions": ["body is present and >=4 chars"],
      "postconditions": ["Question saves as DRAFT with expectedAnswer null/empty"],
      "errorConditions": ["BE QUESTION_BODY_REQUIRED/QUESTION_BODY_TOO_LONG map to inline body-field errors; no expectedAnswer-required error exists to map"]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL validate `body` as required, min 4 chars (client-side UX minimum; BE enforces required + max 5000 via QUESTION_BODY_REQUIRED/QUESTION_BODY_TOO_LONG), `subjectId` as required (uuid), `gradeLevel` as required, `difficulty` as required (one of EASY/MEDIUM/HARD), `questionType` as required and fixed to one of ESSAY/SHORT_ANSWER/FILL_IN (MCQ rejected client-side before submit, matching BE QUESTION_TYPE_NOT_SUPPORTED), and `tags` as optional but capped at 10 entries of max 50 chars each (matching BE QUESTION_TAG_LIMIT_EXCEEDED/QUESTION_TAG_TOO_LONG).",
      "trigger": "Teacher submits create or update",
      "preconditions": [],
      "postconditions": ["Valid submission calls POST /questions (create) or PUT /:id (update, DRAFT only)"],
      "errorConditions": ["Inline field errors for each BE 400/422 code listed in dataDependencies below; a generic error banner for unmapped/5xx failures"]
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL treat `questionType`, `subjectId`, `gradeLevel`, AND `difficulty` as IMMUTABLE after creation — the edit builder (`/teacher/question-bank/:id/edit`, DRAFT status only) SHALL render these FOUR fields read-only/disabled, matching `UpdateQuestionRequest`'s Go struct (`body`, `expectedAnswer`, `tags` ONLY — no `difficulty` field) at the BE (the first three participate in the Scylla clustering key per the epic's D3 decision; `difficulty` is likewise excluded from the update DTO). CORRECTED 2026-07-17 (ba-integration-analyst finding, `integration.md` §— `UpdateQuestionRequest` ground-truthed from Go source has only 3 mutable fields, not 4; only `body`/`expectedAnswer`/`tags` are editable).",
      "trigger": "Teacher opens edit route for a DRAFT question",
      "preconditions": ["Question status = DRAFT", "Teacher is the question's authorId"],
      "postconditions": ["questionType/subjectId/gradeLevel/difficulty shown but disabled; only body/expectedAnswer/tags editable"],
      "errorConditions": ["QUESTION_NOT_FOUND (404) → not-found state", "QUESTION_NOT_VISIBLE/FORBIDDEN_ACTION (403) → access-denied state (not the author)"]
    },
    {
      "id": "FR-010",
      "priority": "Must",
      "description": "The system SHALL provide a one-way Publish action (`PUT /:id/publish`) on a DRAFT question, gated behind a confirmation dialog explicitly stating the action is irreversible (no unpublish/revert exists at the BE), enabled only when `body` is valid (>=4 chars) per FR-007's expectedAnswer-optional rule.",
      "trigger": "Teacher clicks Publish CTA on a DRAFT question they authored",
      "preconditions": ["Question status = DRAFT", "Teacher is the question's authorId", "body valid"],
      "postconditions": ["On confirm: status → PUBLISHED, publishedAt set, all fields become read-only"],
      "errorConditions": ["QUESTION_ALREADY_PUBLISHED (422) → refresh state to locked/PUBLISHED view, toast informing it was already published", "QUESTION_NOT_FOUND/QUESTION_NOT_VISIBLE/FORBIDDEN_ACTION as above"]
    },
    {
      "id": "FR-011",
      "priority": "Must",
      "description": "The system SHALL render a PUBLISHED question (own or from search) as fully locked/read-only — all form fields disabled, no Save/Publish CTA, only a back/close action — since `PUT /:id` is DRAFT-only at the BE and no unpublish path exists.",
      "trigger": "Teacher opens a PUBLISHED question (own edit route or search detail view)",
      "preconditions": ["Question status = PUBLISHED"],
      "postconditions": ["Locked banner shown; all fields read-only"],
      "errorConditions": []
    },
    {
      "id": "FR-012",
      "priority": "Must",
      "description": "The system SHALL NOT expose any delete action for a question (create/edit/list), matching the confirmed absence of a delete endpoint in the exercisebank BE contract.",
      "trigger": "N/A — negative requirement",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    },
    {
      "id": "FR-013",
      "priority": "Should",
      "description": "The system SHALL debounce the free-text tag/search input in scope=search (recommended 300-400ms) before firing `GET /questions/search`, to avoid a request per keystroke once the mandatory-filter gate (FR-002) is satisfied via tag text.",
      "trigger": "Teacher types in the search/tag field while scope=search and subjectId is unset",
      "preconditions": [],
      "postconditions": ["Request fires only after debounce interval with no further keystrokes"],
      "errorConditions": []
    },
    {
      "id": "FR-014",
      "priority": "Won't",
      "description": "The system SHALL NOT design or expose an MCQ options-editor UI for the question bank (no options array exists on the QuestionResponse wire contract; cross-repo ask #24 already flagged this gap to BE and is out of scope for this story).",
      "trigger": "N/A — negative requirement",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "All badges (type/difficulty/status) pair an icon with a text label — never color alone. Text/icon contrast meets WCAG AA (normal text >=4.5:1, large text/icons >=3:1). Warning-tone text uses `--edu-warning-foreground`/`--edu-warning-text`, never white-on-yellow or the raw `--edu-warning` background hue on text.",
      "measurableTarget": "Contrast ratio >=4.5:1 (body text) / >=3:1 (large text, icons); automated impeccable audit + manual check pass with zero contrast findings"
    },
    {
      "id": "NFR-002",
      "category": "Accessibility",
      "requirement": "The questionType segmented selector, all form fields, filter dropdowns, and the scope toggle are fully keyboard-operable with a visible focus ring; inline field errors are wired via id + role='alert' associated through aria-describedby.",
      "measurableTarget": "100% of interactive elements reachable and operable via Tab/Enter/Space; zero keyboard-trap findings"
    },
    {
      "id": "NFR-003",
      "category": "Accessibility",
      "requirement": "The scope toggle uses role='group' with an aria-label and aria-pressed=true on the active option; the mandatory-filter indicator conveys satisfied/unsatisfied via icon+text, not color alone.",
      "measurableTarget": "Screen-reader announces toggle group label + pressed state; automated a11y audit zero violations on this control"
    },
    {
      "id": "NFR-004",
      "category": "Accessibility",
      "requirement": "All transitions/animations (dialog/toast fade-in) are gated behind `@media (prefers-reduced-motion: reduce)`.",
      "measurableTarget": "Zero un-gated animation/transition CSS in the shipped component"
    },
    {
      "id": "NFR-005",
      "category": "Responsive",
      "requirement": "Layout is single-column ONLY at all breakpoints (no 2-col builder variant for this screen, per DR-021) — list screen maxWidth 1280 with padding 24px/32px desktop, 20px/16px mobile; builder maxWidth 760. No layout break at 320px.",
      "measurableTarget": "Visual QA passes at 320px, 375px, 768px, 1280px with no horizontal scroll/overlap"
    },
    {
      "id": "NFR-006",
      "category": "Performance",
      "requirement": "List/search results show a skeleton loading state (EduSkeleton, rows variant, count=4) while the request is in flight; perceived-loading delay before skeleton appears is negligible (no blank flash).",
      "measurableTarget": "Skeleton visible within <=100ms of navigation/filter-change trigger"
    },
    {
      "id": "NFR-007",
      "category": "i18n",
      "requirement": "All UI copy uses the existing `questionBank` namespace (94 keys) in `src/bootstrap/i18n/messages/{vi,en}.json` — vi source of truth, en mirror, typed via messages.d.ts. No new keys should be needed; if a genuine gap is found during use-case/spec authoring, add to both files with identical key paths.",
      "measurableTarget": "Zero hardcoded Vietnamese-diacritic strings in .tsx/.ts outside messages/mock/test files; tsc --noEmit catches key mismatches"
    },
    {
      "id": "NFR-008",
      "category": "Security",
      "requirement": "Search (`GET /questions/search`) is staff-only server-side (BE `canBrowseBank` gate) — the client SHALL NOT render or route to this screen for student/parent roles, and SHALL treat a 403 FORBIDDEN_ACTION/QUESTION_NOT_VISIBLE response as an access-denied state, not a silent empty result.",
      "measurableTarget": "Route guard rejects non-teacher roles before any request fires; zero role-gating bypass in RBAC test"
    }
  ],
  "uiStates": [
    "loading (skeleton rows, count=4)",
    "requiredFilterGate (QBFilterRequiredPrompt — scope=search, no filter set; distinct from emptyFiltered)",
    "emptyAll (no questions yet, scope=mine — CTA to create)",
    "emptyFiltered (no results for current filters, scope=search or mine — CTA to clear filters)",
    "error (generic error banner + retry)",
    "success (rows rendered)",
    "form-validation-error (inline field errors on create/edit)",
    "locked/read-only (PUBLISHED question view)",
    "publish-confirm (irreversible-action dialog)"
  ],
  "dataDependencies": [
    { "source": "core", "entity": "QuestionResponse (GET /questions, GET /questions/search, GET /:id)", "sensitivity": "Internal" },
    { "source": "core", "entity": "CreateQuestionRequest (POST /questions)", "sensitivity": "Internal" },
    { "source": "core", "entity": "UpdateQuestionRequest (PUT /:id)", "sensitivity": "Internal" },
    { "source": "core", "entity": "Publish action (PUT /:id/publish)", "sensitivity": "Internal" },
    { "source": "core", "entity": "Error taxonomy: QUESTION_NOT_FOUND(404), QUESTION_NOT_VISIBLE(403), QUESTION_ALREADY_PUBLISHED(422), QUESTION_TYPE_NOT_SUPPORTED(422), QUESTION_SEARCH_FILTER_REQUIRED(422), QUESTION_BODY_REQUIRED(400), QUESTION_BODY_TOO_LONG(400), QUESTION_TAG_LIMIT_EXCEEDED(422), QUESTION_TAG_TOO_LONG(400), QUESTION_INVALID_ID/SUBJECT_ID/TENANT_ID/MEMBER_ID(400), QUESTION_INVALID_DIFFICULTY(400), QUESTION_INVALID_CURSOR(400), FORBIDDEN_ACTION(403), SUBJECT_NOT_FOUND(404)", "sensitivity": "Internal" },
    { "source": "mock", "entity": "Initial dev fixtures for question-bank list/search/builder (mock-first per US-E18.16 remap playbook until real wiring pass)", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "List own questions (DRAFT+PUBLISHED), no mandatory filter",
      "Search cross-teacher PUBLISHED questions with mandatory subjectId-or-tag client-side gate",
      "Create DRAFT question (3 types: ESSAY/SHORT_ANSWER/FILL_IN)",
      "Edit own DRAFT question (questionType/subjectId/gradeLevel immutable)",
      "One-way publish DRAFT→PUBLISHED with irreversible confirm",
      "Read-only locked view of PUBLISHED questions (own or cross-teacher)",
      "Tag-chips input (create/edit + search-as-tag)",
      "Difficulty 3-tier badge (EASY/MEDIUM/HARD → success/warning/error)",
      "Secondary filters: questionType, difficulty, gradeLevel, (scope=mine) status"
    ],
    "outOfScope": [
      "src/features/exam-bank (MCQ exam papers) — different BE service (exambank), already wired US-E18.15, untouched",
      "LMS_EP.questions (per-lesson Q&A comment thread in lesson-player) — unrelated BE entity, do not confuse or reuse this endpoint group",
      "Delete action for any question — no BE endpoint exists",
      "Unpublish/revert — publish is one-way at the BE",
      "MCQ options-editor UI — no options array on the QuestionResponse wire contract",
      "Principal/admin-facing question-bank surface — BE permits MANAGER/ADMIN to search, but design-spec scopes this screen to teacher only; see OQ-1",
      "src/features/lesson-plan (US-E11.10 or sibling story, bundled under the same DR-021 but a separate BE sub-domain/entity) — not built by this story"
    ],
    "externalDependencies": [
      "edu-api core service, exercisebank sub-domain (GET/POST /api/v1/lms/questions, GET/PUT /:id, PUT /:id/publish, GET /questions/search) — stable, ground-truthed US-E18.16",
      "Subject reference data (subjectId dropdown source) — existing subject list already consumed elsewhere in the app; ba-integration-analyst to confirm the exact source endpoint/entity"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] Scope toggle state (mine/search) does not need to persist across page reload or be reflected in the URL query string — session-local UI state is sufficient unless ba-use-case-modeler finds a deep-link requirement.",
    "[ASSUMPTION] Secondary filters (questionType, difficulty, gradeLevel, status) are applied server-side as query params where the BE search/list endpoints support them; ba-integration-analyst to confirm exact supported query params per endpoint and specify client-side filtering fallback for any unsupported ones.",
    "[ASSUMPTION] The 'authorId' shown on cross-teacher search cards resolves to a display name via an existing member/profile lookup already used elsewhere in the app (not a new BE call this story introduces) — ba-integration-analyst to confirm the resolution path.",
    "[ASSUMPTION] Body min-4-chars is a client-side UX floor (not BE-enforced beyond 'required'); kept low to avoid blocking valid short FILL_IN bodies."
  ],
  "openQuestions": [
    "OQ-1: design-spec.jsonc's questionBank.builderScreen.expectedAnswerField.required:true and .publish.disabledUntil (naming expectedAnswer as a publish precondition) conflict with the ground-truthed BE contract (expectedAnswer optional for all 3 types, no per-type required validation). This requirements doc RESOLVES the conflict in favor of the BE contract (FR-007) — flagging to ba-lead to correct docs/product/design-spec.jsonc questionBank.builderScreen.expectedAnswerField/publish.disabledUntil so the normative doc doesn't mislead a future implementer back toward the stricter (incorrect) UX gate. This is a data-contract decision, not a UI redesign — no new ADR expected, just a design-spec correction.",
    "OQ-2: Should a principal (MANAGER wire-role, BE-permitted to search per canBrowseBank) get any question-bank entry point in a future story, or is teacher-only scoping in design-spec.jsonc/screens.md intentional and permanent? Flagging so ba-lead can decide whether to note this as a deliberate scope boundary or file a follow-up story."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Priority | Rationale |
| --- | --- | --- |
| FR-001 | Must | Core navigation/scope-toggle is the entry point for every other requirement. |
| FR-002 | Must | The mandatory-filter gate is the story's headline BE contract constraint (422 `QUESTION_SEARCH_FILTER_REQUIRED`); explicitly called out as first-class AC in story.md. |
| FR-003 | Must | Without this, FR-002's gate has no way to become satisfied. |
| FR-004 | Must | Baseline list rendering — required for any usable screen. |
| FR-005 | Must | Secondary filters are part of the delivered design (design-spec filterBar) and expected by the teacher workflow. |
| FR-006 | Must | Core create flow — the feature's primary write path. |
| FR-007 | Must | Ground-truthed BE contract correction; getting this wrong blocks valid DRAFT saves/publishes for teachers who reasonably leave expectedAnswer blank on FILL_IN/SHORT_ANSWER. |
| FR-008 | Must | Client-side validation parity with BE prevents round-trip errors on the most common mistakes. |
| FR-009 | Must | Prevents silently-broken PUT calls against BE fields that are immutable/omitted from UpdateQuestionRequest. |
| FR-010 | Must | Publish is the other primary write path; irreversibility must be surfaced, not discovered. |
| FR-011 | Must | Prevents dead-end edit attempts on PUBLISHED questions that will always 422/403 at the BE. |
| FR-012 | Must | Negative requirement — prevents scope creep into an unsupported destructive action. |
| FR-013 | Should | UX/perf polish; not blocking correctness, but cheap and expected given a free-text filter input. |
| FR-014 | Won't | Explicitly out of scope — no wire support, already flagged upstream. |

## 4. Handoff Notes

**For `ba-integration-analyst`:**
- Confirm exact query params supported by `GET /questions/search` and `GET
  /questions` for the secondary filters in FR-005 (questionType, difficulty,
  gradeLevel, status) — map which are server-side vs need client-side
  post-filtering.
- Confirm the subjectId dropdown's data source (existing subject-list
  entity/endpoint already used elsewhere — do not invent a new one).
- Confirm the authorId → display-name resolution path for search-scope
  cards (assumption above).
- Map all ~12 `QUESTION_*` codes + `FORBIDDEN_ACTION`/`SUBJECT_NOT_FOUND`
  to specific inline-field vs banner vs full-page states per FR-008/FR-009/
  FR-010/FR-011's error conditions.
- Endpoint group name: new `QUESTION_BANK_EP` in
  `src/bootstrap/endpoint/lms.endpoint.ts`, additive — do not touch the
  existing unrelated `LMS_EP.questions` (per-lesson Q&A thread).

**For `ba-use-case-modeler`:**
- Cover Given/When/Then for: (a) scope=search with no filter → gate blocks
  request (FR-002/FR-003) as first-class AC per story.md; (b) create with
  each of the 3 questionTypes, expectedAnswer left blank (FR-007) — must
  show a passing save, not a validation error; (c) edit-DRAFT with
  immutable fields disabled (FR-009); (d) publish confirm → locked view
  (FR-010/FR-011); (e) all four UI states (loading/empty/error/success) for
  BOTH scope=mine and scope=search, plus the requiredFilterGate as a fifth,
  distinct state for scope=search.
- Role variants: teacher (full flow) vs the explicit absence of any UI for
  student/parent (route-level guard, not just hidden nav item).

Flagging OQ-1 (data-contract correction to `design-spec.jsonc`) and OQ-2
(principal/admin scope decision) to `ba-lead` directly per the standard
process — see Section 2 `openQuestions`.
