# DR-023 — Parent–Student Link Audit Trail

- **US**: US-E20.3 (backlog stub spawned by ADR `0064`), extends US-E20.1
  (Admin Parent–Student Link Management, DR-014).
- **Route**: no new route — surfaces inside the EXISTING
  `(app)/admin/parent-links` detail dialog (`PLDetailDialog`).
- **Mockup**: extends `design_src/edu/parent-links.jsx` — `PLDetailDialog`
  gains a new `PLAuditTrailSection` sub-component. No new `.jsx` file (this is
  a scoped extension of an existing screen, not a new screen).
- **Type**: **RECONCILE / EXTENSION** — the parent-links screen (table,
  create dialog, read-only detail dialog, unlink confirm) is fully
  implemented at `src/features/admin/parent-links/**` (DR-014, delivered
  2026-07-12). This DR does NOT redesign that screen; it adds the one thing
  ADR `0064` scoped as genuinely missing: a read-only audit trail of
  Create/Unlink events for a link.

## Already-implemented check (per `.claude/rules/uiux-workflow.md`)

- `src/features/admin/parent-links/` — full feature (domain/infra/presentation)
  exists, route wired, i18n namespace `parentLinks` exists in both
  `messages/vi.json` and `messages/en.json` (verified: `parentLinks.detailDialog`
  already has `title`, `student`, `parent`, `relationship`, `consent`,
  `linkedOn`, `note`, `consentSectionTitle`, `consentLoading` — a flat
  structure, NOT the nested draft shown in DR-014's own copy block; DR-014's
  markdown and the shipped JSON drifted, which is normal — the shipped JSON is
  ground truth here).
- **No `LinkAuditEntry` entity, no `getLinkAuditTrail` use-case, no audit UI**
  exist anywhere in `src/features/admin/parent-links/` — confirmed by ADR
  `0064` itself (Follow-Up section) and by grep. This is the genuine gap this
  DR fills.
- Precedent read directly: `academic-records`' `SealAuditEntry` +
  `AuditTrailTable` (table-based, screen-level tab) and `moderation`'s
  `AuditEntryEntity` + `AuditTimelineTab` (card-list, icon+text `StatusBadge`,
  actor + action text + timestamp + optional reason, `role="alert"`/skeleton
  scoped to the sub-region). Both are "own read-only entity + own query
  use-case, NOT the shared `audit-log` feature" — exactly ADR `0064` point 2.

## Design decision 1 — WHERE the trail lives

**Chosen: a new scoped sub-section inside the existing `PLDetailDialog`**,
directly below the already-existing `PLConsentDetailSection` (which
established the "sub-section with its OWN loading/error state, never blocks
the rest of the dialog" pattern in this very screen).

Rejected alternatives:
- **Screen-level dedicated "History" tab/view** (like `academic-records`'
  `audit-trail-table.tsx`, which is a full-width table tab on its own screen)
  — rejected because that screen is inherently multi-entity/batch-oriented
  (seal covers many classes×terms×years at once, so a flat table makes
  sense). Parent-links' audit is scoped to ONE link at a time; a screen-level
  table would need its own filter/search chrome for a scope that already has
  a natural home (the per-link detail dialog) — unjustified surface growth
  (YAGNI).
- **Filterable admin-wide audit screen** — rejected, same reasoning as ADR
  `0064` point 1: no aggregate BE endpoint exists, and a screen-level filter
  UI is speculative scope for a read-only trail nobody has asked to filter
  yet. Deferred explicitly (see Scope).

The detail dialog is opened per-row (`PLRowMenu` → "Xem chi tiết"), so the
trail is naturally already scoped to the right `linkId` — zero new navigation,
zero new route, matches the dialog's existing max-width (440px, per
`design-spec.jsonc` → `screens.parentLinks.detailDialog`).

## Design decision 2 — entry shape (mock-first reality check)

Per ADR `0064` §3 and the "what can the web side actually populate" scope
guard: the web only knows what its OWN mutations record (create/unlink
use-cases), since `core` has no audit-emission endpoint yet. `LinkAuditEntry`:

```ts
export interface LinkAuditEntry {
  entryId: string;
  linkId: string;
  action: "created" | "unlinked";
  actorId: string;
  actorName: string;      // the admin/principal who performed the action —
                           // known from the acting session (`/users/me`),
                           // NOT a BE-supplied field
  occurredAt: string;     // ISO — client-clock timestamp at mutation time (mock)
  note: string | null;    // ONLY populated for "created" (from the create
                           // dialog's optional note field, which already
                           // exists). "unlinked" never carries a note — the
                           // unlink confirm dialog (DR-014) has NO note input,
                           // so inventing one here would be UI the mockup
                           // doesn't have. Do not add a reason field to unlink.
}
```

Explicitly OUT per the mock-first reality check:
- No "affected data categories" breakdown (that's `ParentStudentConsent`,
  already shown separately in `PLConsentDetailSection` — do not duplicate).
- No cross-admin attribution beyond `actorName` from the current session —
  the web cannot know anything about actors from BEFORE it starts recording
  (see empty-state decision below).
