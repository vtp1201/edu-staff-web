# US-E24.7 Component Architecture — /teacher/classes list

Owner: fe-component-architect. No implementation code — contracts + tree only.
Grounded in `PLAN.md` (fe-planner) + current code at
`src/features/teacher/presentation/teacher-classes-screen/` (this is a
**rewrite**, not additive — see PLAN §0.6) + `design_src/edu/class-hub.jsx`
(`ChClassList`, `ChRoleBadges`) + `docs/product/design-spec.jsonc#teacher-class-hub
.classList`.

## 1. Architecture Summary

**Scope**: the class-list screen only (`/teacher/classes`), Level 1 of the
class hub. Level 2 (`classDetail`, tabs) is US-E24.8+ — out of scope here,
but `role-badges.tsx` is deliberately placed for that story to reuse.

**New components**:
- `role-badges.tsx` — composed, cross-screen (E24.7 card header today,
  E24.8 identity header next) → canonical home `presentation/shared/`
  (decision `0026` rule: composed + will be used by ≥2 screens → shared,
  even though today only 1 screen consumes it — the packet's own Design Note
  already names the 2nd consumer, so this is not a speculative promotion).
- `kpi-tile.tsx` — composed, single-screen today (packet: E24.8 doesn't reuse
  KPI tiles) → canonical home stays feature-local,
  `teacher-classes-screen/components/`.

**Rewritten** (not additive, per PLAN §0.6): `class-card.tsx`,
`teacher-classes-screen.i-vm.ts`. The icon box, `isHomeroom`-only badge, and
the 3-button footer (`ComingSoonAction`) are all dropped — bundle-v3 has none
of them.

**Unchanged structurally**: `teacher-classes-screen.tsx` (loading/empty/error
states, `<ul role="list">` grid) — only the grid `minmax()` value moves from
280px → 300px to match `design-spec.jsonc` while the file is touched, and the
`ClassCard` prop shape changes because the VM changes.

**Reused, no new primitive needed**:
- `StatusBadge` (`@/components/shared/status-badge`) — `tone="purple"`
  **already exists** in `StatusTone` (checked `status-badge.tsx`); the plan's
  flagged risk ("verify `purple` exists before extending") is resolved as
  **no extension needed**. GVCN badge = `tone="purple"`, GVBM badge =
  `tone="primary"`. Also reused for the small "demo" pill on `kpi-tile.tsx`
  (`tone="muted"`, tiny, `aria-label` carries the meaning — see a11y §6).
- `Link` (next/link) for the "Mở lớp" CTA — same pattern as current
  `studentsHref` link, just re-styled (text link + chevron, not a filled
  button — bundle-v3 drops the button treatment for the CTA).
- `lucide-react` `ChevronRight` icon for the CTA (design-spec: `chevronRight`
  12px accent color).

**Missing primitives**: none. No `bun ui:add` needed — everything composes
from `StatusBadge` (already a shared composed component, not a raw
`components/ui/` primitive) + existing `ui/badge`.

**Key decisions**:
1. Tone computation for KPI tiles (`> 0 → warning/error, else neutral`) and
   `subjectLabel` join happen in `app/.../teacher/classes/page.tsx` (RSC), not
   inside `kpi-tile.tsx` or `class-card.tsx` — keeps presentational
   components pure renderers, matches the existing `mapScheduleStatusTone`
   convention cited in PLAN §4. `kpi-tile.tsx` receives a resolved `tone`
   enum, never raw numbers to compare.
2. `role-badges.tsx` takes `roles` + `subjects` directly (not the whole
   `TeacherClassVM`) so E24.8's identity header (which has its own VM shape,
   not a card VM) can call it with just the two fields it needs — no
   dependency on `teacher-classes-screen.i-vm.ts` from the shared component.
3. KPI tile **set** (which 2 tiles render) is a **VM-level decision** made in
   `page.tsx`, not a `role`-branching decision inside `class-card.tsx`. The
   card just maps over `vm.kpi.tiles` (an ordered array). This sidesteps the
   open question in PLAN §7 ("dual-role tile precedence") — whoever resolves
   that assumption edits `page.tsx`'s tile-assembly logic, never touches the
   presentational components.
4. `class-card.tsx` stays a **presentational component** — no `onClick`
   navigate-the-whole-card handler (the mockup's `onOpen(cls)` div-level
   click is a **JS-prototype-only affordance**, not an a11y-safe pattern for
   this codebase); the "Mở lớp" `Link` is the sole interactive/navigable
   element, consistent with the existing card + `.claude/rules/accessibility.md`
   (no nested-interactive, no non-semantic click targets).

