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

## Lucide SVG icon aria-label: unreliable without role="img"
Pattern: `<TriangleAlertIcon aria-label="..." />` — lucide-react renders SVGs with `aria-hidden="true" focusable="false"` by default. An `aria-label` on an `aria-hidden` element is ignored by screen readers.
Fix: Never rely on `aria-label` alone on a lucide SVG. For an accessible icon, use a sibling `<span className="sr-only">label text</span>`, or wrap in a `<span role="img" aria-label="...">`. Lucide also accepts `role="img"` directly: `<TriangleAlertIcon role="img" aria-label="..." aria-hidden={false} />` — this removes aria-hidden and adds the role, making it announced. The sheet conflict icon pattern (span role="img" + aria-label) is correct; replicate it in the table badge conflict icon.
Seen in: US-E13.5 principal-teachers-screen.tsx TriangleAlertIcon inside StatusBadge (table column).

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
