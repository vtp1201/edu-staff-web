# DR-011 — UX Polish: Confirmations, Navigation, Loading & Feedback

| Field | Value |
|---|---|
| DR | 011 |
| Slug | ux-polish-interactions |
| Lane | **normal** (cross-cutting UX patterns; no new design-system tokens) |
| Branch | `docs/dr-011-ux-polish-interactions` |
| Stories | UX-02 / UX-04 / UX-05 / UX-06 / UX-07 / UX-08 (from impeccable critique post-DR-009) |
| Routes | `/announcements`, `/discipline`, `/staff-leave`, `/grades`, `/admin/school-setup` (+ any screen with destructive actions, detail panels, or stat-card grids) |
| Roles | Teacher, Principal, Admin (primary); Parent (mobile consumer) |
| Status | [x] delivered (2026-06-21) |

## Why 1 DR (not split)

All 6 issues are **cross-cutting interaction patterns** — none requires a new screen or JSX mockup file; each resolves to a shared component spec + design-spec.jsonc entry + copy keys. Splitting into 6 DRs would create 6 branches and 6 README rows for identical-weight work. A single DR is appropriate and matches the DR-010 precedent (responsive + empty states as one cross-cutting DR). The `/ba` handoff will break them into separate ACs per component.

## Already-Implemented Check

- `DeleteConfirmDialog` exists in `exam-bank`, `grade-approval`, `admin-roster` as **feature-local** copies — **not** in `components/shared/`. This confirms the need for a canonical `DestructiveConfirmDialog` in `components/shared/`. Action: spec the shared component; FE will consolidate.
- `RosterBreadcrumb` exists in `admin-roster` as a feature-specific variant — **not** in `components/shared/`. Action: spec a generic `DetailPanelHeader` for drawer/sheet back navigation.
- `ExamBankSkeleton`, `GradeEntrySkeleton`, `GradeApprovalSkeleton` exist feature-locally — already follow the correct pattern (shadcn `Skeleton`, `role="status"`, i18n). Action: spec the pattern rule; FE applies to missing screens.
- School setup screen has `STEP_DEFS` with step labels and progress state via `getSetupProgress()` but **no visual progress bar or "Bước N/M" indicator**. Action: spec `SetupStepper` upgrade.
- No `violation.deleteDialog` keys exist in `discipline.violations` namespace. **Net-new keys needed.**
- `announcements.sendToast` is generic; `announcements.sendToastContext` (with `{recipientCount}` + `{time}`) is net-new.

## Issues in Scope

### P2

#### UX-02 — Destructive Confirmation Dialog

**Problem:** Three high-stakes actions lack standardized confirm dialogs:
1. "Gửi thông báo toàn trường" in `/announcements` — broadcasts to 312 recipients
2. "Từ chối đơn nghỉ phép" in `/staff-leave` — triggers staff notification
3. "Xóa vi phạm" in `/discipline/violations` — permanent deletion

`exam-bank` and `grade-approval` already have per-feature confirm dialogs using `AlertDialog` — but each was created independently with no shared component.

**Design decision:** Spec a canonical `DestructiveConfirmDialog` in `components/shared/destructive-confirm-dialog/` built on shadcn `AlertDialog`. This consolidates existing feature-local dialogs.

**Spec:** see `docs/product/design-spec.jsonc` → `interactionPatterns.destructiveConfirmDialog`

**Canonical home:** `components/shared/destructive-confirm-dialog/` — per component-organization rule (composed, used ≥2 screens).

**i18n:** `announcements.sendConfirmTitle`, `announcements.sendConfirmBody`, `announcements.sendToastContext`; `discipline.violations.deleteDialog.*`; `staffLeave.rejectConfirmTitle`, `staffLeave.rejectConfirmBody` (see messages files). Note: `staffLeave.actions.confirmReject` already exists for the CTA label.

#### UX-04 — Breadcrumb / Back Navigation in Detail Panels

**Problem:** Detail drawers and sheets (announcements detail, group-chat info panel, exam builder) lack a consistent back affordance. Users lose orientation inside nested panels.

**Design decision:** Spec `DetailPanelHeader` in `components/shared/detail-panel-header/`. Uses `Button variant="ghost"` with chevron-left + label. Minimum touch target 44×44px per WCAG 2.5.5.

**Spec:** see `docs/product/design-spec.jsonc` → `interactionPatterns.detailPanelHeader`

**Canonical home:** `components/shared/detail-panel-header/` — used in announcements drawer, group-chat info panel, exam-builder header (≥3 screens).

**i18n:** no new keys needed — consumers pass `backLabel` dynamically from their own namespace (e.g. `t("announcements.backToList")`). If backLabel keys are missing in feature namespaces, `/fe` adds them at implementation time.

#### UX-05 — Loading Skeletons

**Problem:** Screens using real API data show blank areas during fetch. The exam-bank, grade-entry, and grade-approval screens already have feature-local skeletons — but discipline dashboard, teacher dashboard, student dashboard, and lesson-bank stat-card grids do not.

