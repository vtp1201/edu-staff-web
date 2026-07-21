# US-E20.2 — Component Architecture (fe-component-architect)

Firms up `plan.md` §4/§5 into an unambiguous component tree + prop/VM contracts.
Read alongside `plan.md` (domain/infra/DI already settled there — not repeated
here except where it shapes a prop type). No implementation code below.

## 1. Architecture Summary

- **Scope**: one new section (`ParentConsentSection`) mounted into the existing
  `ProfileScreen` identity column, plus its per-child card and 3 state
  components. Zero new primitives needed in `components/ui/`.
- **New components** (all in
  `src/features/user/presentation/profile/consent-section/`, feature-local per
  `component-organization.md` §3 — single screen today):
  `ParentConsentSection` (container, `'use client'`), `ChildConsentCard`
  (container — owns per-toggle mutations), `ConsentToggleRow` (presentational,
  new — not listed in plan.md's file list but required to keep
  `ChildConsentCard` from re-implementing 3x inline; see §2), `ConsentSkeleton`,
  `ConsentError`.
- **`ConsentEmpty` is CUT from the plan's file list** — reuse
  `components/shared/empty-state` (`EmptyState`) directly, zero wrapper. See
  §5.1 for the definitive promotion ruling (this was the flagged open question
  — now resolved, not open).
- **Reused as-is**: `StatusBadge` (`components/shared/status-badge`), `Switch`
  (`components/ui/switch`), `Avatar`/`AvatarFallback` (`components/ui/avatar`),
  `Skeleton` (`components/ui/skeleton`), `EmptyState`
  (`components/shared/empty-state`), `sonner` `toast` (direct import, matches
  `submit-sheet.tsx` precedent — no wrapper exists or is needed).
- **Missing primitives**: none. `Switch`, `Avatar`, `Skeleton` all exist with
  the needed API.
