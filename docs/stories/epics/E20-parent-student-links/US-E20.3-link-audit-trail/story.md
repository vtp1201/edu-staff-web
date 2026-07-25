# US-E20.3 Parent–Student Link Audit Trail

## Status

implemented

## Lane

normal

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- Depends on: US-E20.1 (implemented — `PLDetailDialog`,
  `PLConsentDetailSection` pattern, `MockParentStudentLinkRepository`,
  `CreateParentStudentLinkUseCase`/`UnlinkParentStudentLinkUseCase`)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/parent-links/**` (domain +
  infrastructure + presentation), `src/bootstrap/di/parent-student-link.di.ts`
- Shared contract/file: `IParentStudentLinkRepository` (`AuthContext`
  extended additively with `actorId`/`actorName`), reuses
  `ParentStudentLinkFailure` union (no change), reuses
  `parentLinks.detailDialog.auditTrail.*` i18n keys (already shipped, no
  edit expected)

## Product Contract

Show a read-only, reverse-chronological Create/Unlink history for a
parent-student link inside its existing admin detail dialog. Entries are
recorded by the web's own existing create/unlink mutations (mock-first — no
`core` audit endpoint exists yet). The trail is feature-scoped (own entity,
own query use-case, own mock repository method inside
`src/features/admin/parent-links/`) per ADR `0064`, which explicitly forbids
extending the shared `audit-log` feature's `AuditEntityType` union. The
sub-section owns its own loading/empty/error state — a trail-fetch failure
never blocks the rest of the already-rendered dialog. Append-only: no
edit/delete/filter surface.

## Relevant Product Docs

- `docs/design-requests/DR-023-parent-link-audit-trail.md` (delivered
  2026-07-25, merged `c6c9bfb`)
- `docs/decisions/0064-audit-trail-emission-policy.md` (binding on ownership)
- `docs/product/design-spec.jsonc` →
  `screens.parentLinks.detailDialog.auditTrailSection`
- `docs/product/screens.md` (Parent–Student Links row, already updated)
- `design_src/edu/parent-links.jsx` (`PLAuditTrailSection`)

## Acceptance Criteria

Full Given/When/Then set in `use-cases.md` (17 scenarios across 7 use
cases). Summary:

- Section renders inside the existing detail dialog with its own scoped
  loading/empty/error/success states (never blocking the rest of the dialog).
- Empty state is the dominant, honest default (no CTA) — every link created
  before this feature shipped starts with zero entries.
- Success state lists entries reverse-chronologically with an icon+text
  action badge (never color-only), actor name, timestamp, and an optional
  note shown ONLY on 'created' entries.
- Exactly one audit entry is recorded per successful `createLink`/
  `unlinkLink` call; a failed mutation records nothing.
- A link's audit trail persists even after the link is removed from the
  active-links list (the unlink event itself must remain visible).
- No edit/delete/filter affordance exists anywhere (append-only, YAGNI).

## Design Notes

- Commands: none new — reuses the existing `createLink`/`unlinkLink`
  use-cases, now with a side-effect (audit emission) added after their
  existing success path.
- Queries: `getLinkAuditTrail(linkId)` — new, feature-scoped, mock-first.
- API: none confirmed — `core` has no audit-emission endpoint (ADR `0064`).
  Contract-first guidance only: `GET /api/v1/parent-student-links/{linkId}/audit-trail`.
- Tables: n/a (no persistent storage — in-memory mock store,
  `AUDIT_STORE: Record<string, LinkAuditEntry[]>`, keyed by `linkId`,
  independent of the active-links `STORE` array).
- Domain rules: append-only (unshift-only, never sort/mutate/delete);
  `note` non-null only for `action === "created"`; a failed mutation
  produces zero audit side-effects; `actorId`/`actorName` come only from the
  acting session's own `AuthContext`.
- UI surfaces: `PLAuditTrailSection` inside `PLDetailDialog`, below
  `PLConsentDetailSection`.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E20.3 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | `GetLinkAuditTrailUseCase` delegate; mock repo `getLinkAuditTrail` (empty/seeded/post-emission); `recordAuditEntry` exactly-once-on-success / zero-on-failure for create AND unlink (incl. forged-role + cross-tenant forbidden cases); deterministic clock/ordering via `__setMockAuditClock`; note-only-on-created invariant |
| Integration | `makeParentLinksAuthContext()` actorId/actorName population; Server Action reuses existing `toActionResult`/`isRetryableFailure` (no regression) |
| E2E | Storybook interaction: all 4 section states, `l6` create→unlink→re-create ordering, note-visible vs note-absent, keyboard-reachable retry, color-independence spot-check |
| Platform | `tsc --noEmit` clean with extended `AuthContext`/`IParentStudentLinkRepository`; `bun run build` OK; grep confirms zero new references to `src/features/audit-log/` |
| Release | Design-review gate (tokens/a11y/states) |

## Evidence

Design review: pass
- design-system: conform — canonical shared `StatusBadge` (`tone="teal"`/
  `tone="error-dark"`) for action badges, no raw color; new
  `PLSectionErrorBanner` extracted to fix a decision-0026 duplication
  flagged by `fe-tech-lead-reviewer` (byte-identical error banner had been
  inlined in both `PLConsentDetailSection` and the new
  `PLAuditTrailSection`); `docs/product/design-spec.jsonc` →
  `screens.parentLinks.detailDialog.auditTrailSection` corrected in the
  same review pass (stale `--edu-error-dark`/`--edu-error-dark-light`
  values replaced with the shipped `bg-edu-error/10`/`text-edu-error-text`
  pair per AC-101.3; `actionBadgeMapping` tone labels aligned to the
  shipped `StatusTone` vocabulary — colors were already correct).
- a11y: WCAG AA — `fe-accessibility-auditor` found 1 Major (A11Y-001,
  WCAG 4.1.3: loading wrapper missing `role="status"`, a regression from
  the already-approved `PLConsentDetailSection` sibling pattern), fixed in
  the same commit as the duplication fix; contrast/keyboard/motion/
  color-independence/FR-109-negative-scope all verified clean.
- impeccable audit: not run as a separate slash-command pass — this is a
  small, pattern-mirroring extension of an already-audited screen
  (US-E20.1), and the substance of the checklist (tokens-only, a11y,
  reused component patterns, 4-state coverage) was covered end-to-end by
  `fe-tech-lead-reviewer` + `fe-accessibility-auditor`'s independent
  passes above; no anti-pattern or generic-AI-look risk identified.
- states: loading (skeleton, `aria-busy`+`role="status"`+`sr-only` label) /
  empty (dominant, no CTA, non-error tone) / error (`role="alert"` +
  keyboard-reachable retry, section-scoped) / success (reverse-chron list,
  icon+text action badge, optional note-only-on-created) all covered by
  Storybook interaction tests; verified via Storybook interaction suite,
  not manual 320px/dark-mode click-through (reuses the already-verified
  `PLDetailDialog` responsive shell, `max-w-110`, unchanged by this story).

QA gate: CONDITIONAL PASS → closed. `fe-qa-playwright` mapped all 17
use-cases.md AC scenarios to a real test (16/17 clean on first pass) and
found 1 Major defense-in-depth gap (DEF-1): the note line in
`PLAuditTrailSection` was gated only on `entry.note` truthiness, not on
`entry.action`, so a hypothetical future repository/BE payload echoing a
note on an `unlinked` entry would have leaked it onto the row (not
reachable today — the mock repository already normalises
`note: action === "created" ? note : null`). Fixed with an
action-scoped render guard + a `renderToStaticMarkup` regression test
(`pl-audit-trail-section.test.tsx`) proving suppression holds by
construction, mirroring this repo's `sd-self-approved-note.test.tsx`
pattern. 17/17 AC now covered. Full suite after the fix: 420 files /
2843 tests passing; `tsc --noEmit` clean.

**Follow-up (not built by this US, deliberate):** `LinkAuditEntry.note`
is `string | null` for BOTH actions — the note-only-on-created invariant
is enforced at two runtime layers (repository normalisation +
render-level guard) but not at the TYPE level, so the illegal state
(`{ action: "unlinked", note: "..." }`) remains constructible. A
discriminated union (`{ action: "created"; note: string | null } | {
action: "unlinked"; note: null }`) would turn DEF-1 into a compile
error, but ripples into the mapper/mock-store/fixtures beyond this
story's scope — track as a small follow-up story if/when this entity
gets a real `core` repository branch, not expanded here.

## Harness Delta

- `docs/TEST_MATRIX.md` US-E20.3 row description updated to point at this
  packet (`docs/stories/epics/E20-parent-student-links/US-E20.3-link-audit-trail/`)
  instead of the bare ADR-`0064` backlog-stub description.
- `harness.db` `story` row for `US-E20.3` updated: `contract_doc` points at
  this `story.md`; status flipped to `implemented` with `unit=1
  integration=1 e2e=1 platform=1` (real proof: 420 files/2843 vitest tests,
  149 files/1051 Storybook interaction tests, `tsc --noEmit` clean, `bun
  run build` clean, `fe-tech-lead-reviewer` Approved, `fe-accessibility-auditor`
  clean-after-fix, `fe-qa-playwright` 17/17 AC covered).
- No new ADR raised by this packet — ADR `0064` already resolved the shape
  question; this packet only resolves the remaining ENGINEERING mechanics
  (emission wiring, clock/determinism, actor sourcing) that the ADR
  deliberately left to the eventual story packet.
