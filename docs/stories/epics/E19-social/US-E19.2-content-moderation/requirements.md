# US-E19.2 — Content Moderation — Requirements

Source design: `docs/design-requests/DR-013-content-moderation.md` (delivered),
`docs/product/design-spec.jsonc` → `screens.moderation` (~line 3745, incl.
shared `reportDialog` sub-entry ~line 3916), mockup `design_src/edu/moderation.jsx`
+ shared dialog in `design_src/edu/ui.jsx`. Lane: **high-risk** — destructive
remove-content action + audit trail = Audit/security and
Existing-behavior-adjacent hard-gate flags. Any authorization-rule decision
below MUST be escalated to `ba-lead` for an ADR (next ≥ `0023`) before `/fe`
implements it.

## 1. Requirements Summary

This story owns TWO parts that ship together because they share one report
entity/model: (1) the SHARED Report-content dialog contract (reason radio
group, quoted preview, submit) reused by the feed ("…" menu, US-E19.1) and
by messaging (US-E10.6, out of scope here, dependency only); (2) the
principal-facing Moderation screen — stat row, filterable report queue,
detail sheet, and a destructive Remove-with-confirm action that writes an
audit trail. Constraints: WCAG 2.1 AA, responsive, vi/en i18n, 4 UI states,
role-gated destructive action with mandatory confirm dialog.

## 2. Technical Requirements (JSON)