## 2. Component Tree

```
app/[locale]/t/[tenant]/(app)/teacher/classes/page.tsx        [RSC, container]
│  — calls makeListMyTeacherClassesUseCase() + makeGetHomeroomKpiUseCase()
│  — assembles TeacherClassesScreenVM (tone/subjectLabel/tile-set computed here)
│  — passes `vm` prop only; no action ref needed (no mutation on this screen)
│
└─ <TeacherClassesScreen vm={vm} />                            ['use client', container-ish*]
   │  *touches no infra/DI; only branches on vm.status + renders children.
   │  UNCHANGED structurally from current file.
   │
   ├─ (loading) <ClassGridSkeleton />                          [presentational, unchanged]
   ├─ (error)   <ErrorState />                                 [presentational, unchanged]
   ├─ (empty)   <EmptyState />                                 [presentational, unchanged]
   └─ (ready)   <ul role="list"> → <li> → <ClassCard vm={cls} />  × N
                                                                 [REWRITTEN, presentational]
                └─ <RoleBadges roles subjects />           [NEW, presentational, shared]
                └─ <KpiTile … />  × (0–3, from vm.kpi.tiles)    [NEW, presentational, feature-local]
                └─ <Link href={vm.studentsHref}>  "Mở lớp" + ChevronRight
```

Legend: **container** = touches data assembly/DI (RSC only, here just
`page.tsx`); everything under `TeacherClassesScreen` is **presentational**
(stateless, props-in only, no data fetching, no DI import) per the layer
rule (`presentation/` never imports `infrastructure/`/`bootstrap/di/`).

### File map

| Component | File | Status |
| --- | --- | --- |
| `TeacherClassesScreenVM`, `TeacherClassVM` | `src/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen.i-vm.ts` | **rewrite** |
| `TeacherClassesScreen` | `src/features/teacher/presentation/teacher-classes-screen/teacher-classes-screen.tsx` | minor edit (grid `300px`, no VM-shape edit needed inside this file) |
| `ClassCard` | `src/features/teacher/presentation/teacher-classes-screen/components/class-card.tsx` | **rewrite** |
| `KpiTile` | `src/features/teacher/presentation/teacher-classes-screen/components/kpi-tile.tsx` | **new** |
| `RoleBadges` | `src/features/teacher/presentation/shared/role-badges.tsx` | **new** (first file in `presentation/shared/` for this feature) |
| `RoleBadgesProps` (co-located) | same file as `RoleBadges` | **new** |
| page assembly | `src/app/[locale]/t/[tenant]/(app)/teacher/classes/page.tsx` | edit (VM mapping + tone/tile assembly, KPI fan-out — owned by fe-nextjs-engineer per PLAN §4, not this doc) |

## 3. ViewModel + Prop Interfaces

### 3.1 `teacher-classes-screen.i-vm.ts` (rewrite)

```ts
import type { TeacherClassFailure } from "../../domain/failures/teacher-class.failure";
import type { ClassRole } from "../../domain/entities/teacher-class.entity";

/** One KPI tile, already tone-resolved by the RSC page — the card/tile
 *  render pure data, no `> 0` branching in presentation. */
export interface KpiTileVM {
  /** Stable key for React list + Storybook/test targeting, e.g. "absentToday". */
  key: string;
  value: number;
  /** Pre-translated label string (page.tsx calls `getTranslations`), NOT an i18n key —
   *  matches existing convention where `.i-vm.ts` carries display-ready strings
   *  produced at the RSC boundary (see teacher-dashboard-home.i-vm.ts precedent). */
  label: string;
  tone: "neutral" | "warning" | "error";
  /** True when this number came from the mock/draft path (ADR 0076) — drives
   *  the "demo" pill. Always false when USE_MOCK=false. */
  isDemo: boolean;
}

/** ViewModel for one class card. `studentsHref` is app-relative (rendered as a Link). */
export interface TeacherClassVM {
  id: string;
  name: string;
  gradeLevel: number;
  studentCount: number;
  /** Replaces the old bare `isHomeroom` boolean — a class can be both. */
  roles: ClassRole[];
  /** Pre-translated per-role badge copy (e.g. "GVCN", "GVBM · Toán"), one per
   *  entry in `roles`, same order — computed in page.tsx (subject-name join +
   *  i18n interpolation), RoleBadges just renders strings + tones. Kept as a
   *  parallel array (not a record) to preserve badge order from `roles`. */
  roleBadgeLabels: string[];
  /** Absent (`undefined`) when the class has no KPI data at all (AC: grid
   *  must not render an empty/lopsided tile area) — `TeacherClassesScreen`'s
   *  child `ClassCard` renders zero tile wrapper markup in that case, not an
   *  empty one. Never an empty array with isDemo noise; either `undefined`
   *  or 1–3 populated tiles. */
  kpi?: { tiles: KpiTileVM[] };
  /** App-relative route to this class's read-only student roster. Still the
   *  "Mở lớp" CTA target until E24.8's `[classId]` shell route exists. */
  studentsHref: string;
}

export interface TeacherClassesScreenVM {
  /** "ready" → render `classes` (possibly empty → empty state).
   *  "error" → render the typed `errorKey` message + retry button. */
  status: "ready" | "error";
  /** Present when status === "error"; maps to `teacherClasses.errors.<type>`. */
  errorKey?: TeacherClassFailure["type"];
  classes: TeacherClassVM[];
}
```