- No IP/device/audit metadata — not captured by any mutation today, not
  invented here.

## Design decision 3 — states (the empty state is the DOMINANT initial state)

This trail did not exist when most links were created — EVERY currently
existing seeded link has ZERO entries on day one. The empty state must read
as "trail hasn't started yet," not "something's broken" or "no history for
this specific well-established link" (which would look like a data-loss bug
to an admin who knows the link is a year old):

- **Empty** (dominant, honest copy): icon `history`/`clock`, title "Chưa có
  lịch sử ghi nhận" ("No recorded history yet"), body explains recording
  starts now: "Lịch sử sẽ ghi nhận các thay đổi (tạo, gỡ liên kết) kể từ khi
  tính năng này được bật." ("History will record changes — created, removed —
  from when this feature was enabled.") No CTA (read-only, nothing to do).
- **Loading**: scoped skeleton (2 rows), mirrors `PLConsentDetailSection`'s
  own-loading-state pattern — never blocks the rest of the already-rendered
  dialog (student/parent/relation/consent rows render immediately from the
  already-fetched row).
- **Error**: scoped `role="alert"` banner + retry button, same visual
  language as `PLConsentDetailSection`'s error state (`bg-edu-error/10`,
  `text-edu-error-text`, `AlertTriangle` icon) — NOT a full-dialog error (the
  rest of the dialog stays usable).
