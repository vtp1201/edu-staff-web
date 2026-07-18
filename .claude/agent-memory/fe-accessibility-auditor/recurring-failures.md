---
name: recurring-failures
description: A11y failure patterns that recur across edu-staff-web screens — check these first on every audit
metadata:
  type: feedback
---

## Contrast — Status badges using self-color as text
Pattern: `bg-edu-{status}/[0.18] text-edu-{status}` — the text color and background share the same hue; at low opacity the background is nearly white, giving < 2:1 contrast.
Fix: Use `text-edu-text-primary` (or `--edu-{status}-foreground` when it passes) for badge text on tinted backgrounds.
Seen in: US-E12.2 (active year badge, graded term badge).

## Contrast — text-muted-foreground on content text
Pattern: Using `text-muted-foreground` (#8898a9) for real content (dates, counts) rather than decorative placeholders.
Ratio: 2.75–2.95:1 on light surfaces — fails 4.5:1 for normal text.
Fix: Use `text-muted-foreground` only for placeholder / helper text where alternative cues exist; use `text-edu-text-secondary` or `text-foreground` for real data.
Seen in: US-E12.2 (date columns, table header labels).

## Keyboard — Accordion: aria-controls missing
Pattern: Accordion trigger buttons have `aria-expanded` but no `aria-controls` pointing to the panel ID, and the panel has no `id`. Screen readers cannot programmatically navigate trigger → panel.
Fix: Add matching `id` to each panel div and `aria-controls={panelId}` to its trigger button.
Seen in: US-E12.2.

## Keyboard / Focus — Inline edit row: no focus management
Pattern: When edit mode activates (replacing static row with inputs), focus stays on the edit button which is now removed from DOM. SR users hear no confirmation that the UI changed.
Fix: After `startEdit()` sets state, `useEffect` detects editing state and moves focus to the first input (name field) via a ref.
Seen in: US-E12.2.

## Touch — Icon action buttons 32px (size-8)
Pattern: Edit/Delete/Save/Cancel icon-only buttons use `size-8` (32×32px) which is below the 44×44px mobile touch target minimum.
Fix: Add `className="size-8 min-h-[44px] min-w-[44px]"` or wrap with a 44px hit-area using negative margin / padding, or use `size-11` (44px) and constrain the visual icon.
Seen in: US-E12.2.

## Contrast — edu-success as icon color on edu-success background
Pattern: Check icon `text-edu-success-foreground` (white) inside a `bg-edu-success` circle — 1.72:1, fails 3:1 icon minimum.
Fix: Use `text-edu-text-primary` (#2a3547) for icons/text on edu-success backgrounds (gives 7.17:1).
Seen in: School Setup screen (step completion circles).

## Contrast — edu-error as error text on edu-error-light
Pattern: `text-edu-error (#fa896b)` used for error message text on `bg-edu-error-light (#fff5f2)` — 2.21:1, fails 4.5:1.
Fix: Use `text-edu-text-primary` for error message text; keep edu-error only for icons/borders.
Seen in: School Setup screen (unconfigured grade banner, validation error text).

## A11y — Repeated action buttons without contextual aria-label
Pattern: Multiple identical button texts ("Cài đặt", "Mở") rendered for each of N steps — screen reader announces all as the same action with no step context.
Fix: Add `aria-label={t("guide.configureAriaLabel", { step: tSteps(step.labelKey) })}` to each button; add matching i18n key.
Seen in: School Setup screen (Configure + Open buttons in step lists).

## Forms — Label not programmatically linked to Input
Pattern: `Field` helper component renders `<Label>{label}</Label><Input />` with no `htmlFor`/`id` pairing.
Fix: Generate or accept an `id` prop; set `<Label htmlFor={id}>` and `<Input id={id}>`.
Seen in: US-E07.4 profile-screen.tsx (all personal info fields, current/new/confirm password).

## Contrast — info/teal tones: self-color text on own /15 tint
Pattern: `bg-edu-info/15 text-edu-info` (#539BFF on #E5F0FF = 2.43:1) and `bg-edu-teal/15 text-edu-teal` (#00B8A9 on #D9F4F2 = 2.15:1) both fail AA.
Fix: Use `text-edu-text-primary` (#2A3547) for badge text on info/teal tinted backgrounds.
Seen in: US-E07.4 StatusBadge TONE_CLASS map (info and teal entries).

## Contrast — purple tone just misses AA
Pattern: `bg-edu-purple/15 text-edu-purple` (#7B5EA7 on #EBE7F2 = 4.32:1) — 0.18 below the 4.5:1 threshold.
Fix: Use `text-edu-text-primary` (#2A3547) or add a `--edu-purple-text` dark variant (~#5B3D8A, needs verification).
Seen in: US-E07.4 StatusBadge TONE_CLASS map (purple entry).

## Contrast — muted badge text fails
Pattern: `bg-muted text-muted-foreground` used for "done" status badges = #8898A9 on #F5F7FA = 2.76:1 — fails AA for badge text.
Fix: Use `text-foreground` (#2A3547) on muted background for badge content.
Seen in: US-E07.4 teacher-dashboard.tsx (done period status).

## Focus — Search input outline-none without label focus-within ring
Pattern: Raw `<input type="search" className="...outline-none">` inside a styled `<label>` wrapper. The `outline-none` removes the browser default focus ring; the label wrapper has no `focus-within:ring-2` class either. Keyboard users get no visible focus indicator on the search field.
Fix: Add `has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring` to the label wrapper, OR remove `outline-none` from the input and add `focus-visible:ring-0` (to let the label handle it). Never use `outline-none` on an interactive element without a replacement ring.
Seen in: US-E12.4 (roster-table.tsx search, add-student-panel.tsx search).

## Semantic — Search clear button aria-label reuses wrong i18n key
Pattern: X button inside search input reuses `table.clearSelection` ("Bỏ chọn") which is the checkbox deselect action. Screen reader announces "Bỏ chọn" for a search-clear action — confusing context switch.
Fix: Add a dedicated `adminRoster.table.clearSearch` key = "Xóa tìm kiếm" and use it for the search clear button aria-label.
Seen in: US-E12.4 (roster-table.tsx line 118).

## Semantic — Pagination nav aria-label reuses breadcrumb key
Pattern: `<nav aria-label={t("breadcrumb.roster")}>` on the pagination nav = "Danh sách học sinh". A screen reader announces the pagination landmark as "Danh sách học sinh navigation" — same as the page section. Should be "Phân trang" or "Điều hướng trang".
Fix: Add dedicated `adminRoster.pagination.nav` = "Phân trang" key and use it.
Seen in: US-E12.4 (roster-pagination.tsx line 57).

## Table — th elements missing scope="col"
Pattern: `<th>` elements in data tables rendered without `scope="col"` attribute. Screen readers can still infer column headers from position, but explicit `scope` is required by WCAG 1.3.1 for complex tables. Root cause: shadcn `TableHead` component (`components/ui/table/table.tsx`) does not inject `scope` automatically; callers must pass it explicitly or the component must add a default.
Fix: Add `scope="col"` to all `<th>` elements in `<thead>`, or add `scope="col"` as a default prop in `TableHead` to fix it globally for the entire app.
Seen in: US-E12.4 (roster-table.tsx, all 8 th elements), US-E13.5 (principal-teachers-screen.tsx, all 6 th elements).

## Heading hierarchy — page h2 sections with no h1
Pattern: Feature pages render `<h2>` section headings (stat cards, schedule, pending grades, notifications) but no `<h1>` in the page or its RSC wrapper. AppShell injects `<main>` but no heading. Screen reader heading navigation finds no h1.
Fix: Add `<h1 className="sr-only">{t("pageTitle")}</h1>` at the top of the client component root, with a matching i18n key in both `vi.json` and `en.json` under the feature namespace.
Seen in: US-E13.4 teacher-dashboard-home.tsx.

## Radix Sheet — aria-describedby={undefined} silences SheetDescription
Pattern: Passing `aria-describedby={undefined}` on `SheetContent` overrides Radix's automatic wiring of `SheetDescription` text to the dialog's `aria-describedby`. The description is still visible but programmatically silenced. This occurs when developer wants to suppress the "Missing Description" warning without removing the visible description element.
Fix: Remove `aria-describedby={undefined}`. Radix wires `SheetDescription` automatically; no override needed. If no description element is present, use `<SheetDescription className="sr-only">` with meaningful context for screen readers.
Seen in: US-E13.5 teacher-assignment-sheet.tsx (teacher email as SheetDescription).

## Lucide SVG icon aria-label: unreliable without role="img" (CORRECTED 2026-07-19)
Pattern: `<TriangleAlertIcon aria-label="..." />` used as a "standalone meaningful icon". **Correction**: lucide-react's `defaultAttributes` (verified by reading `node_modules/lucide-react/dist/cjs/lucide-react.js`, US-E23.1 audit) do NOT include `aria-hidden`/`focusable` — only `xmlns/width/height/viewBox/fill/stroke/strokeWidth/strokeLinecap/strokeLinejoin`. So a bare `aria-label` on an unmodified lucide icon is NOT silently ignored by an `aria-hidden` default (there is no such default) — but it's still unreliable because a plain `<svg>` with no `role` has ambiguous/inconsistent implicit-role handling across browsers/AT combos (some expose it as an unnamed graphic, `aria-label` support on plain non-role'd SVG is inconsistent). The safe, portable pattern is still the same conclusion as before, just for a different reason: pair a meaningful icon with `role="img"` explicitly (or a sibling `sr-only` span), and ALWAYS add `aria-hidden="true"` explicitly to any purely decorative icon (never assume the library does it for you — see the separate "lucide default attrs" note below).
Fix: Meaningful/standalone icon → `<TriangleAlertIcon role="img" aria-label="..." />`. Decorative icon (adjacent visible text already carries the meaning) → `<Icon aria-hidden="true" />` explicitly, every time.
Seen in: US-E13.5 principal-teachers-screen.tsx TriangleAlertIcon inside StatusBadge (table column); re-verified against lucide source in US-E23.1.

## Contrast — Small action buttons: bg-primary on 11px text fails by margin
Pattern: `bg-primary text-primary-foreground` on buttons with `text-[11px]` or smaller. `--primary: --edu-primary-dark: #4570EA` on white = 4.41:1 — barely below the 4.5:1 threshold for normal text.
Fix: Use `bg-edu-primary-accessible` (#4468E0, 4.88:1) for small-text buttons instead of `bg-primary`. The token already exists (decision 0031). Do not change `--primary` globally.
Seen in: US-E13.4 "Nhập điểm" button (text-[11px] font-bold).

## Contrast — text-destructive (#fa896b) as error text on light surfaces
Pattern: `<p role="alert" className="text-sm text-destructive">` where `--destructive` resolves to `--edu-error` = `#fa896b`. On `bg-card` (white) = ~2.46:1; on `bg-background` (#f5f7fa) = ~2.38:1. Both fail SC 1.4.3 for normal text.
Fix: Use `text-edu-error-text` (`--edu-error-text: #c0392b`) which gives 5.1:1 on white. Apply globally wherever `text-destructive` is used for error message paragraphs (not icons/borders).
Seen in: US-E01.2 login-form.tsx line 125, role-select.tsx line 121.

## Contrast — Tiny badge text at 10px on muted-foreground
Pattern: Role enum badge (`card.roleEnum`) and VNeID "coming soon" badge use `text-muted-foreground` (#8898a9) at `text-[10px]` on `bg-[var(--edu-bg)]` (#f5f7fa). WCAG "large text" starts at 18px (or 14px bold); 10px bold is normal text. Ratio ~3.07:1 fails 4.5:1 required.
Fix: Use `text-foreground` (#2a3547) or `text-edu-text-secondary` (#5a6a85, 5.1:1 on light surfaces) for 10px badge content.
Seen in: US-E01.2 role-select.tsx line 64, login-form.tsx line 73.

## Heading — login page uses h2 as page title (no h1)
Pattern: Login RSC wraps the form in a `<div>` with `<h2>` for the login title, and the two-column brand panel has the only `<h1>` (which is hidden on mobile via `hidden lg:flex`). On mobile the h1 is absent from the accessibility tree; the first heading visible to screen readers is the h2 login title.
Fix: Either make the login title an `<h1>`, or add a visually-hidden `<h1>` matching the page title for all viewport sizes.
Seen in: US-E01.2 login/page.tsx lines 18–29.

## Contrast — Tab count badge: white text on colored badge pill
Pattern: `<span className="bg-primary text-primary-foreground">` (active) or `bg-edu-error text-white` (inactive) for count badges inside `TabsTrigger`. Badge text is `text-[10px]` — not large text — needs 4.5:1. Primary: 3.29:1. edu-error: 2.37:1. Both fail.
Fix: Active badge → `bg-primary/15 text-edu-text-primary` (dark text on tinted bg). Inactive badge → `bg-edu-error-dark-light text-edu-error-dark` (matches high-severity pattern, 5.30:1).
Seen in: US-E09.1 discipline-screen.tsx (violations + leave count badges).

## A11y — aria-invalid without aria-describedby on textarea validation
Pattern: `<Textarea aria-invalid={tooShort} />` with no `aria-describedby` linking to an error message. SR user is told field is invalid but receives no reason or fix guidance.
Fix: Render `<p id="fieldname-error" className="text-edu-error-text text-xs">{t("minLengthError")}</p>` when invalid, and add `aria-describedby="fieldname-error"` to the textarea.
Seen in: US-E09.1 reject-leave-dialog.tsx.

## A11y — Ghost cancel button using symbol text (✕) without aria-label
Pattern: `<Button variant="ghost" onClick={cancel}>✕</Button>` — Unicode ✕ character without aria-label. Screen reader announces "multiplication sign" or similar.
Fix: Add `aria-label={t("cancelEdit")}` and render a sr-only span or use the `X` lucide icon with `aria-hidden="true"` + visible label.
Seen in: US-E09.1 conduct-tab.tsx inline edit cancel button.

## Contrast — Approve button: bg-edu-success + text-white fails badly
Pattern: `className="bg-edu-success text-white"` on a primary action button. `--edu-success: #13DEB9` on white = 1.72:1 — catastrophic failure (need 4.5:1 for text-sm).
Fix: Use `text-edu-warning-foreground` (#2A3547, 7.17:1) OR `text-edu-text-primary` instead of `text-white` on any bg-edu-success button. Never pair white text with edu-success background.
Seen in: US-E13.3 class-log-entry-detail.tsx (Approve button).

## Focus — View transitions (SPA-style) without focus management
Pattern: Single-page view toggle (list/new/detail state with useState) renders new content without moving focus. When keyboard user activates "New Entry" button, the form mounts but focus stays at the now-removed button position. Screen reader does not announce the view change.
Fix: In the root orchestrator, add a `useRef` on the new view's heading/back-button and a `useEffect` that fires when `view` changes to call `.focus()` on that ref. Both `ClassLogEntryForm` and `ClassLogEntryDetail` should have their back-button or h2 receive focus on mount.
Seen in: US-E13.3 class-log-screen.tsx (view state transitions).

## Keyboard — No keyboard trigger for context menus (right-click-only)
Pattern: `onContextMenu` handler on a `<div>` with biome-ignore comment claiming "accessible menu trigger exists". No actual keyboard trigger button or accessible equivalent is present. Keyboard users cannot access the context menu at all.
Fix: Add a `<button type="button" aria-label={t("contextMenu.openAriaLabel")} aria-haspopup="menu">` that appears on keyboard focus of the message bubble (via focus-within) and calls the same openContextMenu handler with position derived from the button's getBoundingClientRect().
Seen in: US-E10.4 chat-bubble.tsx / chat-window.tsx.

## ARIA — role="menu" container aria-label is the first menu item label
Pattern: `<div role="menu" aria-label={t("reply")}>` — the menu label says "Trả lời" which is also the first item text. SR announces "Trả lời menu" then "Trả lời menuitem" — confusing duplication.
Fix: Use a descriptive label like `t("contextMenu.label")` = "Thao tác tin nhắn", not the first item text.
Seen in: US-E10.4 message-context-menu.tsx.

## Focus — No focus return from custom context menu on Escape
Pattern: Custom `role="menu"` panels that call `onClose()` on Escape do not programmatically return focus to the triggering element. Since the context menu is triggered by right-click (not a tracked button ref), the triggering element is a `<div>` with no ref stored, so focus is lost after Escape.
Fix: Store a `triggerRef = useRef<HTMLElement | null>(null)` in the parent; on open, set `triggerRef.current = document.activeElement as HTMLElement`; on close, call `triggerRef.current?.focus()`.
Seen in: US-E10.4 chat-window.tsx + message-context-menu.tsx.

## ARIA — alertdialog required but inline div used for destructive confirm
Pattern: Destructive action confirms (delete group) implemented as inline conditional render of a `<div>` with no ARIA role — not `role="alertdialog"`. Screen readers don't announce the prompt as an alert, focus is not trapped, and Escape doesn't cancel.
Fix: Wrap the inline confirm in a Radix `AlertDialog` (which provides `role="alertdialog"`, focus trap, Escape handling automatically), same as the "leave group" flow already does.
Seen in: US-E10.4 group-info-panel.tsx (confirmDelete inline div).

## ARIA — aria-disabled instead of disabled on blocked buttons
Pattern: Blocked buttons use `aria-disabled="true"` without the native `disabled` attribute. This keeps the button keyboard-focusable (which is correct for tooltip access) but requires the click handler to be manually no-op'd (`e.preventDefault()`).
Assessment: This pattern is intentionally correct for tooltip-visible disabled buttons per ARIA APG. Not a failure — document as validated pattern.
Seen in: US-E12.2 (delete blocked button).

## Keyboard — HTML `disabled` attr on role="tab" breaks roving tabindex Arrow navigation
Pattern: Using native `disabled` attribute on `<button role="tab">` during a loading state prevents programmatic focus in Firefox (and some other browsers) — `element.focus()` has no effect on disabled buttons. Arrow key navigation in the roving tabindex pattern silently skips those tabs.
Fix: Replace `disabled={isLoading && !isActive}` with `aria-disabled={isLoading && !isActive}` and guard `onClick`/`onKeyDown` manually: `if (isLoading && !isActive) return;`. ARIA APG recommends aria-disabled for all tabs so they remain keyboard-reachable.
Seen in: US-E13.7 child-switcher.tsx.

## Contrast — Shared DetailPanelHeader back-button text-muted-foreground recurs
Pattern: New shared component `detail-panel-header.tsx` back button uses `text-muted-foreground` for visible label text (not decorative) — same recurring #8898a9-on-white failure (2.95:1), now baked into a component consumed by 3 screens (announcements, messaging, exam-bank) at once. Also present pre-existing on the group-info-panel edit icon-only button (`text-muted-foreground`, 2.95:1 < 3:1 icon threshold — fails by a hair).
Fix: `text-edu-text-secondary` (5.48:1 on white) for the back-button label; ghost icon-only buttons on white cards should use `text-edu-text-secondary` too, not `text-muted-foreground`.
Seen in: US-E17.9 detail-panel-header.tsx line 61 + group-info-panel.tsx edit button (pre-existing, retained across the refactor).
Lesson: because this is now a *shared* component, this single fix propagates the correction to all 3+ consuming screens at once — worth flagging as high-leverage.

## Contrast — Avatar initials at 10px: white text fails on all edu-* colors except purple
Pattern: 26px circle avatar with 10px initials text. White text on primary/success/warning/error all fail 4.5:1. Only purple passes (5.25:1).
Fix per color: success/warning/error → dark text `var(--edu-text-primary)` (#2a3547). Primary → swap bg to `var(--edu-primary-accessible)` (#4468e0) + keep white text (4.88:1). Purple → keep white text.
Seen in: US-E13.7 child-switcher.tsx COLOR_VAR map.

## Status message — Multiple simultaneous role="status" regions with identical text
Pattern: A single loading view renders two separate `role="status" aria-busy="true"` wrappers side by side (e.g. stat-grid skeleton + table skeleton), each with its own `sr-only` span carrying the SAME translated string. Both mount in the same render tick.
Assessment: Not a hard WCAG 4.1.3 violation (spec doesn't forbid multiple live regions), but produces a duplicate/confusing announcement in most screen readers (e.g. NVDA/JAWS speak "Đang tải dữ liệu... Đang tải dữ liệu..." back to back). Recommend consolidating to ONE `role="status"` wrapper around the whole loading block with a single sr-only label, letting the individual skeleton pieces (grids/rows) stay purely decorative (no nested role="status").
Seen in: US-E17.10 discipline-screen.tsx loading block (StatCardSkeletonGrid's internal role=status + a second role=status div wrapping TableRowSkeleton rows).

## Contrast — Skeleton primitive (bg-accent/bg-muted) barely visible on card background
Pattern: `src/components/ui/skeleton/skeleton.tsx` uses `bg-accent` (or historically `bg-muted`) for placeholder blocks on `bg-card` (white). Both tokens resolve to near-white/near-card hues (~1.1:1 contrast light and dark mode) — the skeleton shape is nearly imperceptible, especially for low-vision users or with `prefers-reduced-motion: reduce` (no pulse to help distinguish it).
Assessment: Systemic, affects EVERY skeleton screen in the app (pre-existing), not introduced by any single story. Flag to uiux-design-system-builder for a dedicated `--edu-skeleton` token; don't block an individual story's skeleton work for inheriting the shared primitive as-is.
Seen in: US-E17.10 StatCardSkeleton/TableRowSkeleton/teacher+student loading.tsx (all use the shared Skeleton primitive unmodified).

## Contrast — text-edu-text-muted baked into a whole new screen's labels/headings
Pattern: A brand-new screen uses `text-edu-text-muted text-xs uppercase tracking-wide` as the default styling for EVERY form-field `<Label>`, section `<h2>`, and inline content label (e.g. "Lý do:", "Bản ghi kiểm toán") — not just one spot, but the screen's whole typographic convention for small caps labels. Same 2.95:1 failure as always, just at higher blast radius (6+ occurrences in one story).
Fix: `text-edu-text-muted` → `text-muted-foreground` (aliased to `--edu-text-secondary`, 5.48:1, already AA) wherever the label carries meaning (which is almost always — decorative-only uses are rare).
Seen in: US-E14.6 academic-record-seal-screen (class-term-year-selector.tsx labels, all-locked-gate.tsx subject label, unseal-tab.tsx section h2s, unseal-self-approve-dialog.tsx audit label, unseal-request-card.tsx reason label).

## A11y — Lock/status icon aria-label spec'd in component-architecture doc but not implemented
Pattern: The story's own `fe-component-architect` accessibility-contract table explicitly named a specific "standalone" icon (no adjacent visible text) as needing `aria-label`, and even had `fe-nextjs-engineer` add the i18n key for it (`ariaLocked`) — but the icon itself shipped as plain `aria-hidden` with no `role="img"`/`aria-label` wiring, leaving the i18n key completely unused (dead key). Cross-check: `grep` the i18n key across `src/` after reading the architecture doc's a11y table — if a key exists but has zero non-messages.json usages, the intended a11y wiring was dropped mid-implementation.
Fix: `<Icon role="img" aria-label={t("key")} />` (never `aria-hidden` + `aria-label` together — lucide's default `aria-hidden` silences any `aria-label` on the same element).
Seen in: US-E14.6 unseal-request-card.tsx Lock icon (line ~44).

## Motion — Dialog primitive missing motion-safe: prefix (Sheet/AlertDialog have it, Dialog doesn't)
Pattern: `components/ui/dialog/dialog.tsx`'s `DialogOverlay`/`DialogContent` animate-in/out classes have NO `motion-safe:` prefix, while `components/ui/sheet/sheet.tsx` and `components/ui/alert-dialog/alert-dialog.tsx` (same shadcn generation era) correctly prefix every animation class. A story using plain `Dialog` (not `AlertDialog`/`Sheet`) inherits the gap for free.
Fix: primitive-level — add `motion-safe:` to `dialog.tsx` lines with `animate-in`/`animate-out`/`fade-*`/`zoom-*`/`duration-*`, mirroring `alert-dialog.tsx`.
Seen in: US-E14.6 seal-confirm-dialog.tsx (consumer of the unmodified `Dialog` primitive).

## i18n/a11y — Sheet/Dialog close-button label hardcoded, ignores locale
Pattern: `components/ui/dialog/dialog.tsx` hardcodes `<span className="sr-only">Đóng</span>` (Vietnamese literal, no `t()`) regardless of `en` locale. `components/ui/sheet/sheet.tsx` has a `closeLabel` prop but defaults to hardcoded English `"Close"` — callers must remember to pass a translated value or SR users get the wrong language.
Fix: For Sheet call sites, always pass `closeLabel={t("close")}`. For Dialog, flag the primitive owner — needs the same `closeLabel` prop pattern Sheet already has, translated by default.
Seen in: US-E14.6 unseal-initiate-form.tsx (SheetContent call omits closeLabel), seal-confirm-dialog.tsx (inherits Dialog's hardcoded "Đóng").

## Error state — VM field wired but never consumed / hardcoded null (dead role="alert" block)
Pattern: Screen shell (`academic-record-seal-screen.tsx`) implements a correct `role="alert"` error block reading `vm.error`, but the container hardcodes `error: null` — the block can never render. A separate per-tab error field (`batchError`) IS populated from the real query error in the container, but no child component (`seal-tab.tsx`) actually reads it, so query failures fall through to a generic empty-state message with no `role="alert"` and no error-specific text. Root cause pattern: VM contract correctly plumbs an error type through, but the last-mile consumer (JSX branch) was never wired — check every `xxxError`/`vm.error` field for an actual conditional render site, not just its presence in the interface.
Fix: Add the missing conditional render branch in the consuming component (mirrors the already-correct AC-3 "not all locked" `role="alert"` pattern one file over — copy that pattern).
Seen in: US-E14.6 academic-record-seal-container.tsx (`error: null` literal) + seal-tab.tsx (ignores `vm.batchError`).

## Contrast — `--edu-warning-text` (ADR 0046) misapplied to non-bold/small text
Pattern: `--edu-warning-text` (#9a6a0f, 4.37:1 on `--edu-warning-light`) is an ADR-0046 "bold ≥14px only" token — it fails 4.5:1 for normal text. Recurring misuse: applying it to `text-xs` (12px) body copy, or to `font-medium` (weight 500, NOT bold) 14px button text inside a warning banner. Measured: `/90` opacity on 12px body text → 3.67:1; `font-medium` 14px button (shadcn `Button` base is `font-medium`, not `font-bold`) → 4.37:1 base / 4.01:1 on a `hover:bg-edu-warning/15` state. Only `font-bold text-sm` (700 weight, 14px) titles actually qualify.
Fix: `--edu-warning-text` only on elements that are *actually* `font-bold` at ≥14px (verify computed weight, not just "it's in a warning banner"). Everything else (body paragraphs, button labels, badges) → `--edu-warning-foreground` (#2a3547, 11.42:1).
Seen in: US-E08.6 sse-disconnect-banner.tsx (body paragraph + "Kết nối lại" button).

## Dark mode — shadcn `variant="outline"` baked-in `dark:` classes beat custom light-only token overrides
Pattern: Overriding a shadcn `Button`'s `outline` variant with custom light-mode classes (e.g. `bg-edu-warning-light border-edu-warning text-edu-warning-text`) does NOT survive dark mode. `buttonVariants`'s `outline` entry ships `dark:bg-input/30 dark:border-input dark:hover:bg-input/50`; Tailwind's `@custom-variant dark (&:is(.dark *))` selector has higher specificity (0,2,0) than the plain override class (0,1,0), so under `.dark` the button silently reverts to the dark input background while the custom light-only text color (unaffected, most `--edu-*` status tokens have no dark override) stays — producing near-unreadable combos (e.g. amber #9a6a0f text at ~3.45:1 on dark navy ~#181f35, well under 4.5:1). Root cause: `--edu-warning`/`-light`/`-text` tokens are deliberately NOT overridden in `.dark {}` block in tokens.css ("Status/role tokens are deliberately untouched — future full dark-mode pass"), so any component that layers them onto a shadcn primitive with its own `dark:` classes gets a mismatched result.
Fix: either add explicit `dark:` classes for every custom override applied to a shadcn variant (`dark:bg-edu-warning-light dark:border-edu-warning dark:text-edu-warning-foreground dark:hover:bg-edu-warning/15`), or avoid `variant="outline"` for one-off warning-toned actions (use a plain unstyled `<button>` or `variant="ghost"` with full custom classes instead, since ghost has no dark: bg override to fight).
Seen in: US-E08.6 sse-disconnect-banner.tsx reconnect button.

## Focus — Interactive element unmounted on its own click handler's state transition
Pattern: A button that triggers a state transition which, in the very next render, causes that same button to unmount (e.g. "Kết nối lại" reconnect button — click sets status to `connecting`, and the `connecting` render branch intentionally omits the button per the "don't leave a disabled button" a11y guidance). This trades one problem (disabled-then-reenabled button) for another: when React removes the element that currently holds focus, focus silently drops to `<body>`, disorienting keyboard/SR users who get no confirmation their click was received beyond the live-region text change (which they may not be listening for at exactly that moment).
Fix: when the click handler causes its own element to unmount, move focus explicitly to a stable landmark first — e.g. give the `role="status"` wrapper `tabIndex={-1}` and call `.focus()` on it inside the click handler (or in a `useEffect` keyed on the status transition) before/as the button disappears.
Seen in: US-E08.6 sse-disconnect-banner.tsx (reconnect button unmounts on click → `connecting` state).

## ARIA live region — conditionally unmounting the whole `role="status"`/`aria-live` wrapper
Pattern: A live-region container is only rendered (`return null` otherwise) rather than always mounted with content toggling inside it. Announcing a freshly-*inserted* live region with content already present is less reliable across screen readers than a region that's present from initial paint and only has its *content* change. The project's own precedent (`staff-leave-screen.tsx` toast) intentionally stays "always-mounted + sr-only when hidden" for exactly this reason.
Fix: keep the wrapper element always in the DOM (e.g. `sr-only`/`hidden` via CSS or empty content when inactive), toggle only the inner text/visibility, rather than `if (!status) return null` on the element that carries `role="status"`.
Seen in: US-E08.6 sse-disconnect-banner.tsx (whole banner including its `role="status"` wrapper unmounts when `status` is undefined).

## Contrast — Course/entity "tone" map used as literal text color (5 of 6 semantic colors fail)
Pattern: A `TONE_TEXT: Record<Tone, string>` (e.g. `text-edu-primary`, `text-edu-success`, `text-edu-warning`, `text-edu-teal`, `text-edu-error`, `text-edu-purple`) built for background/icon/border use also gets reused directly as **text color** for real content (numbers, percentages, CTA labels, active-item highlight text) on white/`bg-card`/`bg-edu-bg`. Measured on white: primary 3.29:1, success 1.72:1, warning 1.85:1, teal 2.49:1, error 2.37:1 — all FAIL even the relaxed 3:1 large-text threshold. Only purple (5.25:1) passes.
Fix: Never reuse a raw `bg-edu-*`/`text-edu-*` tone map for text without checking each color individually. This repo already ships accessible `-text` variants for most tones (`--edu-success-text` #007A6E, `--edu-error-text` #C0392B, `--edu-purple-text` #5B3D8A, `--edu-teal-text` #00695C — all 4.5:1+) plus `--edu-primary-accessible` (#4468E0, 4.88:1). `--edu-warning-text` (#9A6A0F) only clears 4.5:1 on white for bold ≥14px text and FAILS on `--edu-bg` (4.4:1) — for warning-tone text prefer `text-foreground` instead unless verified bold ≥14px on a pure-white surface. Build a parallel `TONE_TEXT_ACCESSIBLE` map for actual text use, keep the raw `TONE_TEXT` only for icons-on-own-tint/backgrounds/borders (still verify icon 3:1 per tone separately).
Seen in: US-E11.6 `features/lms/presentation/tone.ts` consumed by course-card.tsx (grade avg, progress %, CTA text), chapter-list.tsx (active lesson title), progress-card.tsx (countLabel).

## Link — "whole card is one `<Link>`" a11y-correction produces a run-on accessible name
Pattern: To avoid nested-interactive-elements (card `onClick` + inner CTA button), the fix is to make the entire card a single `<Link>` with the CTA rendered as non-interactive text inside it (correct, avoids nesting violation) — but the link's accessible name then defaults to ALL visible text content concatenated with no punctuation (title + teacher + stat numbers + labels + CTA text), producing a confusing run-on announcement per card in a grid of many cards.
Fix: Add an explicit, short `aria-label` on the `<Link>` (e.g. "{name}, GV {teacher}, tiến độ {pct}%, {cta}") — an explicit aria-label overrides the concatenated content name per ARIA accessible-name computation, so visible content stays untouched for sighted users.
Seen in: US-E11.6 course-card.tsx (fe-lead's own single-Link a11y-correction pattern, first applied here).
RE-CHECKED 2026-07-09 on branch feat/us-e11.6-student-lesson-player: STILL OPEN — no aria-label added yet. Both this finding and the TONE_TEXT-as-text-color finding above were re-confirmed present in the same audit pass (findings A11Y-001/002/003/004 in that report).

## Contrast — CTA/button background varies by decorative "tone" with fixed white text
Pattern: A per-entity decorative "tone" (course color, category color, etc.) drives a button's `bg-edu-{tone}` with hardcoded `text-white`, independent of whether that tone passes contrast. Only tones that happen to be dark enough (e.g. purple ~5.25:1) pass; success/warning/primary/teal/error all fail 4.5:1 for white text (see token-contrast-ratios.md "Interactive"/avatar-circle entries — same underlying colors recur project-wide).
Fix: Never let a decorative per-entity tone choose a CTA's text/background pairing directly. Use a fixed accessible button treatment (e.g. `bg-edu-primary-accessible text-white`) regardless of the entity's tone; reserve tone for backgrounds paired with dark/neutral text, borders, or icons-with-adjacent-label only.
Seen in: US-E11.6 course-card.tsx CTA "not started" state (`border-transparent text-white`, `TONE_BG[course.tone]`).

## Focus — Content-pane swap via sibling list-item click, no announcement (not a hard trap, but no confirmation)
Pattern: A master-detail layout (chapter list ↔ lesson content pane) swaps the entire detail pane's h1/body on `<button>` click inside the master list. The clicked button stays in the DOM (not unmounted, unlike the class-log-screen precedent), so focus is not literally lost — but there's no live-region or focus-shift to confirm the content change to a screen reader user who has since moved focus elsewhere.
Fix (non-blocking, best-practice): on the id-changing state update, move focus to the new content pane's heading via `ref` + `useEffect` (`tabIndex={-1}` + `.focus()`), matching the class-log-screen precedent for SPA-style transitions.
Seen in: US-E11.6 lesson-player.tsx (setActiveLessonId from ChapterList click).

## Contrast — Div-based chart bar fill vs card background (WCAG 1.4.11 Non-text Contrast)
Pattern: A solid, borderless colored div used as a bar/column fill in a custom (non-library) chart, on a white/`bg-card` background. WCAG 1.4.11's understanding doc explicitly lists "bars in a bar chart" as a graphical object requiring 3:1 against its adjacent background — this is NOT covered by the usual text-contrast check. `--edu-success` (1.72:1) and `--edu-warning` (1.85:1) both fail; only `--edu-primary` (3.29:1) clears 3:1 among the tokens tried.
Fix: add a 1px border in the matching AA-safe `-text` token (`--edu-success-text`/`--edu-warning-text`, both >4.5:1 on white) around the fill — keeps the light/tinted visual language while making the boundary itself pass 3:1. Don't darken the fill itself (breaks the design system's visual intent).
Seen in: US-E03.1 attendance-trend-chart.tsx (div-based bar chart, first chart-shaped component in the app — check every future custom chart for this).

## A11y — `role="img"` on a chart wrapper prunes visually-visible per-item text from the accessibility tree
Pattern: A custom div-chart wraps its bars in a single `role="img"` container with one summarizing `aria-label`. Per ARIA, `role="img"` treats all descendants as presentational — the individual bar's visible numeric/name `<span>` text (put there specifically so "every value is also visible text, never chart-only") is NOT read by screen readers; only the one container `aria-label` is announced. If that label is just a bare count (not a data summary), screen-reader users get materially less information than sighted users, even though the intent ("never chart-only") was to make it equivalent.
Fix: make the `aria-label` a genuine data summary (count + min/max, or count + lowest/highest) computed from the actual dataset, not just `{count}`. If per-item detail must be available to AT users, consider `aria-describedby` pointing to a visually-hidden (`sr-only`) list/table duplicating the visible labels, keeping `role="img"` purely on the graphical container.
Seen in: US-E03.1 subject-average-chart.tsx / attendance-trend-chart.tsx (aria-label only interpolates `{count}`, spec's own AC-02.2/AC-03.3 explicitly asked for range/extremes too).

## Table — sr-only actions-column header reuses another column's i18n key
Pattern: A data table's trailing "actions" column (icon-only open/detail button) gets an `sr-only` `<TableHead>` label, but the implementer reuses the SAME i18n key as the first (content) column instead of a dedicated "Thao tác"/"Actions" key. SR users hear two columns both named the same thing; the actions column's real purpose isn't announced.
Fix: Add a dedicated `<namespace>.table.actions` key; never reuse a visible column's key for a hidden one.
Seen in: US-E19.2 report-table.tsx (moderation).

## Table — row onClick + nested icon button: works but deviates from "one interactive per row" contract
Pattern: `<TableRow onClick={...} className="cursor-pointer">` (plain `<tr>`, no `role="button"`/`tabIndex`/`onKeyDown`) wrapping a nested keyboard-accessible icon `<Button aria-label>`. Not a hard WCAG 2.1.1 violation (the row itself isn't semantically interactive, so there's no ARIA nested-interactive issue, and the button gives full keyboard parity) — but it's a common component-architecture ask ("entire row is one button/role=button, no nested button") that gets shipped as "row onClick (mouse-only) + separate keyboard-accessible button" instead. SR/keyboard users only discover the row is clickable by reaching the trailing button at the end of the row.
Fix: either make TableRow itself `role="button" tabIndex={0}` + `onKeyDown` (Enter/Space), or (simpler, matches spec) drop the row-level onClick/cursor-pointer entirely and keep only the explicit button as the row's sole interactive element.
Seen in: US-E19.2 report-table.tsx (moderation) — mobile ReportCardList variant of the same story got this right (whole card is one `<button>`).

## A11y — Status badge missing required icon despite explicit spec AC (text differs but no icon)
Pattern: `StatusBadge` is a pure children-wrapper (doesn't itself render an icon) — callers must pass one manually alongside text (established precedent: `unseal-request-card.tsx` passes `<Clock aria-hidden />` + text). A new call site renders text-only (`{t('status.ready')}` / `{t('status.generating')}`) even though the story's own FR/AC explicitly says "icon+text badge, never color alone." Because the text itself already differs per status, this isn't a strict WCAG 1.4.1 color-alone violation, but it IS an explicit Must-priority AC failure — treat as blocking for the design-review gate, not just a nice-to-have.
Fix: add a small `aria-hidden` icon (e.g. `CheckCircle2`/`Loader2`) before the badge text, matching the `unseal-request-card.tsx` pattern.
Seen in: US-E03.1 periodic-reports-table.tsx (FR-006/AC-04.1).

## ARIA — Nested sr-only status span swallowed by ancestor button's aria-label
Pattern: A decorative status indicator (e.g. presence dot) renders its own `sr-only` text span, but the whole thing is nested inside a `<button aria-label="...">` whose explicit `aria-label` does NOT include that status text. Per accname computation, an explicit `aria-label` on a widget completely replaces "name from content" — so in Tab-based (forms-mode) screen-reader navigation, only the aria-label is announced; nested sr-only spans are invisible to that announcement even though they exist in the DOM and would be reachable via virtual-cursor/browse-mode reading of a plain (non-widget) container. The exact same sr-only span pattern is SAFE when its container is a plain `<span>`/`<li>` with no aria-label (browse-mode reads it fine) — the bug is specific to nesting inside an aria-labelled interactive widget.
Fix: append the status text into the widget's own aria-label (e.g. `` `${t('openConversation', {name})}, ${presenceLabel}` `` when presence !== "offline"), don't rely on a nested sr-only span to be picked up.
Seen in: US-E10.6 conversation-item.tsx (PresenceDot + its sr-only label nested inside the row's `<button aria-label={t("openConversation")}>`). Same PresenceDot used in chat-window.tsx/group-info-panel.tsx is fine there — those sites are plain `<span>`/`<li>`, not aria-labelled buttons.

## Contrast — edu-success solid fill as a non-text UI dot (status indicator) fails 1.4.11
Pattern: A small filled circle (status/presence dot) using `bg-edu-success` (#13deb9) directly on `--edu-card` (white) or the `ring-card` halo color used to separate it from a colored avatar — measured 1.72:1, same failure as edu-success everywhere else, but here it's the *dot's own fill/border*, not text. The "hollow" variant (`border-2 border-edu-success`) has the identical failure for its border color.
Fix: swap `bg-edu-success`/`border-edu-success` → `bg-edu-success-text`/`border-edu-success-text` (#007a6e, 5.24:1 on white) for the presence dot itself. This is normatively mandated as `var(--edu-success)` in `docs/product/design-spec.jsonc`'s `screens.messaging.presence.dot` block — the spec itself encodes the failing value; flag both the code fix AND a design-spec correction (not just an implementation bug).
Seen in: US-E10.6 presence-dot.tsx (shared primitive, all 3 consuming sites) + group-info-panel.tsx's separate 7px "N online" banner dot (same token, decorative/redundant with adjacent text so lower severity there).

## Heading — new "blocked/unavailable" route state wraps EmptyState as full page content, no h1
Pattern: `EmptyState` (shared component) deliberately renders its title as a `<p>`, not a heading — correct when it's a sub-region of an already-headed page (e.g. empty list inside a screen that has its own h1). When a NEW route-level state (e.g. a builder route blocked in real mode because the write API doesn't exist) renders `EmptyState` as the page's ENTIRE content with no other heading anywhere, the page ends up with zero headings — SR users using heading-navigation (H key/VO+Cmd+H) get no result and may think the page failed to load. Check: does the sibling/mock version of this same route have its own `<h1 className="sr-only">`? If so, the new blocked-state variant must carry the same sr-only h1 — EmptyState's `<p>` title alone does not substitute for it.
Fix: `<h1 className="sr-only">{t("unavailable.title")}</h1>` above/around the `EmptyState` in the new blocked-state component.
Seen in: US-E18.15 exam-builder-unavailable.tsx (blocks teacher exam-bank create/[id]/edit routes in real mode — sibling exam-builder-screen.tsx has an sr-only h1, the new component didn't).

## Contrast — Tab count badge: text-primary on bg-primary/20 tint (new variant of the recurring self-color-on-own-tint bug)
Pattern: active-tab count pill uses `bg-primary/20 text-primary` (not white-on-solid like the US-E09.1 variant). `--edu-primary` (#5D87FF) as text on its own 20%-tint blended bg (~#DFE7FF) computes to ~2.67:1 — fails both the 3:1 UI-component floor and 4.5:1 text floor. Same root cause as the StatusBadge `TONE_CLASS` fixes (self-hue text on self-hue tint never passes) but reproduced in a screen-local component that didn't reuse `StatusBadge`/`statusToneClass`.
Fix: `text-edu-text-primary` (or `text-foreground`) for the active pill text instead of `text-primary`; keep `bg-primary/20` (or /15 to match the badge convention) as the tint.
Seen in: US-E21.1 invitations-status-tabs.tsx (status-tab count badge).

## Radix Dialog/AlertDialog opened without Trigger — focus never restored to invoker on close (DEF-01, repo-wide, ~14+ consumers)
Pattern: any Dialog/AlertDialog controlled purely by an `open` boolean prop (no `<DialogTrigger>`/`<AlertDialogTrigger>` in the tree) relies on Radix's default `onCloseAutoFocus`, which does `context.triggerRef.current?.focus()` — but `triggerRef` is only ever populated by an actual Trigger component. With no Trigger, `triggerRef.current` stays `null` forever, so the optional-chained `.focus()` call is a silent no-op and focus drops to `document.body` on close, disorienting keyboard/SR users (WCAG 2.4.3). First diagnosed + partially fixed in US-E22.1 (`EmailVerifyDialog`, commit `815d299`, DEF-01) which snapshots `document.activeElement` on open and overrides `onCloseAutoFocus` to restore it explicitly — but the shared `DestructiveConfirmDialog` (`components/shared/destructive-confirm-dialog/`) itself was NEVER patched, so every consumer that opens it without a Trigger (all of them — it's always invoked via `open={boolean}` from a row/list action) inherits the same defect. Confirmed still present in US-E21.1 (both `SendInvitationDialog`'s plain `Dialog` and the screen's `DestructiveConfirmDialog` revoke-confirm usage — neither overrides `onCloseAutoFocus`).
Fix (shared-component level, correct place to fix once for all ~14 consumers): in `DestructiveConfirmDialog`'s `<AlertDialogContent>`, capture `document.activeElement` when `open` transitions to `true` (e.g. a `useEffect`/ref keyed on `open`) and add an `onCloseAutoFocus` handler that calls `event.preventDefault()` + `capturedElement.current?.focus()`. Same pattern needed on the plain `Dialog`/`DialogContent` primitive for non-destructive dialogs (e.g. `SendInvitationDialog`) since `components/ui/dialog/dialog.tsx` has the identical gap.
Seen in: US-E22.1 (first found + locally fixed for EmailVerifyDialog only), US-E21.1 (reproduced, unfixed, both dialogs in invitations-screen).

## A11y — Tag/chip input: aggregate role="alert" error not linked to the specific invalid chip
Pattern: a multi-value chip input renders each invalid chip with a distinct visual tint + icon (correct, not color-only) but the chip `<span>` itself carries no `aria-invalid`/`id`, and the aggregate inline error paragraph below the whole field (`role="alert"`) has no `id` that any element's `aria-describedby` points to. A screen reader user hears "chip text" with no invalid-state announcement, then separately hears the alert text with no programmatic link back to which chip is wrong — AC-level requirements that explicitly ask for `aria-invalid`+`aria-describedby` per invalid chip (not just an aggregate alert) are not met by an aggregate-only pattern.
Fix: give each invalid chip `aria-invalid="true"` and a per-chip visually-hidden reason (or, at minimum, wire the input's `aria-describedby` to the aggregate alert's `id` so the connection is programmatic, not just visual/positional).
Seen in: US-E21.1 invitation-email-chips-input.tsx + tag-chips-input.tsx (AC-003.2).

## A11y — Loading skeleton fully aria-hidden with no accompanying live-region/status text
Pattern: a first-load skeleton wraps all shimmer placeholders in a single `aria-hidden="true"` container (correct — the placeholder shapes themselves are meaningless to AT) but provides NO sibling `role="status"`/`aria-live` region announcing that content is loading. A screen-reader user navigating to the page while data is in flight gets total silence — no visual table, no announcement — until the fetch resolves (WCAG 4.1.3 Status Messages).
Fix: add a visually-hidden `<span role="status">{t('loadingAriaLabel')}</span>` (or wrap the whole loading branch in `role="status" aria-live="polite"`) alongside the `aria-hidden` skeleton shimmer.
Seen in: US-E21.1 invitations-skeleton.tsx.

## Copy — "authoring disabled" banner names only some of the gated actions
Pattern: A single boolean flag (e.g. `authoringEnabled`) gates MULTIPLE affordances (create + edit + delete), but the explanatory banner text names only 1-2 of them ("creating and editing exams is not available") while delete is also silently removed. Users who previously had delete access see it vanish with no textual link to the reason.
Fix: enumerate every gated action in the banner copy, not just the most prominent one(s).
Seen in: US-E18.15 examBank.authoringDisabledNote (named create+edit, omitted delete).

## Contrast — Dark-mode collapses `--edu-error-text` to raw `--edu-error` while `--edu-*-light` stays light
Pattern: `globals.css` `.dark {}` block sets `--edu-error-text: var(--edu-error)` (raw #fa896b) but does NOT override `--edu-error-light`/`--edu-warning-light` (still the light-mode near-white values #fff5f2/#fef5e5). Any component using the standard `bg-edu-error-light text-edu-error-text` badge/banner pattern (which is otherwise the CORRECT AA pattern in light mode, ~5:1) silently regresses to ~2.2:1 in dark mode. Root cause: tokens.css comment explicitly says "Status/role tokens are deliberately untouched (future full dark-mode pass)" — this is a known, accepted gap, but it bites hardest on PUBLIC routes with `defaultTheme="system"` where an unauthenticated visitor's OS dark mode triggers it on first contact.
Fix: add `.dark` overrides for `--edu-error-light`/`--edu-warning-light` (dark-tinted, not raw light values) and stop collapsing `-text` variants to the raw status color. Flag to uiux-design-system-builder for the "future full dark-mode pass" — but treat as blocking on any NEW public/unauthenticated screen since first-contact risk is higher there than on authenticated dashboards.
Seen in: US-E21.2 invite-accept-screen.tsx (join-error banner, switch-account-failed text, TokenError icon circles all use this pattern).

## Contrast — Decorative gradient brand panel: white tagline text fails on its own gradient
Pattern: `AuthBrandPanel` (shared, `components/shared/auth-brand-panel/`) renders a `text-primary-foreground/80` tagline (14px, not bold) over a `linear-gradient(150deg, --edu-primary → --edu-success)`. White-on-raw-edu-primary is already only 3.29:1 (fails 4.5:1 normal text); blending toward edu-success (white-on-success 1.72:1) is worse everywhere past the first gradient stop. `aria-hidden="true"` does NOT exempt this from WCAG 1.4.3 — that attribute only affects the accessibility tree, not visual contrast for sighted low-vision users. Promoted verbatim from `login/page.tsx` (US-E21.2, component-organization.md "promote on 2nd use") — pre-existing, not a regression, but now baked into 2 screens at once (same high-leverage-shared-component lesson as `detail-panel-header.tsx`).
Fix: darken the gradient under the text (scrim) or fix text color/opacity; verify fix across BOTH `login` and `invitations/accept` since it's now a shared component.
Seen in: US-E21.2 auth-brand-panel.tsx lines 35-43 (first time this component was audited).

## Touch target — Bare inline `<button>` text link (no Button primitive) skips the 44px min-height
Pattern: a plain `<button type="button" className="font-bold text-primary hover:underline">` used for a secondary text-style action (e.g. "switch account") instead of the shadcn `Button` primitive (which bakes in `min-h-11` on every size variant) — inherits none of that protection, hit area collapses to the text's own line-height (~16-18px).
Fix: add `min-h-11` (or `p-2 -m-2` to expand hit area without affecting visual layout) to any bare `<button>`/`<a>` styled as inline text but meant to be tapped on mobile.
Seen in: US-E21.2 invite-accept-screen.tsx "Đổi tài khoản?" link-styled button.

## Landmark — New standalone public page has no `<main>` at all
Pattern: a new public/standalone route (not wrapped by the authenticated `AppShell`, which normally injects `<main>`) renders its content directly under a plain `<div>` root — zero landmarks anywhere on the page for SR landmark-navigation users.
Fix: wrap the primary content column in `<main>` explicitly on any route outside the dashboard shell.
Seen in: US-E21.2 invite-accept-screen.tsx (root `<div className="flex min-h-screen ...">`, no `<main>`).

## Keyboard trap — Radix Dialog opened from a DropdownMenuItem's onSelect (uncontrolled DropdownMenu), no preventDefault/no controlled menu state
Pattern: `<DropdownMenu>` (uncontrolled) → `<DropdownMenuItem onSelect={() => setDialogOpen(true)}>` opens a sibling `<TenantSwitchDialog>` (controlled `open`/`onOpenChange`, no `<DialogTrigger>`). Empirically reproduced in a real headless Chromium via `bunx vitest run --config vitest.storybook.mts` against the exact committed code: focus after open lands back on the DropdownMenuTrigger button (NOT inside the dialog), and Escape does NOT close the dialog at all (neither via `userEvent.keyboard` nor a raw `document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))`) — a genuine WCAG 2.1.2 keyboard trap. Tried the naive fix (`event.preventDefault()` in `onSelect` alone) — this moves focus into the dialog correctly, but since the `<DropdownMenu>` stays uncontrolled, `preventDefault()` also suppresses Radix's own auto-close, so `DropdownMenuContent` never unmounts (`[role="menu"]` count stays 1) and its still-mounted dismissable layer swallows the Escape meant for the Dialog on top of it. Root cause requires BOTH halves of Radix's own documented "Dialog inside DropdownMenu" recipe: control the DropdownMenu's own `open` state AND explicitly close it AND defer the dialog's open to the next frame (`requestAnimationFrame`), not just `preventDefault()`.
Fix: `<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>` + in the item's `onSelect`: `event.preventDefault(); setMenuOpen(false); requestAnimationFrame(() => setDialogOpen(true));`.
Verification method: don't just read the code — reproduce live. Add a throwaway `.stories.tsx` next to the real component exercising the REAL composed flow (open real DropdownMenu → click real menuitem → assert `document.activeElement`/dialog presence after Escape), run via `bunx vitest run --config vitest.storybook.mts <path>` (real Playwright browser, not jsdom), then delete the throwaway file and confirm `git status --porcelain` is clean. A harness/story that opens the same dialog via a plain `<button>` (bypassing the DropdownMenu) will NOT reproduce this bug — always test the actual composed invocation path, not just the leaf dialog component in isolation.
Seen in: US-E23.1 tenant-switch-menu (header.tsx DropdownMenuItem "Đổi trường" → TenantSwitchDialog).

## A11y — lucide-react icons need explicit aria-hidden="true"; default attrs do NOT include it
Correction to an earlier (US-E13.5-era) note that assumed lucide defaults to `aria-hidden="true" focusable="false"`: confirmed by reading `node_modules/lucide-react/dist/cjs/lucide-react.js` `defaultAttributes` (US-E23.1 audit) — it only sets `xmlns/width/height/viewBox/fill/stroke/strokeWidth/strokeLinecap/strokeLinejoin`, NO `aria-hidden`. Every decorative lucide icon needs an explicit `aria-hidden="true"` prop; don't assume the library adds it. (The unreliable-aria-label note below about lucide + `aria-label` may need re-verification against this same source next time it matters.)
Seen in: US-E23.1 header.tsx `ArrowLeftRight` icon in the "Đổi trường" DropdownMenuItem (missing it, contradicts architecture.md §7's own explicit contract).