**Why `roleBadgeLabels: string[]` instead of exposing `subjects` raw to the
card**: `RoleBadges` (the shared component) is generic across screens and
takes `{ roles, subjects }` directly (see 3.3) — it does its own i18n lookup
via `useTranslations`, matching every other presentational component in this
codebase (VMs don't carry pre-translated strings when the consuming component
already calls `useTranslations` itself, per the existing `class-card.tsx`
convention of `t("homeroomBadge")` inside the component, not from the VM).
**Correction over first draft**: drop `roleBadgeLabels` from the VM; `ClassCard`
passes `vm.roles` + `vm.subjects` straight into `<RoleBadges roles={vm.roles}
subjects={vm.subjects} />`, which owns its own translation — see revised VM
below.

**Revised `TeacherClassVM`** (supersedes the block above — keep this one):

```ts
export interface TeacherClassSubjectVM {
  id: string;
  /** Resolved subject name (mapper already falls back to raw id when the
   *  subject-catalogue lookup misses — see PLAN §2). */
  name: string;
}

export interface TeacherClassVM {
  id: string;
  name: string;
  gradeLevel: number;
  studentCount: number;
  roles: ClassRole[];
  /** Empty array when the teacher has no subject assignment in this class
   *  (pure GVCN). Drives `RoleBadges`'s "GVBM · <subject>" copy — joined
   *  ", " for >1 subject per class (PLAN §7 open question, cosmetic). */
  subjects: TeacherClassSubjectVM[];
  kpi?: { tiles: KpiTileVM[] };
  studentsHref: string;
}
```

`label` on `KpiTileVM` stays pre-translated (unlike `roles`/`subjects`)
because the KPI **label set** is a page-level *composition* decision (which
2–3 of the 5 possible KPI keys apply to this class, in what order — the
dual-role precedence question from PLAN §7) — it's cheaper for `page.tsx` to
own both "which tiles" and "what they say" in one pass than to split the
selection logic (page) from the copy lookup (component via a `key`→i18n map
duplicated in two places). `RoleBadges`, in contrast, has a fixed, generic
2-variant vocabulary (homeroom/subject) that's identical across every future
consumer — translating inside the component is the right boundary there.

### 3.2 `class-card.tsx` — `ClassCardProps`

```ts
import type { TeacherClassVM } from "../teacher-classes-screen.i-vm";

export interface ClassCardProps {
  vm: TeacherClassVM;
}
```

Presentational. No local state. Renders:
- accent stripe div (`bg-edu-role-parent` when `vm.roles.includes("homeroom")`,
  else `bg-primary` — pure prop-driven class, no JS color logic)
- header row: title (`vm.name`) + subtitle (`vm.studentCount` + i18n) +
  `<RoleBadges roles={vm.roles} subjects={vm.subjects} />`