```json
{
  "requirementId": "TR-191",
  "title": "Content Moderation (incl. shared Report dialog contract)",
  "status": "Draft",
  "actors": [
    { "role": "teacher", "capabilities": ["trigger the shared Report dialog from feed/messaging (consumer only, contract defined here)"] },
    { "role": "principal", "capabilities": ["view Moderation screen", "filter/search report queue", "open report detail sheet", "dismiss a report", "remove reported content (destructive, confirm-gated)", "view moderation audit log (read-only)"] },
    { "role": "student", "capabilities": ["trigger the shared Report dialog from feed (consumer only, contract defined here)"] },
    { "role": "parent", "capabilities": ["trigger the shared Report dialog from feed (consumer only, contract defined here)"] }
  ],
  "functionalRequirements": [
    { "id": "FR-101", "priority": "Must", "description": "The system SHALL provide ONE shared Report-content dialog component (contract: `ReportContentDialog`, i18n under `moderation.reportDialog.*`) invokable with a content kind (post|comment|message), author name, and a quoted preview of the reported content — reused verbatim by US-E19.1 (feed) and by messaging (out of scope here, dependency-only).", "trigger": "any caller opens the dialog with kind + content + author", "preconditions": ["caller is not the content's own author"], "postconditions": ["dialog renders reason radiogroup (Spam/Ngôn từ không phù hợp/Bắt nạt/Thông tin sai/Khác), quoted preview clamp 3 lines, submit disabled until a reason is chosen (and a note is required when reason=Khác)"], "errorConditions": ["dialog opened without required kind/content → caller-side integration error, not a runtime user-facing error"] },
    { "id": "FR-102", "priority": "Must", "description": "The system SHALL submit a report on dialog confirm, creating a report record with reporter, reported content reference, reason, optional note, and timestamp; the reported content SHALL remain visible to the reporter (not auto-hidden).", "trigger": "submit button click with a valid reason selected", "preconditions": ["reason selected", "note present if reason=Khác"], "postconditions": ["report created", "toast 'Đã gửi báo cáo. BGH sẽ xem xét.' shown", "dialog closes"], "errorConditions": ["submit fails → dialog stays open with inline error, no toast"] },
    { "id": "FR-103", "priority": "Must", "description": "The system SHALL show three StatCards on the Moderation screen: Chờ xử lý (pending count), Đã xử lý tuần này (resolved-this-week count), Đã gỡ nội dung (removed count).", "trigger": "screen load / data refresh", "preconditions": ["principal role"], "postconditions": ["counts reflect current queue state"], "errorConditions": ["stat fetch fails → screen falls back to error state, FR-108"] },
    { "id": "FR-104", "priority": "Must", "description": "The system SHALL provide a filterable, searchable report queue: status tabs (Chờ xử lý/Đã xử lý/Tất cả), content-type select (Mọi loại/Bài viết/Bình luận/Tin nhắn), and free-text search across content/author/reporter.", "trigger": "filter/search interaction", "preconditions": ["principal role"], "postconditions": ["table/list re-filters client- or server-side per applied criteria"], "errorConditions": ["filtered result set empty → empty state variant FR-107 (filtered, not pending-tab positive tone)"] },
    { "id": "FR-105", "priority": "Must", "description": "The system SHALL open a detail sheet (focus-trapped) on report row click, showing full reported content + author, context (original post for comment reports; nearby messages for message reports, reported one highlighted), reporter + reason + optional note, duplicate-report list, and (when resolved) resolvedBy/resolvedAt/resolveNote.", "trigger": "row click / 'Mở chi tiết báo cáo {id}' action", "preconditions": ["principal role", "report exists"], "postconditions": ["sheet open with correct section visibility per report status"], "errorConditions": ["detail fetch fails → sheet shows inline error, does not silently show stale data"] },
    { "id": "FR-106", "priority": "Must", "description": "The system SHALL let a principal Dismiss a pending report (non-destructive) directly from the detail sheet footer, only when status===pending.", "trigger": "'Bỏ qua' click", "preconditions": ["principal role", "report status = pending"], "postconditions": ["report status → dismissed", "toast 'Đã bỏ qua báo cáo'", "audit log entry recorded"], "errorConditions": ["dismiss call fails → inline error, status unchanged"] },
    { "id": "FR-107", "priority": "Must", "description": "The system SHALL render the four required UI states for the queue: loading (EduSkeleton, 5 rows), empty — positive-tone variant when the pending tab has zero items ('Không có báo cáo nào chờ xử lý'), and a distinct filtered-empty variant ('Không tìm thấy báo cáo nào') when a non-empty queue is filtered to zero results — error (EduError + retry), and success (populated table + working filters).", "trigger": "data fetch lifecycle / filter application", "preconditions": [], "postconditions": ["correct empty-state variant shown depending on cause (true-empty vs filtered-empty)"], "errorConditions": [] },
    { "id": "FR-108", "priority": "Must", "description": "The system SHALL role-gate the destructive Remove-content action to principal (and, per design-spec, an 'admin' role not yet part of the product's 4-role model — see assumptions) ONLY, and SHALL require an explicit confirm dialog (role=alertdialog, focus-trapped) stating the action is irreversible and that the content author will be notified, before executing.", "trigger": "'Gỡ nội dung' click in detail sheet → confirm dialog 'Gỡ nội dung' click", "preconditions": ["principal role", "report status = pending"], "postconditions": ["content removed", "report status → removed", "author notified (via `noti` or equivalent)", "audit log entry recorded with actor + timestamp + reason", "toast 'Đã gỡ nội dung và thông báo cho người đăng'"], "errorConditions": ["remove call fails → confirm dialog shows inline error, content NOT marked removed client-side (no optimistic remove for a destructive action)", "authorization rejected server-side → distinct error surfaced, not silently swallowed"] },
    { "id": "FR-109", "priority": "Must", "description": "The system SHALL provide a secondary read-only 'Nhật ký kiểm duyệt' (audit log) tab showing a vertical timeline of all moderation actions (removed/dismissed), each with actor, action badge, content reference, timestamp, and reason.", "trigger": "tab switch to audit view", "preconditions": ["principal role"], "postconditions": ["timeline populated in reverse-chronological order"], "errorConditions": ["fetch fails → error state consistent with FR-107 pattern"] },
    { "id": "FR-110", "priority": "Should", "description": "The system SHALL show a duplicate-report count/list in the detail sheet so a principal can see how many people reported the same content before acting.", "trigger": "detail sheet open", "preconditions": ["content has >1 report"], "postconditions": ["duplicate list rendered with count in section header"], "errorConditions": [] }
  ],
  "nonFunctionalRequirements": [
    { "id": "NFR-101", "category": "Security", "requirement": "Remove-content is a destructive, audit-logged action. It MUST be role-gated server-side (not just UI-hidden), MUST require explicit confirmation, and MUST write an immutable audit trail entry (actor, timestamp, target, reason) on every remove/dismiss.", "measurableTarget": "100% of remove/dismiss actions produce a corresponding audit-log entry retrievable via GET /api/v1/rooms/{roomId}/moderation-audit; zero client-only trust — server rejects unauthorized calls with a distinct error code" },
    { "id": "NFR-102", "category": "Accessibility", "requirement": "Detail sheet and confirm dialog are correctly focus-trapped (Tab loop, Escape, return-focus-on-close); status badges carry icon + text (not color-only); destructive button visually and semantically distinct (danger variant).", "measurableTarget": "WCAG 2.1 AA; axe/impeccable zero critical violations on both dialogs" },
    { "id": "NFR-103", "category": "Responsive", "requirement": "Report table collapses to a stacked card list on narrow viewports; detail sheet remains usable at 375px.", "measurableTarget": "no layout break at 320px; table→card switch verified at ≤760px per design-spec" },
    { "id": "NFR-104", "category": "i18n", "requirement": "All static copy (dialog, stats, filters, table, detail sheet, confirm dialog, audit tab, toasts) sourced from the `moderation` i18n namespace (vi source + en mirror); this is the SINGLE source for `reportDialog.*` — no duplicate keys under `feed.*` or `messaging.*`.", "measurableTarget": "0 hardcoded strings; 0 duplicate report-dialog key sets across namespaces (grep check before merge)" },
    { "id": "NFR-105", "category": "Performance", "requirement": "Queue loading state must appear promptly; filter/search should feel immediate.", "measurableTarget": "skeleton visible ≤320ms after navigation; filter re-render ≤150ms perceived for client-side filtering" }
  ],
  "uiStates": ["loading", "empty-positive", "empty-filtered", "error", "success"],
  "dataDependencies": [
    { "source": "social", "entity": "report (create, list, resolve)", "sensitivity": "Confidential" },
    { "source": "social", "entity": "moderation audit log", "sensitivity": "Confidential" },
    { "source": "social", "entity": "reported content reference (post/comment/message)", "sensitivity": "Internal" },
    { "source": "noti", "entity": "author notification on removal", "sensitivity": "Internal" }
  ],
  "scope": {
    "inScope": [
      "Shared Report-content dialog: component contract, i18n keys (moderation.reportDialog.*), reason list, quote preview, submit/cancel, validation (note required for 'Khác')",
      "Moderation screen: stat row, view tabs (queue/audit), queue filter bar, report table + mobile card variant, detail sheet, confirm-remove dialog, audit timeline tab",
      "Role-gating + confirm-dialog requirement for the destructive remove action",
      "4 UI states incl. the empty-positive vs empty-filtered distinction"
    ],
    "outOfScope": [
      "BE Go implementation of any `social` service endpoint or the audit-log persistence mechanism",
      "Pixel-level UI implementation (owned by fe-nextjs-engineer against design-spec.jsonc)",
      "Messaging's own report entry point / message context menu (US-E10.6) — dependency only, not built here",
      "Feed's post/comment '…' menu and pin/unpin behavior — owned by US-E19.1",
      "Fine-grained tenant-scoping of which principal can moderate which school/class (assume single-tenant principal scope per roles-permissions.md until an ADR says otherwise)"
    ],
    "externalDependencies": [
      "BE service `social` (US-098): POST /api/v1/reports, GET /api/v1/reports, POST /api/v1/reports/{reportId}/resolve, GET /api/v1/rooms/{roomId}/moderation-audit, DELETE .../moderate-delete",
      "BE service `noti` (or equivalent) for author notification on content removal",
      "Shared Screen State Primitives (EduSkeleton/EduEmpty/EduError)"
    ]
  },
  "assumptions": [
    "[ASSUMPTION] design-spec.jsonc lists `roles: [\"principal\", \"admin\"]` for the moderation screen, but `docs/product/roles-permissions.md` defines only 4 roles (teacher/principal/student/parent) with no `admin`. This requirements doc treats `principal` as the sole in-product actor for moderation and treats 'admin' as either a future/system-operator concept outside this product's 4-role model or a documentation carryover — flagged as an open question below, NOT silently resolved.",
    "[ASSUMPTION] 'resolved this week' stat is calculated server-side (resolvedAt within the last 7 days); exact boundary (rolling 7 days vs calendar week) left to ba-integration-analyst/BE contract.",
    "[ASSUMPTION] Only one principal-moderation workflow exists per tenant — no multi-level escalation (e.g. principal → regional admin) in this story."
  ],
  "openQuestions": [
    "Is 'admin' (per design-spec.jsonc roles array) an intentional second actor for moderation, or a documentation artifact that should be corrected to 'principal' only? This affects role-gating implementation and should get an explicit answer/ADR from ba-lead before FR-108's authorization is implemented, since it's the hard-gated destructive action.",
    "Does the Remove-content action need a reason/category recorded beyond the original report's reason (e.g. moderator's own resolution note), and is that note mandatory or optional? design-spec shows `resolveNote` as mock/seed only — confirm the real field is optional free text."
  ]
}
```

## 3. Prioritized Requirements Summary (MoSCoW)

| ID | Requirement | Priority | Rationale |
| --- | --- | --- | --- |
| FR-101 | Shared Report dialog contract | Must | Single source of truth for 2+ consumers (feed, messaging); avoids i18n/component drift (DR-001 lesson) |
| FR-102 | Report submission | Must | Core safety mechanism |
| FR-103 | Stat row | Must | Explicit in design-spec, gives principal at-a-glance status |
| FR-104 | Filter/search queue | Must | Required for usable moderation at scale |
| FR-105 | Detail sheet | Must | Needed context before any resolution decision |
| FR-106 | Dismiss | Must | Non-destructive resolution path, required alternative to Remove |
| FR-107 | 4 UI states w/ empty variants | Must | Hard rule + explicit positive/filtered empty distinction in design-spec |
| FR-108 | Remove-content (destructive, confirm-gated) | Must | High-risk lane driver; irreversible + audit-critical |
| FR-109 | Audit log tab | Must | Security/compliance requirement — traceability of moderation decisions |
| FR-110 | Duplicate-report visibility | Should | Improves moderator decision quality, not blocking to ship |

## 4. Handoff Notes

- **To `ba-integration-analyst`**: map all `social` report/audit endpoints and
  the `noti` notification-on-removal call; confirm envelope/error mapping for
  the destructive delete path (must distinguish authorization failures from
  transient failures per `.claude/rules/api-integration.md`); confirm
  pagination/cursor shape for the report queue and audit timeline.
- **To `ba-use-case-modeler`**: model Given/When/Then for FR-101–FR-109
  including the mandatory confirm-dialog flow for FR-108 (irreversible +
  author-notified), the two distinct empty-state variants (FR-107), and a
  cross-story AC verifying that US-E19.1's feed report entry point invokes
  THIS story's dialog contract (no duplicate dialog assertions). Escalate
  FR-108's role-gating ambiguity (principal vs "admin") to `ba-lead` for an
  ADR before AC finalizes the authorization rule.

## Ba-Lead Decision — FR-108 role-gate (2026-07-12)

Resolved, no new ADR needed (decision `0022` already governs this — this is
applying it, not creating a new authorization rule): `docs/product/roles-permissions.md`
was stale, listing only 4 roles. Decision `0022` (admin-role-separation)
already added a real 5th role `admin` (`nav-config.ts` `Role` union), but the
Moderation screen's own route is `(app)/principal/moderation` (confirmed in
DR-013 and `docs/product/screens.md`) — there is no `(app)/admin/moderation`
route. **FR-108's destructive Remove-content action is role-gated to
`principal` only.** `roles-permissions.md` has been patched with an explicit
row for this route. If a future need arises for `admin` to also moderate,
that is a separate story/decision, not assumed here. Use `principal` (not
"principal-or-admin") in all downstream AC.

## Dependencies

- **This story OWNS the shared Report-dialog contract** (`moderation.reportDialog.*`
  i18n + `screens.moderation.reportDialog` design-spec entry + the
  `ReportContentDialog` component). US-E19.1 (Social Feed) and the
  out-of-scope US-E10.6 (messaging) both consume it — they must reference,
  not redefine, this contract.
- **Sequencing for `/fe` parallel-branch claim/dependency check**: this story
  (US-E19.2) SHOULD land **first**, or at minimum, if both stories run in
  parallel sessions, the shared dialog component and `moderation` i18n
  namespace must be built ONLY in this story's branch — `fe-lead` must treat
  US-E19.1 as depending on US-E19.2 per `.claude/rules/parallel-workflow.md`
  §1 dependency check (same shared component/contract = ràng buộc). If
  US-E19.1 is claimed first, `fe-lead` should either sequence it behind this
  story or have it stub the dialog trigger without redefining the contract,
  reconciling once this story merges.
- High-risk lane flags (Audit/security, Existing-behavior-adjacent) mean any
  authorization-rule decision here (notably FR-108's principal-vs-admin
  question) must go through `ba-lead` for an ADR (`docs/decisions/NNNN-*.md`,
  next ≥ `0023`) before implementation — do not let `/fe` decide this
  unilaterally.
