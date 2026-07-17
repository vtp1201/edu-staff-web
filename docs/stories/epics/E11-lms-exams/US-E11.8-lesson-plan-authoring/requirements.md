# US-E11.8 — Teacher Lesson Plan Authoring — Requirements

## 1. Requirements Summary

The system SHALL let a `teacher` author a structured teaching-plan document
(title, subject, grade level, tags, and four document sections — objectives,
contentOutline, activities, assessmentMethod) that starts life as `DRAFT`,
can be edited while `DRAFT`, and can be **irreversibly** published to
`PUBLISHED` — after which the plan becomes read-only. Teachers can list their
own plans (both statuses) or browse other teachers' `PUBLISHED` plans by
subject ("Toàn trường" scope). Built against the ground-truthed `core`
service `lessonplan` sub-domain contract (US-E18.16); design source is
`design_src/edu/lesson-plan.jsx` + `docs/product/design-spec.jsonc` →
`screens.lessonPlan` (design-ready, DR-021, 2026-07-17). No delete endpoint
exists on the wire — this spec does not introduce one. Key constraint: exactly
4 named document sections, no richer/nested schema.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-118",
  "title": "Teacher Lesson Plan Authoring (create/edit DRAFT, one-way publish, list/browse)",
  "status": "Draft",
  "actors": [
    {
      "role": "teacher",
      "capabilities": [
        "Create a new lesson plan (starts as DRAFT)",
        "Edit own DRAFT plan (title, subjectId, gradeLevel, tags, 4 document sections)",
        "Publish own DRAFT plan (one-way, irreversible, confirm required)",
        "View own plan (DRAFT or PUBLISHED) read/write (DRAFT) or read-only (PUBLISHED)",
        "List own plans (DRAFT + PUBLISHED) with filter/search",
        "Browse other teachers' PUBLISHED plans by subject (\"Toàn trường\" scope, read-only)"
      ]
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "priority": "Must",
      "description": "The system SHALL allow a teacher to create a new lesson plan in DRAFT status by submitting title, subjectId, gradeLevel, and optional tags; the four document sections may be empty at creation time.",
      "trigger": "Teacher submits the lesson-plan builder create form (POST /api/v1/lms/lesson-plans).",
      "preconditions": ["Caller authenticated with a verified TEACHER claim for the current tenant."],
      "postconditions": ["A new LessonPlanResponse is created with status=DRAFT, teacherId=caller, empty publishedAt.", "Teacher is navigated to the edit builder for the new planId."],
      "errorConditions": ["Missing/invalid subjectId or gradeLevel -> inline field validation error (per LESSON_PLAN_* taxonomy).", "title outside 4-200 chars -> inline field error.", "Network/5xx -> generic error banner, form state preserved, retry available."]
    },
    {
      "id": "FR-002",
      "priority": "Must",
      "description": "The system SHALL allow a teacher to edit any field of their own DRAFT lesson plan (title, subjectId is immutable post-create per contract, gradeLevel, tags, objectives, contentOutline, activities, assessmentMethod) and persist via Save Draft.",
      "trigger": "Teacher edits a field and triggers Save Draft (PUT /api/v1/lms/lesson-plans/:id) on a DRAFT plan they own.",
      "preconditions": ["Plan exists, status=DRAFT, caller is teacherId owner."],
      "postconditions": ["Plan fields updated, updatedAt refreshed.", "'Unsaved changes' indicator clears on success."],
      "errorConditions": ["Any field exceeds max length (objectives/assessmentMethod 5000, contentOutline/activities 20000, title 200, tags max 10 x 50 chars each) -> inline field error, save blocked.", "Attempt to change subjectId -> field is not editable in the UI after creation (immutable per contract) — not exposed as an editable control on edit route.", "404/plan not found or not owner -> error banner, redirect to list.", "409/plan already PUBLISHED (race) -> error banner + form auto-locks to read-only."]
    },
    {
      "id": "FR-003",
      "priority": "Must",
      "description": "The system SHALL require all 4 document sections (objectives, contentOutline, activities, assessmentMethod) and a valid title (4-200 chars) to be non-empty before enabling the Publish action; the Publish CTA SHALL be disabled until this condition is met.",
      "trigger": "Teacher opens the builder for a DRAFT plan.",
      "preconditions": ["Plan status=DRAFT."],
      "postconditions": ["Publish button reflects enabled/disabled state reactively as fields are edited."],
      "errorConditions": ["N/A — client-side gating only; BE validation is the authoritative gate (see FR-004)."]
    },
    {
      "id": "FR-004",
      "priority": "Must",
      "description": "The system SHALL publish a DRAFT lesson plan to PUBLISHED status only after the teacher confirms an irreversible-action dialog; this action is one-way and SHALL NOT be reversible from the UI (no unpublish/revert control exists).",
      "trigger": "Teacher clicks Publish, then confirms the irreversible-confirm dialog (PUT /api/v1/lms/lesson-plans/:id/publish).",
      "preconditions": ["Plan status=DRAFT, caller is owner, all 4 sections + title valid."],
      "postconditions": ["Plan status becomes PUBLISHED, publishedAt set.", "Builder immediately re-renders in locked/read-only mode with the locked banner.", "Plan becomes visible to other teachers via GET /subject/:subjectId."],
      "errorConditions": ["Validation failure (LESSON_PLAN_* code, e.g. missing section) -> dialog closes, inline field error(s) shown, plan remains DRAFT.", "Plan already PUBLISHED (race/stale state) -> error banner, UI refreshes to locked view.", "Network/5xx -> error banner, retry publish available, plan remains DRAFT."]
    },
    {
      "id": "FR-005",
      "priority": "Must",
      "description": "The system SHALL render a PUBLISHED lesson plan (own or another teacher's, browsed) as fully read-only: all fields disabled, no Save Draft/Publish actions, a locked banner shown.",
      "trigger": "Teacher opens a plan whose status=PUBLISHED (GET /:id).",
      "preconditions": ["Plan visibility rule satisfied (see FR-008)."],
      "postconditions": ["View renders locked banner + disabled fields; no write action exposed."],
      "errorConditions": ["Attempted PUT on a PUBLISHED plan is not exposed as reachable from this UI state (defense-in-depth; BE is the authoritative DRAFT-only gate)."]
    },
    {
      "id": "FR-006",
      "priority": "Must",
      "description": "The system SHALL list the caller's own lesson plans (both DRAFT and PUBLISHED) when the owner-toggle scope is set to \"Của tôi\", with filters for subject, grade, status (DRAFT/PUBLISHED/all), and free-text search.",
      "trigger": "Teacher opens /teacher/lesson-plans with owner scope=me (default) (GET /api/v1/lms/lesson-plans).",
      "preconditions": ["Caller authenticated as teacher."],
      "postconditions": ["Card grid renders own plans matching active filters; status filter dropdown visible only in this scope."],
      "errorConditions": ["List fetch fails -> EduError + retry.", "No plans exist -> empty state with 'create new plan' CTA.", "No plans match filters -> distinct filtered-empty state with 'clear filters' action."]
    },
    {
      "id": "FR-007",
      "priority": "Must",
      "description": "The system SHALL let a teacher browse other teachers' PUBLISHED lesson plans scoped to a selected subject when the owner-toggle scope is set to \"Toàn trường\"; this scope SHALL NOT expose a status filter (implicitly PUBLISHED-only) and SHALL require a subject to be selected.",
      "trigger": "Teacher switches owner-toggle to \"Toàn trường\" and/or selects a subject (GET /api/v1/lms/lesson-plans/subject/:subjectId).",
      "preconditions": ["Caller authenticated as teacher in same tenant."],
      "postconditions": ["Card grid renders PUBLISHED plans for the selected subject, owner name shown on each card."],
      "errorConditions": ["No subject selected yet -> prompt state distinct from generic empty ('choose a subject to browse').", "Fetch fails -> EduError + retry.", "No PUBLISHED plans for subject -> empty state (no create CTA in this scope)."]
    },
    {
      "id": "FR-008",
      "priority": "Must",
      "description": "The system SHALL enforce single-plan visibility: an owner may view their own plan in any status; any other teacher/manager/admin in the tenant may view a plan only when its status is PUBLISHED.",
      "trigger": "Teacher (or any authenticated tenant member) navigates to a specific plan's edit/view route (GET /:id).",
      "preconditions": ["Plan exists."],
      "postconditions": ["Owner + DRAFT -> full edit view. Owner + PUBLISHED -> locked view. Non-owner + PUBLISHED -> locked/read-only view. Non-owner + DRAFT -> access denied."],
      "errorConditions": ["Non-owner requests a DRAFT plan -> access-denied error state (not a 404-styled generic error; distinguish from 'not found'), redirect to list.", "Plan not found -> not-found error state, redirect to list."]
    },
    {
      "id": "FR-009",
      "priority": "Must",
      "description": "The system SHALL provide a tag-chips input (add/remove) on the builder, enforcing max 10 tags per plan, each tag max 50 characters, with client-side validation before submit.",
      "trigger": "Teacher types a tag and confirms (Enter/comma) in the tags field.",
      "preconditions": ["Plan is DRAFT and editable."],
      "postconditions": ["Tag rendered as a removable chip; tag list included in next save/create payload."],
      "errorConditions": ["11th tag attempted -> input blocked with inline helper message.", "Tag exceeds 50 chars -> inline error, tag not added.", "Duplicate tag -> silently ignored or inline note (no duplicate chip)."]
    },
    {
      "id": "FR-010",
      "priority": "Should",
      "description": "The system SHALL surface an 'unsaved changes' indicator on the builder whenever local field state diverges from the last-saved plan state, matching the exam-bank builder's warning-tone dot pattern.",
      "trigger": "Teacher edits any field without yet saving.",
      "preconditions": ["Plan is DRAFT."],
      "postconditions": ["Indicator visible until Save Draft succeeds or user navigates away (with a leave-confirmation, if implemented per exam-bank precedent)."],
      "errorConditions": []
    },
    {
      "id": "FR-011",
      "priority": "Won't",
      "description": "The system SHALL NOT provide a delete action for lesson plans (no BE endpoint exists for this contract).",
      "trigger": "N/A",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    },
    {
      "id": "FR-012",
      "priority": "Won't",
      "description": "The system SHALL NOT provide an unpublish/revert-to-DRAFT action (publish is modeled one-way by the BE contract).",
      "trigger": "N/A",
      "preconditions": [],
      "postconditions": [],
      "errorConditions": []
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "category": "Accessibility",
      "requirement": "All interactive controls (builder fields, tag-chip add/remove, owner-toggle, filter dropdowns, publish confirm dialog) are keyboard-operable with visible focus ring; status badges pair icon + text (not color-only); inline field errors wired via id + role=alert + aria-describedby + aria-invalid.",
      "measurableTarget": "WCAG 2.1 AA; text contrast >=4.5:1, UI/icon contrast >=3:1; 0 color-only status indicators."
    },
    {
      "id": "NFR-002",
      "category": "Responsive",
      "requirement": "List screen card grid and builder 2-column layout adapt to smaller viewports without horizontal scroll or clipped controls.",
      "measurableTarget": "No layout break at 320px; builder stacks 2-col -> 1-col below 860px per design-spec; verified at 375/768/1280 breakpoints."
    },
    {
      "id": "NFR-003",
      "category": "Performance",
      "requirement": "List and builder screens show a skeleton loading state while fetching, avoiding layout shift on data arrival.",
      "measurableTarget": "Skeleton shown within <=320ms perceived delay threshold (product baseline); no CLS from skeleton->content swap."
    },
    {
      "id": "NFR-004",
      "category": "i18n",
      "requirement": "All UI copy sourced from the existing `lessonPlan` namespace (80 keys already landed in vi.json/en.json per DR-021); no new key shapes invented without confirming they exist in messages/{vi,en}.json.",
      "measurableTarget": "0 hardcoded UI strings; vi/en key parity 100%; typed t() calls (messages.d.ts) compile clean."
    },
    {
      "id": "NFR-005",
      "category": "Security",
      "requirement": "Write actions (create/update/publish) enforced server-side as TEACHER + ownership; UI must not expose edit controls for non-owned or PUBLISHED plans (defense-in-depth, BE is authoritative).",
      "measurableTarget": "0 reachable write controls on read-only/non-owned states; BE 403/404 mapped to a11y-safe error UI, not a raw stack/console leak."
    }
  ],
  "uiStates": ["loading", "empty (no plans yet)", "empty (filtered/no results)", "empty (browse: no subject selected)", "error (fetch)", "error (save/publish validation)", "success (draft saved)", "success (published, locked view)"],
  "dataDependencies": [
    { "source": "core", "entity": "LessonPlanResponse (lessonplan sub-domain)", "sensitivity": "Internal" },
    { "source": "core", "entity": "Subject list (for subjectId dropdown, existing dependency reused from exam-bank/lesson-bank features)", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Create DRAFT lesson plan",
      "Edit DRAFT lesson plan (title, gradeLevel, tags, 4 document sections)",
      "One-way publish DRAFT -> PUBLISHED with irreversible confirm",
      "Locked/read-only view once PUBLISHED",
      "List own plans (DRAFT+PUBLISHED) with subject/grade/status/search filters",
      "Browse other teachers' PUBLISHED plans by subject (owner-toggle 'Toàn trường')",
      "Tag-chips input (max 10 tags, max 50 chars each)",
      "Client-side field validation mirroring the 11-code LESSON_PLAN_* taxonomy (exact code->message mapping deferred to ba-integration-analyst / ba-use-case-modeler)"
    ],
    "outOfScope": [
      "lesson-bank (file-sharing repository feature, `src/features/lesson-bank`) — unrelated domain, not touched",
      "Per-lesson Q&A comment thread (`LMS_EP.questions`, lesson-player) — unrelated, not touched",
      "Delete lesson plan — no BE endpoint",
      "Unpublish / revert to DRAFT — not modeled by BE",
      "Principal/admin aggregate read view — NOT confirmed by BE contract (see Open Questions)",
      "Question Bank screen (US covered separately, same DR-021 origin, different packet)"
    ],
    "externalDependencies": [
      "edu-api core service, lessonplan sub-domain routes (POST/GET /api/v1/lms/lesson-plans, GET /:id, PUT /:id, PUT /:id/publish, GET /subject/:subjectId)",
      "Subject reference data (existing dependency, source TBD by ba-integration-analyst — likely core or a shared subject list already consumed by exam-bank/lesson-bank)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] subjectId is immutable after creation per the DTO note (Update omits subjectId) — the edit builder does not render subjectId as an editable control post-create; it is only settable at creation.",
    "[ASSUMPTION] 'Toàn trường' browse scope requires an explicit subject selection before any list request fires (mirrors the question-bank mandatory-filter UX pattern for consistency, though lesson-plan's GET /subject/:subjectId is not gated by a 422 on the BE side per the ground-truthed contract — this is a UX choice to avoid an unscoped cross-tenant-teacher fetch, not a BE-enforced rule).",
    "[ASSUMPTION] PUBLISHED plans are read-only for the owner too (no BE unpublish path) — confirmed by DR-021 and the BE contract's DRAFT-only PUT gate.",
    "[ASSUMPTION] gradeLevel and subjectId are selected from existing reference/lookup data already available to other teacher features (exam-bank/lesson-bank); this US does not introduce new reference-data endpoints."
  ],
  "openQuestions": [
    "Does `principal`/`admin` get any read access to PUBLISHED lesson plans (school-wide oversight), or is visibility strictly teacher-to-teacher within a subject as the BE contract currently supports? design-spec.jsonc already marks roles=[\"teacher\"] only — confirm this is final, not a placeholder, before spec.md locks role gating.",
    "Should the 4 document-section fields be plain textareas (as design-spec specifies, rows=4) or does any future story anticipate rich-text/structured-list editing? This spec treats them as plain multi-line text per the BE contract (free-text strings) and the DR's explicit 'do NOT invent a richer schema' instruction."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | Create DRAFT plan | Must | Core entry point of the feature; contract exists (`POST`). |
| FR-002 | Edit DRAFT plan | Must | Primary authoring loop; contract exists (`PUT`, DRAFT-only). |
| FR-003 | Client-side publish-readiness gating | Must | Prevents a doomed publish call; matches design-spec `disabledUntil` rule. |
| FR-004 | One-way publish + irreversible confirm | Must | Contract is one-way; irreversibility must be surfaced, not hidden. |
| FR-005 | Locked/read-only PUBLISHED view | Must | BE gates PUT to DRAFT-only; UI must mirror this or risk a dead-end save. |
| FR-006 | List own plans (both statuses) + filters | Must | Baseline "my work" screen; explicit in design-spec + BE list endpoint. |
| FR-007 | Browse PUBLISHED-by-subject (school scope) | Must | Distinct BE endpoint (`/subject/:subjectId`); named in design + DR. |
| FR-008 | Visibility gating on single-GET | Must | Directly enforces the BE's documented owner/PUBLISHED visibility rule. |
| FR-009 | Tag-chips input with limits | Must | Field exists on the DTO with explicit max constraints (10 x 50 chars). |
| FR-010 | Unsaved-changes indicator | Should | UX polish already proven in exam-bank; not contract-critical. |
| FR-011 | No delete action | Won't | No BE endpoint — explicitly out of scope per DR/story hard-gate. |
| FR-012 | No unpublish/revert | Won't | BE models publish as one-way; no reverse route exists. |

## 4. Handoff Notes

**For `ba-integration-analyst`:**
- Map exact `LESSON_PLAN_*` error codes (11-code taxonomy,
  `edu-api/services/core/docs/ERROR_CODES.md:337-346`) to the inline field
  errors vs. generic error-banner split noted in FR-002/FR-004/FR-008.
- Confirm the source of subject reference data (dropdown options) — likely
  reused from an existing repository/DI factory already wired for
  exam-bank/lesson-bank; do not stand up a new subject-list endpoint if one
  already exists.
- Confirm whether `GET /subject/:subjectId` requires `subjectId` as a path
  param only, or supports additional query filters (grade/tag) — design-spec
  shows grade dropdown as visible in both scopes; verify it's a client-side
  filter over the fetched result set vs. a server-side query param for the
  browse endpoint.
- `LESSON_PLAN_EP` endpoint group is new/additive in
  `src/bootstrap/endpoint/lms.endpoint.ts` per story packet — confirm exact
  path shapes against `openapi.yaml`.

**For `ba-use-case-modeler`:**
- Write Given/When/Then AC for each FR above, covering all 4 UI states
  (loading/empty/error/success) plus the two lesson-plan-specific states:
  locked/read-only (PUBLISHED) and browse-no-subject-selected prompt.
- Model the owner-toggle interaction explicitly as two use cases (List Mine
  vs Browse by Subject) since they hit different endpoints and have
  different available filters (status filter only in "mine" scope).
- Include a role-variant AC block confirming teacher-only access per
  `roles-permissions.md` (`(app)/teacher/**` route group) and noting the
  open question about principal/admin read access so it's tracked through to
  `spec.md`'s traceability matrix rather than silently assumed.

**Open questions escalated to `ba-lead`:** the principal/admin read-access
question above should be confirmed before `spec.md` locks role gating — flag
for a possible ADR only if the answer turns out to require a new
cross-teacher/admin-aggregate route not currently in the ground-truthed BE
contract (in which case it's a BE gap, not an ADR for this repo).
