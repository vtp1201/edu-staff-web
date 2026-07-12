# US-E19.1 — Social Feed — Requirements

Source design: `docs/design-requests/DR-012-social-feed.md` (delivered),
`docs/product/design-spec.jsonc` → `screens.feed` (~line 3521), mockup
`design_src/edu/feed.jsx`. Lane: **normal** (no auth/authz/data-loss change —
the destructive "Remove" action's authorization + audit trail live in the
companion story, see Dependencies).

## 1. Requirements Summary

The Social Feed screen gives all four roles a school-wide + per-class post
feed: teacher/principal/student can compose (role- and scope-gated), all
roles can react and comment, and any role except a post's author can report
it or its comments. Moderator actions (pin/unpin, remove) are entry points
only here — their authorization, confirm-dialog, and audit trail are owned
by US-E19.2. Constraints: WCAG 2.1 AA, responsive down to 320px, vi/en i18n,
cursor pagination, 4 required UI states (loading/empty/error/end-of-feed),
and a mock-first note on post-pinning persistence (BE US-101 in progress).

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-190",
  "title": "Social Feed",
  "status": "Draft",
  "actors": [
    { "role": "teacher", "capabilities": ["post to school feed", "post to own class feed", "react", "comment", "report others' posts/comments (not own)", "pin/unpin own-class posts (entry point only, see US-E19.2)", "remove own-class posts/comments (entry point only, see US-E19.2)"] },
    { "role": "principal", "capabilities": ["post to school feed", "post to any class feed", "react", "comment", "report others' posts/comments", "pin/unpin any post (entry point only)", "remove any post/comment (entry point only)"] },
    { "role": "student", "capabilities": ["post to own class feed only (no school-scope post)", "react", "comment", "report others' posts/comments (not own)"] },
    { "role": "parent", "capabilities": ["view-only feed (no composer)", "react", "comment", "report others' posts/comments (not own)"] }
  ],
  "functionalRequirements": [
    { "id": "FR-001", "priority": "Must", "description": "The system SHALL render two feed scopes as a tablist: \"Toàn trường\" (school) and \"Lớp <tên>\" (class, listbox when the user belongs to >1 class).", "trigger": "screen load / tab click", "preconditions": ["user authenticated"], "postconditions": ["active scope's posts loaded and displayed"], "errorConditions": ["scope fetch fails → error state (FR-010)"] },
    { "id": "FR-002", "priority": "Must", "description": "The system SHALL show the composer only when canPost is true for the active role+scope (school scope: teacher/principal; class scope: teacher/principal/student), and SHALL NOT render it (not just disable it) otherwise.", "trigger": "scope change or screen load", "preconditions": ["role resolved"], "postconditions": ["composer visible/hidden per rule"], "errorConditions": [] },
    { "id": "FR-003", "priority": "Must", "description": "The system SHALL allow an eligible user to submit a post (text + optional single image attach, mock-first for image upload) to the active scope.", "trigger": "submit button click, non-empty content", "preconditions": ["canPost true", "content non-empty"], "postconditions": ["new post prepended to feed", "confirmation toast \"Đã đăng bài viết\""], "errorConditions": ["submit fails → inline error, content preserved for retry"] },
    { "id": "FR-004", "priority": "Must", "description": "The system SHALL let any role react to a post via a toggled reaction chip (👍/❤️/🎉/👏), reflecting the user's own reaction state distinctly from others' counts.", "trigger": "reaction chip click", "preconditions": ["post visible"], "postconditions": ["chip toggled, count updated (optimistic)"], "errorConditions": ["reaction call fails → rollback optimistic update"] },
    { "id": "FR-005", "priority": "Must", "description": "The system SHALL let any role expand a post's comment thread and add an inline comment.", "trigger": "comments toggle click / comment submit", "preconditions": ["post visible"], "postconditions": ["thread expanded; new comment appended"], "errorConditions": ["comment submit fails → inline error, retry"] },
    { "id": "FR-006", "priority": "Must", "description": "The system SHALL expose a '…' menu per post/comment containing role-gated items: Pin/Unpin (moderator only — entry point, see US-E19.2 for authorization + persistence), Remove (moderator only — entry point, see US-E19.2), Report (any role except the content's own author).", "trigger": "'…' trigger click", "preconditions": ["post/comment rendered"], "postconditions": ["menu opens with only the items the current role/author-relationship is entitled to"], "errorConditions": [] },
    { "id": "FR-007", "priority": "Must", "description": "The system SHALL open the SHARED Report dialog (contract owned by US-E19.2, `moderation.reportDialog.*`) when 'Báo cáo' is selected on a post or comment, passing kind=post|comment and a quoted preview of the content.", "trigger": "menu item 'Báo cáo' click", "preconditions": ["current user is not the content author"], "postconditions": ["report submitted; reported content stays visible to the reporter (not hidden); toast \"Đã gửi báo cáo. BGH sẽ xem xét.\""], "errorConditions": ["submit fails → dialog stays open with inline error"] },
    { "id": "FR-008", "priority": "Must", "description": "The system SHALL float pinned posts to the top of the feed with a visually distinct accent border, and SHALL mark pinned state with an icon + text label (not color alone).", "trigger": "feed render when any post has pinned=true", "preconditions": [], "postconditions": ["pinned posts ordered before non-pinned, regardless of post time"], "errorConditions": [] },
    { "id": "FR-009", "priority": "Must", "description": "The system SHALL paginate the feed via cursor pagination with a 'Tải thêm bài viết' button, and SHALL show an end-of-feed marker ('Bạn đã xem hết bảng tin') when no next cursor remains.", "trigger": "load-more click / initial load", "preconditions": [], "postconditions": ["additional page appended; end marker shown when exhausted"], "errorConditions": ["load-more fails → inline retry affordance, existing posts unaffected"] },
    { "id": "FR-010", "priority": "Must", "description": "The system SHALL render the four required UI states — loading (skeleton, 3 rows via shared EduSkeleton), empty (EduEmpty, role-gated CTA to post shown only when canPost), error (EduError with retry), and end-of-feed.", "trigger": "data fetch lifecycle", "preconditions": [], "postconditions": ["exactly one primary state visible at a time, consistent with fetch status"], "errorConditions": [] },
    { "id": "FR-011", "priority": "Won't", "description": "The system SHALL NOT persist pin/unpin actions against a real backend in this story — pin/unpin UI and optimistic local state may ship, but actual persistence is mock-first pending BE US-101 (post-pinning, status in_progress on the `social` service).", "trigger": "pin/unpin action while BE US-101 is not yet delivered", "preconditions": [], "postconditions": ["UI reflects the toggle locally (mock)", "no silent full wiring assumed — explicitly flagged for FE + QA"], "errorConditions": ["N/A — this is a scope constraint, not a runtime error path"] }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-001", "category": "Accessibility", "requirement": "Reaction buttons use aria-pressed and a Vietnamese aria-label naming the reaction and count; '…' menus use proper ARIA menu/menuitem roles with Escape + outside-click dismiss; images require meaningful alt; pinned state is icon+label not color-only.", "measurableTarget": "WCAG 2.1 AA; axe/impeccable audit zero critical violations" },
    { "id": "NFR-002", "category": "Responsive", "requirement": "Feed column stays usable and does not break at narrow viewports; scope tabs scroll horizontally on mobile.", "measurableTarget": "no layout break at 320px; verified at 375/768/1280 breakpoints" },
    { "id": "NFR-003", "category": "Performance", "requirement": "Feed loading state (skeleton) must appear promptly to avoid perceived hang.", "measurableTarget": "skeleton visible ≤320ms after navigation (product baseline)" },
    { "id": "NFR-004", "category": "i18n", "requirement": "All static UI copy sourced from the `feed` i18n namespace (vi source + en mirror); dynamic values (relative time, per-post author/content) are NOT i18n keys — computed/formatted at render time.", "measurableTarget": "0 hardcoded user-facing strings outside messages/{vi,en}.json; both locales render without missing-key errors" },
    { "id": "NFR-005", "category": "Security", "requirement": "Composer visibility and menu item visibility (pin/remove) are enforced by role/author checks; UI hiding is a UX affordance, not the sole authorization boundary — actual authorization enforcement for destructive actions is owned by US-E19.2 / BE.", "measurableTarget": "no client-only trust: any pin/remove call surfaces a defined error path if BE rejects due to authorization" }
  ],
  "uiStates": ["loading", "empty", "error", "endOfFeed", "success"],
  "dataDependencies": [
    { "source": "social", "entity": "feed post (school/class scope)", "sensitivity": "Internal" },
    { "source": "social", "entity": "post/comment reaction", "sensitivity": "Internal" },
    { "source": "social", "entity": "comment", "sensitivity": "Internal" },
    { "source": "social", "entity": "report (created via shared Report dialog, owned by US-E19.2 contract)", "sensitivity": "Confidential" },
    { "source": "mock", "entity": "post pin/unpin persistence (until BE US-101 lands)", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Feed screen: tab switcher, composer (role/scope-gated), post card, reaction bar, comment thread, '…' menu entry points, pinned-post ordering, pagination, 4 UI states",
      "Report entry points from post/comment menu that open the SHARED Report dialog contract owned by US-E19.2",
      "Pin/unpin and remove menu items as UI entry points (visibility gating only)"
    ],
    "outOfScope": [
      "BE Go implementation of any `social` service endpoint",
      "Pixel-level UI implementation (owned by fe-nextjs-engineer against design-spec.jsonc)",
      "Report dialog's own contract (reason list, quote preview, submit/cancel semantics, i18n keys) — defined ONCE in US-E19.2, referenced here",
      "Moderation queue, detail sheet, resolve/dismiss/remove authorization logic, audit trail — all owned by US-E19.2",
      "Real persistence of pin/unpin (mock-first until BE US-101 ships; explicitly NOT silently assumed wired)",
      "Real image upload pipeline (mock attach only per DR-012)"
    ],
    "externalDependencies": [
      "BE service `social`: GET/POST /api/v1/feeds/school, /feeds/classes/{classId}, PUT/DELETE /feeds/posts/{postId}/reaction, GET/POST .../comments, DELETE .../moderate-delete (US-097→100 implemented; US-101 pin/unpin in_progress)",
      "Shared Screen State Primitives (EduSkeleton/EduEmpty/EduError) from design-system component set",
      "Shared Report dialog contract from US-E19.2 (`moderation.reportDialog.*` i18n + `screens.moderation.reportDialog` design-spec entry)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] 'moderator' for pin/remove menu-item visibility means principal (any scope) or teacher acting on their own class's posts — matches design-spec.jsonc menu.items note; final authorization rule confirmed by US-E19.2.",
    "[ASSUMPTION] Relative-time strings and per-post dynamic content are NOT i18n keys per DR-012 note — FE computes them from real timestamps client-side.",
    "[ASSUMPTION] Student post permission is class-scope only (no school-scope posting) per design-spec composer.visibilityRule."
  ],
  "openQuestions": [
    "Should FE surface a distinct (non-toast, non-blocking) UI indicator when a pin/unpin action is only mocked (not yet BE-persisted), so QA and users aren't misled that it's durable? Flagging for ba-use-case-modeler to decide AC wording.",
    "Confirm whether teacher's pin/remove scope is limited strictly to classes they teach, or any class they can view — affects FR-006 menu-gating AC."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-001 | School/class scope tabs | Must | Core navigation of the feed; explicit in DR-012 + design-spec |
| FR-002 | Role/scope-gated composer visibility | Must | RBAC baseline; hard-gate concern flagged to ba-lead if changed later |
| FR-003 | Post submission | Must | Primary feed action |
| FR-004 | Reactions | Must | Core engagement feature, explicit in mockup |
| FR-005 | Comment thread | Must | Core engagement feature |
| FR-006 | '…' menu role-gating | Must | Gatekeeper for report/pin/remove entry points |
| FR-007 | Report entry point (shared dialog) | Must | Required for community safety; contract owned by US-E19.2 |
| FR-008 | Pinned-post ordering | Must | Explicit design-spec behavior |
| FR-009 | Pagination + end-of-feed | Must | Required state per DR-012 |
| FR-010 | 4 UI states | Must | Hard rule (tdd.md / design system state requirement) |
| FR-011 | Pin/unpin mock-first constraint | Should | Ships as UI now; persistence blocked on BE US-101, must be explicit not silent |

## 4. Handoff Notes

- **To `ba-integration-analyst`**: map `social` service endpoints listed in
  `scope.externalDependencies`; confirm envelope/error shape for
  reaction/comment/report calls per `.claude/rules/api-integration.md`; flag
  that pin/unpin (`US-101`) has no stable endpoint yet — mock-first per
  `FR-011`.
- **To `ba-use-case-modeler`**: model Given/When/Then for FR-001–FR-010
  including role variants (teacher/principal/student/parent) and all 4 UI
  states; explicitly write an AC for the mock-first pin/unpin behavior
  (FR-011) so it isn't silently treated as wired; the Report flow AC should
  assert the dialog opened is the SAME component/contract as US-E19.2 (no
  duplicate assertions of dialog internals — reference that story's AC).

## Dependencies

- **US-E19.1 depends on US-E19.2 for the shared Report-dialog contract**
  (`moderation.reportDialog.*` i18n namespace + `screens.moderation.reportDialog`
  design-spec entry, already defined once in DR-013/US-E19.2). This story's
  FR-007 references that contract and does NOT redefine it.
- **Sequencing for `/fe` parallel-branch claim/dependency check**: land
  **US-E19.2 first** (it owns the shared dialog contract + the `moderation`
  i18n namespace and touches the shared component `design_src/edu/ui.jsx` /
  `components/shared/report-content-dialog/`), then **US-E19.1 second** so
  its Report entry point can import an already-existing contract instead of
  stubbing one. If both must run in parallel sessions, they MUST NOT both
  create the `ReportContentDialog` component — US-E19.1 imports from wherever
  US-E19.2 places it; coordinate via the `fe-lead` dependency check
  (`.claude/rules/parallel-workflow.md` §1.4).
- Both stories consume the shared `EduSkeleton`/`EduEmpty`/`EduError` state
  primitives (already a design-system component set, no additional
  coordination needed beyond normal reuse).
- Out-of-scope sibling: US-E10.6 (messaging) also opens the same Report
  dialog contract from a message's context menu — not touched by either of
  these two stories, noted here only so `fe-lead` sees the third consumer
  when scheduling that story later.
