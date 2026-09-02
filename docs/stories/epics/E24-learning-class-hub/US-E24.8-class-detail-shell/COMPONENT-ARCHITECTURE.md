# US-E24.8 Component Architecture — Class detail shell

Owner: fe-component-architect. No implementation code here — component tree,
prop/VM contracts, presentational-vs-container split only. Grounded in
`PLAN.md` (fe-planner, already read the merged US-E24.7 code) + the mockup
`design_src/edu/class-hub.jsx` (`ClassHubScreen`) + the shipped
`RoleBadges`/`ClassCard`/`TeacherClassesScreen`/`TeacherClassStudentsScreen`
conventions this story must match.

## 1. Architecture Summary

- **Scope**: the routed shell at `/teacher/classes/[classId]?tab=…` — header
  identity card + tab strip + one of four tab bodies (one real: roster reuse;
  three placeholders).
- **New components** (all in
  `src/features/teacher/presentation/class-hub/`): `ClassHubScreen`,
  `ClassHubHeader`, `ClassHubTabs`, `TabPlaceholder`. Four components, four
  files, one shared `.i-vm.ts`.
- **Reused verbatim** (no change): `RoleBadges`
  (`features/teacher/presentation/shared/role-badges.tsx`) — its `size="md"`
  prop is explicitly reserved in its own doc comment for this story's header;
  its `RoleBadgesSubject { id; name }` shape already matches
  `TeacherClassSubject`. `StatusBadge` (via `RoleBadges`, transitively).
- **Modified, additive-only** (not a fork): `TeacherClassStudentsScreen` gets
  one new optional prop `hideBreadcrumb?: boolean` (default `false` — every
  existing consumer/story/test is unaffected). See §3.4.
- **No new `ui/` primitive needed.** No `bun ui:add` gap: everything renders
  with existing tokens/utility classes (`Link`, plain `<nav>`/`<div>`
  structure), same as `ClassCard`/`TeacherClassesScreen` today.