- **Key decisions**:
  1. `ChildConsentCard` owns 3 independent `useMutation`s (one per category),
     mirroring `LinkedAccountsSection`/`LinkedAccountRow`'s split exactly —
     NOT one section-level mutation. Each toggle is its own optimistic unit
     (AC-004.2's "exactly one (studentId, category) pair mutates" is easiest
     to guarantee when the mutation's input IS that pair).
  2. `ConsentToggleRow` is a **new small presentational component**, added to
     the plan's file list — extracted so `ChildConsentCard` doesn't triplicate
     the row JSX/mutation-wiring 3x inline (DRY within one file's `.map()`,
     same pattern `pl-table.tsx`/`pl-card.tsx` split from their screen).
  3. `ConsentSkeleton`/`ConsentError` are **kept feature-local, NOT promoted**
     to `components/shared/` this story — see §5.1 ruling; `PLSkeleton`/
     `PLError` are also NOT touched. Revisit promotion on the 3rd occurrence.

## 2. Component Tree

```
ProfileScreen                                  (existing, 'use client', container)
└─ identity column
   └─ AccountRequestsCard                      (existing)
   └─ ParentConsentSection                     (NEW, 'use client', container)
      ├─ [loading]  ConsentSkeleton            (NEW, presentational, props-only)
      ├─ [empty]    EmptyState                 (REUSED from components/shared/empty-state,
      │                                          presentational — no ConsentEmpty wrapper)
      ├─ [error]    ConsentError               (NEW, presentational, props-only)
      └─ [success]  section header + list + footnote  (inline in ParentConsentSection)
         └─ ChildConsentCard × N               (NEW, container — owns 3 useMutation)
            ├─ Avatar / AvatarFallback         (REUSED, ui/avatar — same initials pattern
            │                                    as profile-screen.tsx's identity card)
            ├─ StatusBadge tone="success"      (REUSED, shared/status-badge — "Đã liên kết")
            └─ ConsentToggleRow × 3            (NEW, presentational, controlled)
               └─ Switch                       (REUSED, ui/switch)
```

Server boundary (RSC → client, per `.claude/CLAUDE.md` layer table):

```
app/.../profile/page.tsx (RSC)
  → getSessionRole() [new server helper, plan.md §3]
  → <ProfileScreen role parentConsent={isParent ? true : undefined}
       onFetchParentConsent={isParent ? fetchParentConsentAction : undefined}
       onToggleParentConsent={isParent ? updateParentConsentAction : undefined} />
       (Server Actions defined in profile/consent-actions.ts, 'use server')
  → ProfileScreen (existing 'use client') triple-gates and mounts
  → ParentConsentSection (owns useQuery(onFetch); passes onToggle down)
  → ChildConsentCard (owns useMutation(onToggle) × 3, one per category)
```

## 3. ViewModel + Prop Interfaces

### 3.1 `parent-consent-section.i-vm.ts` (confirms plan.md §4, no changes)

```ts
import type { UpdateConsentInput } from "@/features/parent-links/domain/repositories/i-parent-consent.repository";

export interface ParentConsentChildVM {
  studentId: string;
  fullName: string;
  avatarUrl?: string;
  /** null = consents not yet resolved for this child — pending sub-state
   *  (AC-001.3). Never a guessed default. Renders disabled Switch + Skeleton. */
  consent: { discipline: boolean; absence: boolean; grades: boolean } | null;
}

export type ParentConsentFetchResult =
  | { success: true; children: ParentConsentChildVM[] }
  | { success: false; errorKey: "forbidden" | "network-error" };

export type ParentConsentToggleResult =
  | { success: true; consent: NonNullable<ParentConsentChildVM["consent"]> }
  | { success: false; errorKey: "forbidden" | "network-error" | "validation" };
```

Note: `ParentConsentToggleResult["consent"]` on success is
`NonNullable<...>` (refined from plan.md's plain `ParentConsentChildVM["consent"]`)
— a successful toggle always echoes a concrete `{discipline,absence,grades}`,
never `null`; this removes a spurious null-check at the `ChildConsentCard`
call site.

### 3.2 `ParentConsentSection` props (container, `'use client'`)

```ts
export interface ParentConsentSectionProps {
  onFetch: () => Promise<ParentConsentFetchResult>;
  onToggle: (input: UpdateConsentInput) => Promise<ParentConsentToggleResult>;
}
```

- No `initialData` prop (confirmed, plan.md §4 — deliberate divergence from
  `LinkedAccountsSection`, NFR-005 requires this section not block the RSC
  paint).
- `useQuery({ queryKey: ["parent-consent"], queryFn: onFetch })`, no
  `initialData`, no `enabled` gate needed (component only mounts when both
  action props are present — the triple-gate in `profile-screen.tsx` already
  guarantees `onFetch`/`onToggle` exist, so both stay **required**, not
  optional, in this interface — contrast with `LinkedAccountsSection.onFetch?`
  which IS optional because that section always mounts).
- Owns state-dispatch only (loading/empty/error/success); does NOT own any
  per-child mutation state — that is 100% `ChildConsentCard`'s job (container
  split, §1 decision 1).
- Renders (in the success branch) the section header (icon-box + title, per
  design-spec `consentSection.header`) and the privacy footnote (AC-001.4,
  static i18n string, rendered only in this branch) inline — no extracted
  sub-component needed for either (each is a few static lines, not reused
  elsewhere; do not over-abstract per `component-organization.md`'s
  no-premature-abstraction guidance).

### 3.3 `ChildConsentCard` props (container)

```ts
export interface ChildConsentCardProps {
  child: ParentConsentChildVM;
  onToggle: (
    input: UpdateConsentInput,
  ) => Promise<ParentConsentToggleResult>;
}
```

- Single `onToggle` prop (not 3 separate callbacks) — `UpdateConsentInput`'s
  `category` field is what discriminates; this exactly mirrors
  `ParentConsentSection`'s own prop, just forwarded, so there is one call
  signature to remember across the whole feature (no separate
  `onToggleDiscipline`/`onToggleAbsence`/`onToggleGrades`).
- Owns 3 independent `useMutation` instances internally (one per category —
  keyed by `["parent-consent", child.studentId, category]` conceptually, exact
  query-key ownership is `fe-state-engineer`'s call, not architecture) each
  wired exactly like `LinkedAccountRow`'s mutation: `onMutate` → optimistic
  local set + `previous` context; `onSuccess`/`onError` → rollback +
  per-toggle inline error text (no section-wide error banner for a toggle
  failure — AC-006.3 "distinct error indication," scoped to the row).
- Toast: `toast.success(t("toast.success"))` on any successful toggle (on OR
  off — identical copy per UC-004/005), fired from the mutation's `onSuccess`
  only when `result.success` — matches the direct `sonner` import pattern
  (`submit-sheet.tsx` precedent), no toast on failure (the inline row error +
  revert IS the failure affordance, no double-signaling).
- Renders avatar + name + `StatusBadge` header row, then 3× `ConsentToggleRow`.

### 3.4 `ConsentToggleRow` props (NEW, presentational, controlled) — added to plan's file list

```ts
export interface ConsentToggleRowProps {
  category: "discipline" | "absence" | "grades";
  icon: LucideIcon;               // shield / calendarX / award per design-spec
  label: string;                  // already-translated
  description: string;            // already-translated, 1-line
  checked: boolean;
  /** true when `child.consent === null` (pending sub-state, AC-001.3) —
   *  renders a disabled Switch + Skeleton overlay instead of a live control. */
  pending: boolean;
  /** true while THIS row's own mutation is in flight (optimistic write, not
   *  the initial-load pending state above — distinct concept, distinct flag,
   *  per AC-006.4 "pending vs confirmed states visually distinguishable"). */
  saving: boolean;
  errorText?: string;
  onCheckedChange: (next: boolean) => void;
}
```

- Fully controlled — zero internal state, zero data fetching, zero
  `useTranslations` call (all strings arrive as props, matching `EmptyState`'s
  and `PLError`'s existing convention of "container translates, leaf
  renders"). This is the presentational leaf of the whole tree.
- `pending` (initial-load sub-state) and `saving` (in-flight mutation) are
  DELIBERATELY separate booleans, not one shared `disabled` — `ChildConsentCard`
  passes `pending={child.consent === null}` (always `false` once loaded) and
  `saving={mutation.isPending}` (transient) separately, so a future visual
  distinction between "not yet resolved" and "currently saving" doesn't
  require a prop-shape change; the row internally ORs them for the actual
  `Switch disabled` attribute.
- `useId()` for `aria-labelledby`/`aria-describedby` wiring lives INSIDE this
  component (NFR-001) — it's a per-instance a11y concern of the leaf, not
  something the container should thread through props.

### 3.5 `ConsentSkeleton` props

```ts
export interface ConsentSkeletonProps {
  loadingAriaLabel: string;   // already-translated, matches PLSkeleton's shape
}
```

Row count: design-spec doesn't fix a number for this section (unlike
`consentSection`'s sibling admin table's fixed 5); render **2 shimmer child-
cards** (a card-shaped skeleton per plan.md §4's "child-cards" mental model,
not `PLSkeleton`'s flat table-row shimmer — different visual shape, see §5.1).

### 3.6 `ConsentError` props

```ts
export interface ConsentErrorProps {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
}
```

Identical shape to `PLErrorProps` field-for-field — see §5.1 for why this is
still NOT a shared-promotion trigger this story.

### 3.7 `profile-screen.i-vm.ts` — confirmed additive (plan.md §5, no changes)

```ts
export interface ProfileScreenVM {
  fullName: string; email: string; phone: string; role: string;
  sessions: ProfileSession[]; linkedAccounts: LinkedAccount[];
  /** Present (literal `true`) only when the resolved session role is `parent`
   *  — server-driven gate (AC-007.2). Absent for every other role. */
  parentConsent?: true;
}
```

Confirmed it composes cleanly: current `profile-screen.i-vm.ts` (read directly)
has exactly the 6 fields above minus `parentConsent` — this is a pure
additive optional field, no destructuring collisions in
`ProfileScreen({ fullName, email, phone, role, sessions, linkedAccounts, ... })`.
Add `parentConsent` to that destructure list alongside two new optional action
props on `ProfileScreenProps` (already specified in plan.md §5 — confirmed
verbatim, no refinement needed):

```ts
onFetchParentConsent?: () => Promise<ParentConsentFetchResult>;
onToggleParentConsent?: (input: UpdateConsentInput) => Promise<ParentConsentToggleResult>;
```

Mount point confirmed by reading `profile-screen.tsx` directly: insert
immediately after `<AccountRequestsCard />` inside the same
`{/* Identity column */}` `<div className="flex h-fit flex-col gap-6">`,
using plan.md §5's exact triple-gate:

```tsx
{parentConsent && onFetchParentConsent && onToggleParentConsent && (
  <ParentConsentSection
    onFetch={onFetchParentConsent}
    onToggle={onToggleParentConsent}
  />
)}
```

## 4. State Ownership (contract level)

| State | Owner | Kind |
| --- | --- | --- |
| `role`/`isParent` gate | `page.tsx` (RSC) via `getSessionRole()` | server-resolved, passed as VM field — not client state |
| Section fetch (loading/success/error/empty) | `ParentConsentSection` | TanStack `useQuery`, no `initialData` — controlled by query status, not local `useState` |
| Per-toggle optimistic value + revert | `ChildConsentCard` (3× `useMutation`, one per category) | TanStack `useMutation`, `onMutate` local optimistic patch via `queryClient.setQueryData` on the `["parent-consent"]` key (exact key/patch strategy = `fe-state-engineer` to confirm) |
| Per-row inline error text | `ChildConsentCard` | local `useState<string \| null>` per row, same as `LinkedAccountRow`'s `error` state — NOT lifted to the section |
| `pending` (initial unresolved) vs `saving` (in-flight write) | derived props into `ConsentToggleRow`, not owned by the row itself | controlled props, computed by `ChildConsentCard` |
| Toast | fired imperatively from `ChildConsentCard`'s mutation `onSuccess`, no state | side effect, not state |

**Hand-off to `fe-state-engineer`**: confirm (a) the exact query key/cache-patch
shape for `["parent-consent"]` after a successful per-child toggle (patch the
single child's `consent` object in place vs `invalidateQueries` +
`onSettled`, matching `LinkedAccountsSection`'s `onSettled: () =>
invalidateQueries` pattern or diverging deliberately for less flicker); (b)
whether `ParentConsentSection`'s query should set `staleTime`/`refetchOnMount`
given NFR-005's "must not block page paint" concern; (c) RSC↔client boundary
confirmation that `onFetchParentConsent`/`onToggleParentConsent` Server Action
refs cross the client boundary safely (same mechanism already proven by
`onFetchLinkedAccounts`/`onLinkAccount`, so low risk, just confirm).

## 5. Composition & Variant Strategy

### 5.1 Promotion ruling (definitive — replaces plan.md's open question)

Read `pl-skeleton.tsx`, `pl-error.tsx`, `pl-empty.tsx`, and confirmed
`components/shared/empty-state/empty-state.tsx` exists. Ruling:

- **`ConsentEmpty` — DO NOT build it. Reuse `EmptyState` directly**, same as
  `PLEmpty` already does internally for its `no-filter` variant (`icon={Link2}
  title body cta`). This section only ever needs ONE empty variant (no
  filtered/no-filtered split like admin's two-variant case), so there isn't
  even a dispatcher to write — call `<EmptyState icon={Users} title={t(...)}
  body={t(...)} />` directly inline in `ParentConsentSection`'s empty branch.
  No CTA needed (AC-002.1 is "contact-school guidance" text, not a button).
  This is not a new file in the plan's list — cut it.
- **`ConsentSkeleton`/`ConsentError` — build feature-local as planned, DO NOT
  promote `PLSkeleton`/`PLError` to `components/shared/` this story, and DO
  NOT make these two files thin wrappers around them either.** Reasons,
  concretely:
  - `PLSkeleton` renders **5 flat table-row shimmers** (avatar+2 lines+2 pill
    placeholders+trailing icon) — a table-row shape. `ConsentSkeleton` needs
    **card-shaped shimmers** (per §3.5: header row + 3 toggle-row shimmers,
    inside a bordered card, × 2) — different internal layout, not just a
    different `rows` count prop. Forcing one component to cover both shapes
    today means either a `variant: "table-row" | "card"` prop that only ever
    has 2 call sites in the whole codebase, or leaky per-shape prop soup — both
    violate the "no over-abstraction until 3+ instances" guidance in this
    role's own brief. `pl-skeleton.tsx`'s own comment already says "no generic
    shared skeleton exists" — this story is only the 2nd data point for a
    generic `list-skeleton`, and the two shapes don't actually match, so
    promoting now would be forcing a false generalization, not extracting a
    real one.
  - `PLError` and `ConsentError`'s prop shapes ARE structurally identical
    (`title/description/retryLabel/onRetry`) — this IS a stronger promotion
    signal than the skeleton case. Still ruling **do not promote this story**:
    promoting requires (a) moving `pl-error.tsx` out of
    `admin/parent-links/presentation/parent-links-screen/` (a cross-feature
    file move + import-path update in an unrelated, already-shipped feature —
    out of this story's stated file list and a needless coupling point between
    two independently-scoped stories per story.md's own "independent
    repository" requirement for the *data* layer — extending that
    independence to presentation too keeps the blast radius of any future
    `admin/parent-links` change from touching `user/profile`), and (b) there
    is still only 2 occurrences — decision `0026`'s rule is triggered at "used
    by ≥2 screens," which is satisfied count-wise, but the promotion cost here
    (cross-feature file surgery for a 4-field wrapper) outweighs the DRY gain
    for a component this thin. **Defer promotion to whichever 3rd story next
    needs a generic list-error card** — at that point, extract both into
    `components/shared/error-state/` in one dedicated pass (not smuggled into
    an unrelated story's diff). Flagging this explicitly so
    `fe-tech-lead-reviewer` doesn't block on decision `0026` for this specific
    pair — this is a considered, documented exception, not an oversight.
- Net effect on plan.md's file list: `consent-empty.tsx` is **removed**;
  `consent-toggle-row.tsx` is **added** (§3.4, not previously listed).

### 5.2 cva / variant notes

- `StatusBadge` already has a `tone` prop (cva-backed via `TONE_CLASS`) — use
  `tone="success"` for "Đã liên kết" (matches `LinkedAccountsSection`'s own
  `linked` badge semantics: success-tinted, not a new tone).
- `Switch` already has a `size` prop (`"sm" | "default"`) — use `size="default"`
  (default 1.15rem × 2rem visual box ≈ close to design-spec's 42×24). The
  **44×44 touch target (NFR-003)** is NOT a `Switch` variant concern — it's a
  wrapping-element concern: `ConsentToggleRow` wraps the `Switch` in a
  `min-h-[44px] min-w-[44px]` flex/grid cell (same `min-h-[44px]` pattern
  already used on `LinkedAccountRow`'s action `Button`), so the *visual*
  switch stays at its design-spec 42×24 while the *hit area* around it (row
  padding + the wrapping cell) satisfies 44×44. Do NOT add a new `size="lg"`
  Switch variant to `components/ui/switch/switch.tsx` for this — the touch
  target is a layout/padding concern of the composed row, not the primitive.
- No compound-component/`asChild`/`Slot` pattern needed anywhere in this tree
  — every new component takes flat props, no polymorphic rendering required.

## 6. Accessibility Contract

| Node | Role/label | Keyboard |
| --- | --- | --- |
| `ParentConsentSection` loading | `ConsentSkeleton`'s shimmer `aria-hidden`, sibling `<span role="status" className="sr-only">{loadingAriaLabel}</span>` — same pattern as `PLSkeleton` | n/a |
| `ParentConsentSection` empty | `EmptyState`'s own `role="status"` container (already built-in) | n/a |
| `ParentConsentSection` error | `ConsentError`'s outer `role="alert"` (matches `PLError`); retry = a real `<Button>` | Tab to retry button, Enter/Space activates (native button semantics) |
| `ChildConsentCard` avatar | decorative — `AvatarFallback` text (initials) has no extra `alt`/`aria-label` needed (matches `profile-screen.tsx` identity card, which has none either — text content IS the accessible name) | n/a |
| `StatusBadge` "Đã liên kết" | plain text content inside `<Badge>` — no icon-only concern (text carries the meaning already, no color-only signal) | n/a |
| `ConsentToggleRow` `Switch` | Radix `SwitchPrimitive.Root` → native `role="switch"` + `aria-checked` (built-in); `aria-labelledby={labelId}` + `aria-describedby={descId}` wired via `useId()` inside the row, pointing at the visible label `<span id={labelId}>` and description `<p id={descId}>` (NFR-001) | native Radix Switch: Space/Enter toggles, Tab moves focus — no custom keydown handler needed (AC-004.3 satisfied by using the primitive as-is, not reimplementing) |
| `ConsentToggleRow` inline error | `role="alert"` on the error `<p>`, mirrors `LinkedAccountRow`'s `error` paragraph exactly | n/a |
| `ConsentToggleRow` pending sub-state | disabled `Switch` (`disabled` prop → `aria-disabled` via Radix) + `Skeleton` overlay — never renders a guessed `aria-checked` value | n/a (not interactive while pending) |
| Section header icon-box (bell icon) | `aria-hidden="true"` — decorative, title text carries the heading meaning | n/a |
| Footnote lock icon | `aria-hidden="true"` — footnote text itself carries the meaning | n/a |
| Toast | `sonner`'s own built-in `aria-live` region (already accessible by the primitive, no extra work) | n/a |

Contrast: `ConsentError`'s icon box should reuse `PLError`'s exact
`bg-edu-error-dark-light` / `text-edu-error-dark` token pair (already AA-proven
in that component) rather than re-deriving a new error-icon treatment.

## 7. Definitive file list (supersedes plan.md §4's list)

```
src/features/user/presentation/profile/consent-section/
  parent-consent-section.i-vm.ts
  parent-consent-section.tsx
  child-consent-card.tsx
  consent-toggle-row.tsx        # NEW — not in plan.md's original list
  consent-skeleton.tsx
  consent-error.tsx
  parent-consent-section.stories.tsx
  # consent-empty.tsx — CUT, reuse components/shared/empty-state directly
```