- **Success**: reverse-chronological list, one row per entry —
  `StatusBadge` (icon + text, never color-only per `.claude/rules/accessibility.md`)
  for the action (`created` → tone `success`, icon `UserPlus`/`Link`;
  `unlinked` → tone `error`, icon `Unlink`/`X`), actor name, relative/short
  timestamp, and the optional note on its own line when present (mirrors
  `moderation`'s `AuditTimelineTab` reason-line pattern).

## Design decision 4 — filtering: explicitly deferred (YAGNI)

No search/date-range/action-type filter in this DR. A single link realistically
has at most 1–2 entries (create, and maybe one unlink) — filtering a list that
short has no user value today. If parent-links ever gets a screen-level trail
(decision 1's rejected alternative), filtering becomes relevant THEN, not now.

## Scope

- New entity `LinkAuditEntry` (domain, to be authored by `/fe` — this DR only
  specifies its shape for the mockup + design-spec, does not write TypeScript).
- New sub-component in the mockup: `PLAuditTrailSection` inside
  `PLDetailDialog`, with all 4 states demoable via the existing
  `PLStateChips` demo-state pattern (extend its options, do not fork a new
  chips component).
- Mock seed data: `PL_AUDIT_SEED` — most seeded links get `[]` (empty,
  matching decision 3), one or two representative links get a short
  `created`(+ optional `unlinked`) sequence to demonstrate the success state.
- **Out of scope**: screen-level trail/tab, filtering, BE wiring (mock-first
  per ADR `0064`), any change to the create/unlink dialogs themselves, any
  change to the shared `audit-log` feature (ADR `0064` explicitly forbids
  extending its `AuditEntityType` union).

## Design-spec entry

`docs/product/design-spec.jsonc` → extend `screens.parentLinks.detailDialog`
with a nested `auditTrailSection` key (component, states, action-badge
mapping) — added by `uiux-designer`. No new top-level screen entry.

## UX copy (i18n keys) — EXTENDS the existing `parentLinks` namespace

Namespace stays `parentLinks` (reuse, per already-implemented-check rule —
do NOT mint a parallel namespace). New keys added under
`parentLinks.detailDialog.auditTrail.*`, matching the shipped (flat) JSON
shape already in `vi.json`/`en.json`, not the nested draft in DR-014's own
markdown body:

```jsonc
// vi.json → parentLinks.detailDialog.auditTrail (new)
"auditTrail": {
  "sectionTitle": "Lịch sử liên kết",
  "loadingLabel": "Đang tải lịch sử…",
  "empty": {
    "title": "Chưa có lịch sử ghi nhận",
    "body": "Lịch sử sẽ ghi nhận các thay đổi (tạo, gỡ liên kết) kể từ khi tính năng này được bật."
  },
  "error": "Không tải được lịch sử liên kết. Vui lòng thử lại.",
  "retry": "Thử lại",
  "action": {
    "created": "Đã tạo liên kết",
    "unlinked": "Đã gỡ liên kết"
  },
  "notePrefix": "Ghi chú"
}
```

```jsonc
// en.json → parentLinks.detailDialog.auditTrail (mirror)
"auditTrail": {
  "sectionTitle": "Link history",
  "loadingLabel": "Loading history…",
  "empty": {
    "title": "No recorded history yet",
    "body": "History will record changes — created, removed — from when this feature was enabled."
  },
  "error": "Failed to load link history. Please try again.",
  "retry": "Retry",
  "action": {
    "created": "Link created",
    "unlinked": "Link removed"
  },
  "notePrefix": "Note"
}
```

Zero keys duplicated from `parentLinks.consentCategories`/`unlinkDialog`/
`createDialog` — the note text itself is NOT re-authored here, it's whatever
the admin typed in the (already-existing) create-dialog note field, just
displayed.

## A11y (WCAG 2.1 AA)

- Action badges: icon + text, never color-only (existing rule, existing
  pattern in this repo — `StatusBadge`).
- Scoped loading/error regions use `aria-busy`/`role="alert"` local to the
  sub-section, exactly like `PLConsentDetailSection` — screen-reader users
  are not told the whole dialog failed when only the trail sub-fetch failed.
- Read-only section — no interactive controls besides the retry button (no
  focus traps, no new keyboard patterns beyond what `Button` already provides).

## BE contract

None yet — `core` has no confirmed audit-emission endpoint for parent-links
(ADR `0064`, US-064 placeholder). Mock-first: `/fe` implements
`getLinkAuditTrail` against a mock repository seeded from the SAME mock data
source `create`/`unlink` use-cases already write to
(`mock-parent-student-link.repository.ts`), so the trail reflects mutations
made during a session even before a real endpoint exists.

## Dependencies

Depends on DR-014 (`parent-links` screen, delivered). Independent of any
other in-flight DR — touches only `parent-links`-scoped files
(`design_src/edu/parent-links.jsx`, `parentLinks` i18n namespace,
`screens.parentLinks` design-spec entry). No shared-token/palette change.

## Design-review (gate)

Verdict: **Pass** (self-audited by `uiux-lead` against the design system +
`.claude/rules/accessibility.md`, no separate `/impeccable` re-run needed —
this is a small extension reusing an already-audited pattern).

Evidence:
- **Tokens-only**: `PLAuditTrailSection` and its states use only `T.*`
  members already defined in `design_src/edu/tokens.js`
  (`T.teal`, `T.errorDark`, `T.errorDarkLight`, `T.textMuted`,
  `T.textPrimary`, `T.textSecondary`, `T.border`, `T.bg`) — no new hex, no new
  token, no ADR needed. Icon set reused from the file's existing `icons.jsx`
  (`clock`, `link`, `x`, `alertTriangle`) — no new icon added.
- **Pattern reuse, not reinvention**: structurally mirrors the real,
  already-shipped `pl-consent-detail-section.tsx` (own loading/error/empty/
  success states scoped to the sub-region, never blocking the rest of the
  dialog) and `moderation`'s `audit-timeline-tab.tsx` (icon+text action badge,
  actor + timestamp, optional note line). No layout primitive invented.
- **A11y (WCAG 2.1 AA)**: action badges are icon+text (never color-only);
  loading region is `aria-busy` + `sr-only` label; error region is
  `role="alert"` with visible retry button, scoped locally so a screen-reader
  user is not told the whole dialog failed; empty state has no dead CTA
  (nothing to do when read-only history has zero rows); no new keyboard
  pattern introduced beyond the existing `Button`/dialog semantics.
- **Honest states verified**: `PL_AUDIT_SEED` — 4 of 6 seeded links (`l2`–`l5`)
  are intentionally `[]` (the dominant, honest empty state per decision 3);
  `l1` demonstrates a single `created` entry; `l6` demonstrates a
  `created`→`unlinked`→re-`created` sequence with a note on the create entry
  only (unlink never carries a note, matching the real unlink dialog which
  has no note field — verified against `pl-unlink-dialog.tsx` / DR-014).
- **Demo-state wiring verified**: `auditState` is derived from the screen's
  EXISTING `PLStateChips` 3-way toggle (`status === 'ready' ? 'success' :
  status`) — no second chips component forked, confirmed by reading the diff
  in `af9c466`.
- **design-spec.jsonc validity verified**: parsed with the repo's
  `strip-json-comments` dependency (already in `package.json`) —
  `screens.parentLinks.detailDialog.auditTrailSection` present and
  well-formed; the file's pre-existing "naive `//`-stripper breaks on
  `http://` URLs" issue (present before this DR too) does not affect the
  proper JSONC-aware parse.
- **i18n key parity verified**: `parentLinks.detailDialog.auditTrail.*` — 9
  leaf keys, identical structure in `vi.json`/`en.json`, diffed directly by
  `uiux-lead` before commit; no duplicate/parallel namespace created.
- **Scope discipline**: no change to `create`/`unlink` dialogs, no new route,
  no screen-level filter UI (explicitly deferred per decision 4), no
  extension of the shared `audit-log` feature's `AuditEntityType` union (ADR
  `0064` compliance).

## Status

- [x] delivered (2026-07-25)
- **Note (2026-09-02, US-E24.0b):** the reference mockup `design_src/edu/parent-links.jsx`
  is now **superseded by designer bundle 0209 v3** (R1) — the bundle independently
  restored `PLAuditTrailSection` in the SAME placement this DR specified (inside
  `PLDetailDialog`, below the consent section), and additionally models
  `consent_agreed`/`consent_declined` actions alongside `created`/`unlinked`. This is a
  mockup-only sync (`design_src/`); the shipped FE code at
  `src/features/admin/parent-links/**` is unchanged by this note — the design decisions,
  entity shape, i18n keys, and a11y evidence recorded above in this DR remain the
  reference for the actual implementation, extended with the two new consent actions
  if/when the FE team revisits this feature.