- **Key decisions**:
  1. Tabs are **Links, not buttons** (packet's own words: "Tabs (Link-based)")
     — each tab is a real navigation to `?tab=<id>`, resolved server-side by
     `resolveClassHubTab()` (domain, owned by fe-nextjs-engineer per PLAN
     §1). This is a `role="tablist"`/`role="tab"` pattern layered onto
     anchor-based navigation, not a JS-toggled panel — see §6 for the a11y
     contract and the deliberate deviation this implies.
  2. `ClassHubScreen` composes `header` + `tabs` + a `children`/`tabBody` slot
     that the RSC page fills with a **Server-Component subtree** (the roster
     screen's data-fetch, or a placeholder). Because this repo's layer table
     marks `presentation/` as always `'use client'`, `ClassHubScreen` itself
     is a client component — but it does **zero** data-fetching; it only
     renders the `children` prop it's given, and passing a Server Component
     as `children` into a Client Component is a supported Next.js pattern
     (the RSC subtree is resolved on the server before the client component
     ever mounts). This keeps "URL is the state, resolved server-side" intact
     while satisfying the repo's `'use client'`-for-presentation convention —
     flagging this explicitly because `PLAN.md` §"Design Notes" describes the
     tab content as "RSC con" without spelling out how that RSC subtree
     reaches a `'use client'` wrapper.
  3. `ClassHubHeader`/`ClassHubTabs`/`TabPlaceholder` are pure presentational
     (props-only, no internal fetch, no `useState` beyond what `RoleBadges`
     already owns internally). All translation happens via `useTranslations`
     inside these components (i18n rule: translate at presentation, not in
     the RSC page's VM-assembly step) — VMs below carry **raw data**
     (`className: "10A1"`, not `"Lớp 10A1"`), mirroring the established
     `teacherClasses.card.studentCount` = `"{count} học sinh"` convention
     (confirmed against `vi.json` — `TeacherClass.name` on the wire/mock is
     the bare `"10A1"`, never pre-prefixed).

## 2. Component Tree

```
app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/page.tsx      RSC · container
│ 1. GetMyClassUseCase.execute(classId) → !ok ⇒ notFound()
│ 2. resolveClassHubTab(class.roles, searchParams.tab) → activeTab
│ 3. visibleTabs(class.roles) → tab list, href-build → ClassHubTabsVm
│ 4. assemble ClassHubHeaderVm (raw fields, no i18n)
│ 5. tab body, resolved HERE (still server-side):
│      "students"  → await GetTeacherClassStudentsUseCase → <TeacherClassStudentsScreen vm hideBreadcrumb /> (REUSE, unmodified render, one new prop)
│      "timetable" | "course" | "homeroom" → <TabPlaceholder tab={activeTab} />  (NEW, no fetch)
│
└── <ClassHubScreen header={headerVm} tabs={tabsVm}>        'use client' · presentation/class-hub/class-hub-screen.tsx · composition, NOT a container
      {tabBody}                                              (children = the RSC subtree assembled in step 5, passed straight through)
    </ClassHubScreen>
      ├── <ClassHubHeader vm={headerVm} />                  'use client' · presentational · presentation/class-hub/class-hub-header.tsx
      │     ├── breadcrumb <Link href={vm.classesHref}>      (routed, replaces mockup's client-state back-button — see §6 open note)
      │     ├── icon box (tone: homeroom→purple, else primary — mirrors ClassCard's isHomeroom accent-tone branch)
      │     ├── <RoleBadges roles={vm.roles} subjects={vm.subjects} size="md" />   REUSE — shared/role-badges.tsx, ZERO changes
      │     └── meta line ("{studentCount} học sinh · Năm học {year}")
      ├── <ClassHubTabs vm={tabsVm} />                      'use client' · presentational · presentation/class-hub/class-hub-tabs.tsx
      │     └── role="tablist" > (tabsVm.tabs.map) <Link role="tab" aria-selected aria-controls>  — icon per tab from a LOCAL static map (not VM data, see §5)
      └── {children}                                         → whichever tab body page.tsx resolved (see step 5 above)

app/[locale]/t/[tenant]/(app)/teacher/classes/[classId]/students/page.tsx   RSC · rewritten
└── permanentRedirect(`/${locale}/t/${tenant}/teacher/classes/${classId}?tab=students`)   — no VM, no component, pure redirect (308)
```

Existing screens touched **additively**, not re-architected (already scoped
by `PLAN.md` §4c — noted here only so the tree is complete):

```
features/teacher/presentation/teacher-dashboard-home/teacher-dashboard-home.tsx
  └── schedule row / pending-grade row: <li> → <Link href="…?tab=timetable|students">…</Link>  WHEN item.classId present (VM field added, additive, optional)

features/timetable/presentation/.../timetable-grid.tsx  Cell
  └── filled cell (cellVariant==="teacher" && slot.classId present): inner <div> → <Link href="…?tab=timetable">…</Link>
```

## 3. ViewModel + Prop Interfaces

### 3.1 `features/teacher/presentation/class-hub/class-hub.i-vm.ts` (NEW)

```ts
import type {
  ClassRole,
  TeacherClassSubject,
} from "@/features/teacher/domain/entities/teacher-class.entity";
// ClassHubTab is a domain type owned by fe-nextjs-engineer's tab-resolver
// (PLAN.md §1) — imported here as a type only, never constructed in
// presentation/.
import type { ClassHubTab } from "@/features/teacher/domain/tab-resolver";

/** Raw, untranslated fields — ClassHubHeader composes the display strings
 *  via useTranslations (i18n rule: translate at presentation). `className`
 *  is the bare class name ("10A1"), NOT "Lớp 10A1" — matches
 *  `teacherClasses.card.studentCount` = "{count} học sinh" convention
 *  (`TeacherClass.name` never carries a "Lớp " prefix on the wire/mock). */
export interface ClassHubHeaderVm {
  classId: string;
  className: string;
  roles: ClassRole[];
  /** Same shape `RoleBadgesSubject` already accepts — no adapter needed. */
  subjects: TeacherClassSubject[];
  studentCount: number;
  /** e.g. "2025–2026" — already resolved on `TeacherClass.academicYearLabel`. */
  academicYearLabel: string;
  /** App-relative — the breadcrumb "Lớp học" link target (`/teacher/classes`). */
  classesHref: string;
}

/** One tab, already visibility-filtered and href-built by the RSC page —
 *  `ClassHubTabs` is a pure renderer, it does not re-derive visibility or
 *  build URLs (single source of truth = `visibleTabs()` in domain). */
export interface ClassHubTabVm {
  id: ClassHubTab;
  href: string;
}

export interface ClassHubTabsVm {
  activeTab: ClassHubTab;
  tabs: ClassHubTabVm[];
}
```

No single `ClassHubScreenVm` wrapper type — `ClassHubScreen`'s two data props
(`header`, `tabs`) are passed as discrete props (see §3.2), not nested under
one object, matching the granularity `page.tsx` naturally assembles them at
(header VM and tabs VM come from different derivations in step 3/4 above).

### 3.2 `class-hub-screen.tsx` — composition (NOT a container)

```ts
import type { ReactNode } from "react";
import type { ClassHubHeaderVm, ClassHubTabsVm } from "./class-hub.i-vm";

export interface ClassHubScreenProps {
  header: ClassHubHeaderVm;
  tabs: ClassHubTabsVm;
  /** The tab body — an RSC subtree resolved by page.tsx BEFORE this client
   *  component renders (Next.js Server-Component-as-children pattern). Never
   *  fetched or resolved inside this component. */
  children: ReactNode;
}
```

### 3.3 `class-hub-header.tsx` / `class-hub-tabs.tsx` / `tab-placeholder.tsx`

```ts
// class-hub-header.tsx
export interface ClassHubHeaderProps {
  vm: ClassHubHeaderVm;
}

// class-hub-tabs.tsx
export interface ClassHubTabsProps {
  vm: ClassHubTabsVm;
}

// tab-placeholder.tsx
export type PlaceholderTab = Exclude<ClassHubTab, "students">; // "timetable" | "course" | "homeroom"
export interface TabPlaceholderProps {
  tab: PlaceholderTab;
}
```

`TabPlaceholder` looks up its own copy via
`t(\`placeholder.body.${tab}\`)` — per-tab body text so each of
US-E24.9/10/11 knows which placeholder instance it is replacing (per
`PLAN.md` §5). Title is shared: `t("placeholder.title")`.

### 3.4 Modification to `TeacherClassStudentsScreen` (existing, additive)

`PLAN.md` phrased this as "add `hideBreadcrumb?: boolean` to the
screen/its VM" — resolving that ambiguity: **it belongs on the component
`Props`, not the VM.** The VM (`TeacherClassStudentsScreenVM`) is
server-assembled *data*; `hideBreadcrumb` is a *render-mode* switch the
caller (the shell's `page.tsx`) sets, exactly like the file's existing
`loading` prop. Putting it on the VM would mean the RSC page has to thread a
UI concern through a data-shaped type for no reason.

```ts
// teacher-class-students-screen.tsx — Props, extended (file already read):
interface Props {
  vm: TeacherClassStudentsScreenVM;
  /** Storybook-only: render the loading skeleton. */
  loading?: boolean;
  /** True when rendered inside the class-hub shell (US-E24.8) — the shell's
   *  own ClassHubHeader already renders the breadcrumb + class name, so this
   *  screen's internal <Breadcrumb> would duplicate it. Default false (the
   *  standalone route, now itself a redirect target, keeps rendering as
   *  before if anything ever calls it directly again). */
  hideBreadcrumb?: boolean;
}
```

Inside the component: `{!hideBreadcrumb && <Breadcrumb classesHref={vm.classesHref} className={vm.className} />}`.
Zero change to `teacher-class-students-screen.i-vm.ts`. Existing stories/tests
that don't pass the prop get `hideBreadcrumb === undefined` →
falsy → unchanged behavior.

## 4. State Ownership (contract level)

| State | Owner | Notes |
| --- | --- | --- |
| Active tab | **URL** (`searchParams.tab`), resolved server-side by `resolveClassHubTab()` | Not component state anywhere. `ClassHubTabsVm.activeTab` is a read-only prop derived once per request. |
| Tab visibility (role → tab list) | **URL-adjacent, server-derived** via `visibleTabs()` (domain) | `ClassHubTabsVm.tabs` is already the filtered, href-built list — `ClassHubTabs` never re-derives it. |
| Roster search/pagination (inside the reused students tab) | **unchanged** — `TeacherClassStudentsScreen`'s own internal `useState` (`query`, `page`) | Out of scope for this story; the shell does not touch it. |
| Breadcrumb visibility | **controlled prop** (`hideBreadcrumb`) set once by the caller, never toggled at runtime | Not reactive state. |
| Anything client-fetched (TanStack Query) | **none in this story** | Confirmed by `fe-planner` (PLAN.md §6): no interactivity beyond `Link` navigation. **Hand-off to `fe-state-engineer`: skip** — nothing for state-engineer to design here; flag only if a later story (E24.9 timetable tab) introduces client mutations (period log/prep drawers in the mockup are NOT part of this shell, they belong to the timetable tab's own future story). |

## 5. Composition & Variant Strategy

- **No new `cva` variants needed.** `RoleBadges` already has the `size`
  variant this story needs (`"md"`) — reused as-is, zero prop surface change.
- **Icon-per-tab is a local, static lookup inside `ClassHubTabs`**
  (`Record<ClassHubTab, LucideIcon>` — `students→Users`, `timetable→Calendar`,
  `course→BookOpen`, `homeroom→Shield`, matching the mockup's icon choices),
  **not** carried on `ClassHubTabVm`. Rationale: which icon a tab gets is a
  fixed design decision, not per-request data — putting it in the VM would
  let a future page.tsx accidentally pick a different icon per class, which
  the design never intends. Same reasoning `KpiTile`'s tone map uses a local
  `TILE_TONE_CLASS` object instead of a VM field.
- **Icon-box tone in `ClassHubHeader`** follows the same branch `ClassCard`
  already uses: `roles.includes("homeroom") ? <homeroom tone> : <primary
  tone>` (`ClassCard` uses `bg-edu-role-parent` vs `bg-primary` for its
  accent bar) — reuse that exact token pair, do not invent a third tone.
  Mockup's icon-box fill opacity (`color + '18'`) maps to the design-system's
  documented "icon box… `bg = iconColor/18`" pattern (see
  `.claude/rules/design-system.md` §Component patterns, `StatCard`) — the
  engineer picks the matching Tailwind opacity utility already used elsewhere
  for this pattern; no new token.
- **No compound-component/slot (`asChild`) pattern needed.** `ClassHubScreen`
  is a plain composition wrapper with one `children` slot; `ClassHubTabs` and
  `ClassHubHeader` are leaf presentational components with no nested
  customization points requested by the packet.
- **Extension point, deliberately NOT built now (YAGNI)**: a generic
  `EmptyState`-style shared component. This story's `TabPlaceholder` is its
  own local component (this screen's 3rd/4th instance-shape of "centered
  icon + title + body card" pattern, after `TeacherClassesScreen`'s local
  `EmptyState`/`ErrorState` and `TeacherClassStudentsScreen`'s inline
  empty/error blocks) — flagging for `fe-lead`/future ADR that a
  `components/shared/empty-state/` extraction may be due once a *4th*
  independent screen needs the same shape, per the "3+ instances" bar in this
  repo's composition guidance. Not touching the two existing sites in this
  story (out of scope, no design ask for it here).

## 6. Accessibility Contract

| Element | Role / attrs | Keyboard | Notes |
| --- | --- | --- | --- |
| Breadcrumb (`ClassHubHeader`) | `<nav aria-label>` > `<ol>` > `<Link>` (current page as `<span aria-current="page">`) | Tab / Enter (native `Link`) | Same pattern as `TeacherClassStudentsScreen`'s existing `Breadcrumb` — copy the structure, don't reinvent. |
| Role icon box | `aria-hidden="true"` (decorative — role is ALSO spelled out via `RoleBadges` text, never color-only) | — | Mirrors `ClassCard`'s `aria-hidden` accent bar. |
| `RoleBadges` | unchanged — already text-based badges, never color-only | — | No new a11y surface; reused verbatim. |
| Tab strip (`ClassHubTabs`) | Outer: `role="tablist"` with an `aria-label` (e.g. `t("tabs.navLabel")`, new key). Each item: `<Link role="tab" aria-selected={id === activeTab} aria-controls={`classhub-panel-${id}`} id={`classhub-tab-${id}`}>` | **Tab / Enter native** (it's a real anchor) — satisfies the AC's mandatory bar. Arrow-key roving tabindex explicitly **not built** (AC marks it optional; `PLAN.md` §9 flags this as an open question for the auditor) | **Flag to `fe-accessibility-auditor`**: this is `role="tablist"` layered on real navigation Links, not the WAI-ARIA APG's typical JS-toggled-panel tabs. Confirm this hybrid is acceptable (screen readers generally announce `tab`/`tablist` correctly for either activation model; the risk is roving-tabindex expectation, not the roles themselves). If flagged, the fix is additive (a `keydown` handler), not a rearchitecture — already scoped as a risk in `PLAN.md`. |
| Tab body wrapper (part of `ClassHubScreen`'s `children` region) | `role="tabpanel" id={`classhub-panel-${activeTab}`} aria-labelledby={`classhub-tab-${activeTab}`}` — this wrapping `<div>` lives in `ClassHubScreen`, one panel rendered at a time (server already resolved only the active tab's subtree — there is never more than one panel in the DOM, so no `hidden` toggling needed) | No extra tabIndex needed — this is a real page navigation (URL changed), so there is nothing "hidden" to manage focus around; browser default focus behavior on navigation applies. Confirm with `fe-accessibility-auditor` that no explicit focus-management (e.g. focus the panel heading) is required beyond default `Link`/navigation behavior. | Single active panel — never renders 3 hidden ones, unlike a client-toggled tablist. |
| Placeholder card (`TabPlaceholder`) | Plain `<div>` (not `role="alert"` — it's not an error, just "not built yet") with visible heading (`<p>`/`<h2>`? — component is inside a `tabpanel` already labelled, so an `<h2>` here would be redundant; use a styled `<p>` for the title, matching `TeacherClassesScreen`'s `EmptyState` which also uses a `<p>`, not a heading) | — | No interactive elements inside — nothing to focus-trap. |
| Deep-link rows (dashboard / schedule cell) | Existing `<li>`/cell markup becomes a `<Link>` — inherits default focus ring (`focus-visible:ring-2 focus-visible:ring-ring`) already used everywhere else in this feature (`ClassCard`'s CTA, `TeacherClassStudentsScreen`'s breadcrumb link) | Tab / Enter native | Hover tint via existing `hover:bg-muted`/`hover:text-edu-text-primary` token classes — no new token. |

New i18n keys needed (namespace `teacher.classHub`, confirms `PLAN.md` §5 —
listed here only for the a11y-relevant ones this contract introduces beyond
what PLAN already enumerated): `teacher.classHub.tabs.navLabel` (accessible
name for the `tablist`, e.g. "Chuyển tab lớp học" / "Class hub tabs").

## 7. Reuse / gap checklist (component-organization.md compliance)

- [x] Grepped `components/ui`, `components/shared`,
      `features/teacher/presentation/**` before proposing anything new — no
      existing "class hub shell"/"tab strip" pattern found; four new
      composed, single-screen components is the correct placement per the
      decision tree (§3 of `component-organization.md`: composed, currently
      1 screen → `features/<x>/presentation/<screen>/`, promote later if a
      2nd screen ever needs an identical tab-strip shape).
- [x] `RoleBadges` reused with **zero** prop-surface change (its `size="md"`
      was reserved for exactly this story by US-E24.7).
- [x] `TeacherClassStudentsScreen` modified **additively** (new optional
      prop, default preserves old behavior) — not forked, not duplicated.
- [x] No missing shadcn/ui primitive — nothing here needs `bun ui:add`.
- [x] No raw color / new token proposed — icon-box tone reuses `ClassCard`'s
      existing homeroom/primary branch; opacity pattern reuses the
      already-documented `StatCard` icon-box convention.

## Hand-off

- `fe-state-engineer`: **skip** for this story (no client/server-state
  design needed — URL is the only state, per §4). Re-engage on US-E24.9 if
  the timetable tab introduces client mutations (period log / prep forms).
- `fe-nextjs-engineer`: build against this file + `PLAN.md`'s domain/DI
  phases. The only ambiguity this doc resolves versus `PLAN.md`: (a)
  `hideBreadcrumb` is a component `Props` field, not a VM field (§3.4); (b)
  `ClassHubScreen` is `'use client'` per this repo's layer rule, receiving
  the RSC tab body via `children` (§1.2); (c) tab icons are a local static
  map, not VM data (§5).