- `vm.kpi` present → `<div className="flex flex-wrap gap-2">` wrapping
  `vm.kpi.tiles.map(tile => <KpiTile key={tile.key} {...tile} />)`;
  `vm.kpi` undefined → **render nothing** (no wrapper div at all — satisfies
  the AC's "grid tự co" + the Storybook `NoKpi` assertion in PLAN §4 that
  checks the tile container isn't in the DOM, not rendered-empty)
- footer: `<Link href={vm.studentsHref}>` with `ChevronRight`, right-aligned

### 3.3 `role-badges.tsx` — `RoleBadgesProps` (shared, cross-screen contract)

```ts
// src/features/teacher/presentation/shared/role-badges.tsx
import type { ClassRole } from "../../domain/entities/teacher-class.entity";

export interface RoleBadgesSubject {
  id: string;
  name: string;
}

export interface RoleBadgesProps {
  roles: ClassRole[];
  /** Only consulted when `roles` includes "subject" — one badge per role,
   *  not per subject; multiple subjects join into a single "GVBM · X, Y" badge. */
  subjects: RoleBadgesSubject[];
  /** Card context (E24.7) uses the default 10.5px per design-spec; E24.8's
   *  identity header may need a larger inline size next to the 17px title —
   *  exposed now so E24.8 doesn't have to touch this file's internals,
   *  matching the mockup's own `size` prop on `ChRoleBadges`. */
  size?: "sm" | "md";
  className?: string;
}
```

Renders a `flex flex-wrap gap-1.5` row of `StatusBadge`:
- `roles.includes("homeroom")` → `<StatusBadge tone="purple">{t("card.roleBadge.homeroom")}</StatusBadge>`
- `roles.includes("subject")` → `<StatusBadge tone="primary">{t("card.roleBadge.subject", { subject: subjects.map(s => s.name).join(", ") })}</StatusBadge>`
  (skip rendering this badge entirely if `roles.includes("subject")` but
  `subjects` is empty — defensive, shouldn't happen per mapper contract, but
  keeps the component crash-safe on bad data)

Own translation via `useTranslations("teacherClasses")` — namespace shared
with the rest of the screen since E24.8's identity header will live under the
same feature's presentation tree and the packet already scopes the i18n keys
under `teacherClasses.card.roleBadge.*` (PLAN §5). If E24.8 ever needs this
outside the `teacherClasses` namespace, that's a namespace decision for that
story, not a blocker here (VM/props already generic; only the `t()` call
inside needs revisiting, isolated to this one file).

**No `.i-vm.ts` for this component** — it's a shared presentational
component consumed directly with domain-typed props (`ClassRole`, a plain
`{id,name}[]`), not a screen boundary; `.i-vm.ts` is reserved for the
screen↔RSC contract per `.claude/CLAUDE.md` naming table.

### 3.4 `kpi-tile.tsx` — `KpiTileProps`

```ts
// src/features/teacher/presentation/teacher-classes-screen/components/kpi-tile.tsx
export interface KpiTileProps {
  value: number;
  label: string;
  tone: "neutral" | "warning" | "error";
  isDemo: boolean;
}
```

Pure presentational `<div>` (not a button — static display, matches
design-spec `kpiTiles.shape`): `flex-1 min-w-[110px] rounded-[8px] px-3 py-2`,
tone → bg/text class map (`neutral: bg-muted`, `warning: bg-edu-warning/15
text-edu-warning-foreground`, `error: bg-edu-error/15 text-edu-error-text` —
same tone-class shape as `StatusBadge`'s `TONE_CLASS`, but NOT reusing
`statusToneClass()` directly since the tile bg here is a full tile fill, not
a pill — kept as a small local `const TILE_TONE_CLASS` map inside this file,
same convention as `class-log`'s `statusBadgeTones`). Value rendered with
`tabular-nums` class (AC requirement). `isDemo` renders a small trailing
`StatusBadge tone="muted"` reading the demo pill copy, `aria-label={t("card.kpi.demoLabel")}`.

## 4. State Ownership (contract level)

- **No client state anywhere in this component tree.** Every prop is fully
  controlled from the RSC `page.tsx` render; there's no interactivity beyond
  navigation links (no filter/sort/toggle on this screen per AC).
- `TeacherClassesScreen`'s only "state-like" prop is `loading` — a
  **Storybook-only** controlled boolean (RSC resolves before render in prod,
  per existing code comment), not real runtime state.
- KPI fan-out (`Promise.allSettled` over `GetHomeroomKpiUseCase.execute` per
  homeroom class) happens **inside the RSC `page.tsx`**, not behind
  TanStack Query — no client refetch, no cache key, no invalidation on this
  screen (PLAN §6 confirms fe-state-engineer is skipped for this story).
- **Hand-off note to `fe-state-engineer`**: not needed for E24.7. If a future
  story adds interactivity to this screen (e.g. client-side KPI refresh
  button), that story should introduce a query key scoped to
  `["teacher-classes", classId, "kpi"]` and convert `page.tsx`'s static
  fan-out into a query — out of scope now, flagging only so it isn't
  reinvented ad hoc later.

## 5. Composition & Variant Strategy

- **No compound-component or slot pattern needed** — `ClassCard` composes
  `RoleBadges` + `KpiTile[]` + a `Link` as fixed children, not
  parameterized slots; there's no `asChild`/`Slot` use case here (no
  polymorphic root element requested by design).
- **`cva`**: not introduced for `KpiTile`'s 3-tone map — 3 fixed tone→class
  pairs read better as a plain `Record` (matches `StatusBadge`'s own
  `TONE_CLASS` precedent) than a `cva` variant API for a component with only
  one variant axis and no compound variants.
- **`RoleBadges.size` is the one deliberate extension point** — added now
  (not YAGNI'd) because the packet's own Design Note already names the 2nd
  consumer (E24.8 identity header) and the mockup's `ChRoleBadges` already
  has a `size` prop precedent. This is the "3+ instances" bar being met by a
  named, committed 2nd use, not speculation.
- **Design-system pattern reuse**: `StatusBadge` (Badge pattern per
  design-system.md), tabular-nums numeric convention (StatCard pattern),
  accent-stripe-by-role convention already established for Sidebar active-item
  styling (left-bar vs top-bar variant, same `bg-<token>` accent idea).
- **`class-card.tsx` accent stripe + role→color** is intentionally NOT
  extracted into a shared "role accent" helper beyond the entity-level
  `ClassRole` type — it's a 1-line ternary, extracting it would be
  premature abstraction for 2 branches used in exactly 1 file.

## 6. Accessibility Contract

| Element | Requirement |
| --- | --- |
| `RoleBadges` badges | Text-labeled (never color-only) — already true via `StatusBadge`'s `children` text; satisfies AC "badge role có chữ, không chỉ màu". No extra `aria-label` needed beyond the visible text. |
| `KpiTile` demo pill | `aria-label={t("card.kpi.demoLabel")}` ("Số liệu minh hoạ") on the `StatusBadge` — carries meaning beyond the small pill glyph/text for AT users; explicit AC line. |
| `KpiTile` value | `tabular-nums` class only (visual, not a11y per se) but paired with the always-visible `label` text below it — number is never presented without its label in the DOM (no icon-only KPI). |
| "Mở lớp" CTA `Link` | Real `<Link>` (not a div `onClick`), full text content "Mở lớp" — keyboard-focusable, in tab order, visible focus ring via existing `focus-visible:ring-2` utility (reuse the pattern already on the current CTA button). No `aria-label` override needed — the link text is already descriptive per-card (screen reader announces "Mở lớp, link" per card in a list, acceptable per existing roster-link precedent in this same file). |
| Card root `<article>`/`<li>` | Keep semantic list (`role="list"` on `<ul>`, unchanged) — do NOT make the card `<div onClick>` clickable (mockup's `onOpen` div click is a JS-prototype affordance, not adopted — see Architecture Summary decision 4); avoids a non-semantic/duplicate nested-interactive click target next to the CTA link. |
| KPI tile grid absence (`vm.kpi === undefined`) | No empty/placeholder tile markup rendered at all (not `aria-hidden` empty divs) — nothing for AT to skip past. |
| Accent stripe | Decorative only (`aria-hidden` implicit — it's a plain `<div>` with no text/role, never conveys role info alone; role is always duplicated in the text badges per AC). |
| Focus order | Badges → KPI tiles (non-interactive, not in tab order — plain `<div>`s) → CTA link. Matches visual top-to-bottom reading order, no `tabIndex` overrides needed. |

## 7. Open items carried from PLAN.md (not resolved here — architecture-level flags only)

- Dual-role (10A1) KPI tile-set precedence (GVCN tiles win over GVBM tiles) —
  this doc's §1 decision 3 makes the *architecture* indifferent to how
  `page.tsx` resolves it (VM just takes an ordered `tiles[]`), but the actual
  business call is still open per PLAN §7 — flag to design/PM before
  `fe-nextjs-engineer` hardcodes an assumption.
- `RoleBadges`'s i18n namespace (`teacherClasses.card.roleBadge.*`) is fine
  for E24.7+E24.8 (same feature). If a non-`teacher` feature ever needs this
  component, namespace becomes a real decision — not now.