**Design decision:** Spec the `StatCardSkeleton` shape and `TableRowSkeleton` shape as normative rules. Feature-local files stay feature-local (no forced shared promotion — shapes differ per screen). Apply shimmer via shadcn `Skeleton` (`animate-pulse` on `bg-muted`), gated by `motion-safe:`.

**Spec:** see `docs/product/design-spec.jsonc` → `interactionPatterns.loadingSkeleton`

**i18n:** `Common.skeleton.loading` + `Common.skeleton.loadingAriaLabel` — net-new under `Common` namespace.

#### UX-08 — Touch Target ≥44px on Mobile

**Problem:** Grade table cells and audit/violation log rows render at 28–32px height on mobile, below WCAG 2.5.5 AA minimum (44×44px for interactive elements).

**Design decision:** Enforce `min-h-[44px]` (equivalent `min-h-11`) on all interactive rows and cells. For grade table: sticky first column on mobile (`position: sticky; left: 0; bg-card; z-10`). No new token — Tailwind utility only.

**Spec:** see `docs/product/design-spec.jsonc` → `interactionPatterns.touchTarget`

**i18n:** none needed.

### P3

#### UX-06 — Toast Context

**Problem:** Generic toasts like "Đã gửi thông báo", "Đã ghi nhận vi phạm thành công!" give no context about who was affected or when.

**Design decision:** Add contextual toast variants that include entity/count/timestamp. Existing keys are NOT deleted — they remain as fallback. New contextual keys are used when context is available at call site.

**Spec:** see `docs/product/design-spec.jsonc` → `interactionPatterns.contextualToast`

**i18n:** `announcements.sendToastContext` (net-new), `discipline.violations.deleteToast` (net-new). `staffLeave.toast.*` already contextual enough.

#### UX-07 — Onboarding Stepper Progress

**Problem:** School Setup guide lists 5 steps but shows no progress indicator. Users can't tell "I'm on step 2 of 5" at a glance.

**Design decision:** Add a `SetupStepper` progress bar + "Bước N/M" counter to the existing `school-setup-screen`. Feature-local for now (single screen); promote to `components/shared/` when a second onboarding flow is built.

**Spec:** see `docs/product/design-spec.jsonc` → `interactionPatterns.setupStepper`

**i18n:** `adminSetup.stepper.*` — net-new sub-namespace under existing `adminSetup`.

## Constraints

- **Design system supreme:** tokens-only. No new token invented. All colors from existing `--edu-*` / semantic tokens.
- **WCAG 2.1 AA:** focus trap on dialogs (Radix AlertDialog handles), keyboard navigation, `aria-busy` on loading states, `aria-label` on icon-only buttons, `aria-label` + `role="progressbar"` on stepper.
- **Motion-safe:** skeleton pulse gated by `motion-safe:animate-pulse`; stepper progress bar transition gated by `motion-safe:transition-[width]`.
- **No app code:** this DR stops at design-spec + copy keys. `/ba` writes AC; `/fe` builds.

## Deliverables

- [x] `docs/design-requests/DR-011-ux-polish-interactions.md` (this file)
- [x] `docs/design-requests/README.md` updated
- [x] `docs/product/design-spec.jsonc` → `interactionPatterns` section (6 sub-entries)
- [x] `src/bootstrap/i18n/messages/vi.json` + `en.json` — 21 new keys (see above)
- [x] Design-review gate — Approved (2026-06-21)

## Handoff to /ba + /fe

When delivered, run `/ba` with this DR + `docs/product/design-spec.jsonc#interactionPatterns` as input. The BA team should produce ACs for:

1. **`DestructiveConfirmDialog`** shared component — consolidate `exam-bank`, `grade-approval`, `admin-roster` dialogs + add announcements/violations/staff-leave instances
2. **`DetailPanelHeader`** shared component — wire announcements detail, group-chat info, exam builder
3. **Skeleton coverage** — add `StatCardSkeleton` to discipline dashboard, teacher dashboard; add `TableRowSkeleton` to grade-entry and discipline-conduct table
4. **Touch target audit** — `min-h-[44px]` fix on grade table rows + violation log rows
5. **Contextual toast** — update announcements send and violation record flows
6. **`SetupStepper`** — add progress bar + "Bước N/M" to school-setup-screen

Feature areas for `/fe`:
- `src/components/shared/destructive-confirm-dialog/` (new shared component)
- `src/components/shared/detail-panel-header/` (new shared component)
- `src/features/admin-school-setup/presentation/school-setup-screen/` (stepper)
- `src/features/discipline/presentation/` (skeleton + touch target + confirm dialog + contextual toast)
- `src/features/grades/presentation/` (touch target, table sticky col)
- `src/features/notification/presentation/announcements/` (confirm dialog + contextual toast)
- `src/features/staff-leave/presentation/` (confirm dialog upgrade)
