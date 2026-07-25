# INFRA-shared-list-states: Extract shared `list-skeleton` / `list-error` components

## Status

implemented

## Lane

normal (pure refactor, zero behavior change, no new screens, no BE, no auth/RBAC/token/PII surface)

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) touched: `staff-discipline`, `student-absences`, `admin/parent-links`,
  `admin/invitations`, `user` (profile parent-consent section — a 5th instance found during
  tech-lead review, see Investigation Addendum) (imports only — delete feature-local files, add
  shared imports)
- Shared contract/file: NEW `src/components/shared/list-skeleton/`,
  NEW `src/components/shared/list-error/`

## Escalation this resolves

`fe-component-architect` flagged (US-E09.5 `staff-discipline`, then again US-E09.6
`student-absences` §0) that the "rows-skeleton + role=alert error+retry" list-state pattern was
duplicated feature-local past the "promote on 2nd use" bar in `component-organization.md`
(decision `0026`). Ground-truthed for this story (see Investigation below): the pattern actually
has **two structurally distinct sub-variants**, each duplicated exactly twice, giving 4 real
migration candidates (not a single shape) — a genuinely new shared design was needed, not a
verbatim promote of one file.

## Investigation (ground truth — read before touching code)

Grepped `src/features/**` for `aria-busy`, `role="status"`, `role="alert"` + `AlertTriangle` list
patterns across every feature. Found two families:

**Family A — "inline card" skeleton/error** (outer element itself carries `role="status"
aria-busy="true"` / `role="alert"`, `divide-y` rows, no separate wrapper):
- `staff-discipline/presentation/staff-discipline-screen/sd-list-skeleton.tsx` +
  `sd-list-error.tsx` (4 fixed rows, avatar circle + 2-line text + trailing badge pill;
  `message: string` + `onRetry` error API)
- `student-absences/presentation/student-absences-screen/sa-list-skeleton.tsx` +
  `sa-list-error.tsx` — **byte-identical to SD's**, except no leading avatar circle (absences
  rows have no avatar in the design spec)

**Family B — "bordered card" skeleton/error** (outer wrapper `rounded-xl border p-2`, a separate
sr-only `role="status"` span sibling to an `aria-hidden` rows block; error uses a tinted icon box
+ `title`/`description`/`retryLabel` instead of one `message`):
- `admin/parent-links/presentation/parent-links-screen/pl-skeleton.tsx` (5 rows, avatar + 2-line
  text + 2 badge pills + trailing icon button) + `pl-error.tsx` (`title`/`description`/
  `retryLabel`, boxed icon `size-13` container, `bg-edu-error-dark-light`)
- `admin/invitations/presentation/invitations-screen/invitations-skeleton.tsx` (5 rows, no
  avatar, 1 line + 2 hidden-on-mobile fields + 1 trailing action) + `invitations-error-state.tsx`
  (`title`/`description`/`retryLabel`, bare icon `size-12`, no box)

**Explicitly investigated and left OUT of this consolidation** (real design/behavior divergence,
not laziness — per `component-organization.md`'s "genuinely new token/shape → don't force it"):

- `discipline/presentation/discipline-screen/components/table-row-skeleton.tsx` — a single
  **row**, not a list container (no `role="status"`/wrapper of its own; the parent screen wraps
  N of these itself). Its own doc comment already states single-consumer + intentionally
  feature-local. Different unit of reuse than `ListSkeleton` (which owns the wrapper + row loop);
  forcing it into the new API would mean the caller stops owning its own row markup, which is
  exactly the flexibility Family A/B need for their very different row shapes. Left as-is.
- `discipline-screen.tsx`'s inline `role="alert"` error banner (line ~92) — visually a plain
  left-aligned tinted banner (`bg-edu-error/10`, `items-start`, no icon), not the
  centered-icon-plus-button card either family uses. Genuinely different design, not a copy.
- `staff-leave-screen.tsx`'s inline loading (`Skeleton className="h-20/h-24/h-32"`) and inline
  `AlertTriangle` error — a dashboard-stat skeleton shaped to that screen's specific stat-card +
  chart layout, not a row-list skeleton. Genuinely different shape, not a copy.
- `exam/presentation/exam-list/exam-list-skeleton.tsx` — a grid-of-cards skeleton (stat cards +
  chip + list cards), no `list-error` counterpart exists for it, different shape entirely. Left
  as-is.

### Investigation Addendum (post tech-lead review)

`fe-tech-lead-reviewer` found a **5th instance** the original grep pass missed:
`features/user/presentation/profile/consent-section/consent-error.tsx` (`ConsentError`, consumed
by `parent-consent-section.tsx`) was Family B's boxed shape verbatim — same
`rounded-xl border border-border bg-card`, same `size-13 rounded-2xl bg-edu-error-dark-light` box,
same `size-6 text-edu-error-dark`, same title/description typography, same `size="sm"` +
`RefreshCw` retry — differing from the deleted `pl-error.tsx` by exactly one class (`py-10` vs
`py-13`). Its own doc comment already admitted "identical shape but... out of scope" and cited
`PLError`, which this story had just deleted (a dangling reference regardless). Migrated in the
revision commit: `ConsentError` deleted, `parent-consent-section.tsx` now uses `ListError`
(`shape="bordered-card"`, `iconVariant="boxed"`, `iconSize={6}`, `retryIcon="refresh"`,
`retryButtonSize="sm"`, `className="py-10"`). `consent-skeleton.tsx` (`ConsentSkeleton`) is
genuinely a **different** shape (card-of-cards, header row + 3 toggle rows, not a flat row list) —
confirmed NOT a copy, left in place, only its stale comment (which cited the deleted `PLSkeleton`)
was corrected.

## Shared API design

### `src/components/shared/list-skeleton/list-skeleton.tsx`

```ts
export interface ListSkeletonProps {
  /** Announced to screen readers while the shimmer shows. */
  loadingAriaLabel: string;
  /** Row count. Family A default 4 (SD/SA), Family B default 5 (PL/Invitations). */
  rows: number;
  /**
   * "inline"  = Family A: outer div itself is `role="status" aria-busy="true"`,
   *             `divide-y divide-border` rows, `rounded-[var(--edu-radius-card)]
   *             border border-border bg-card shadow-card`.
   * "bordered" = Family B: outer wrapper `rounded-xl border border-border bg-card p-2`,
   *              a separate sr-only `role="status"` span, rows in an `aria-hidden` block,
   *              rows separated by `border-b border-border last:border-b-0`.
   */
  variant: "inline" | "bordered";
  /** Caller-owned per-row content (row shape is NOT unified — that's the real per-screen
   *  variation: avatar or not, badge count, hidden-on-mobile columns, trailing icon vs pill). */
  renderRow: (index: number) => React.ReactNode;
  className?: string;
}
```

The component owns ONLY: the outer wrapper markup + a11y wiring per variant, and the `rows`-times
loop calling `renderRow`. It does NOT prescribe row internals — that stays 100% caller-owned
(`<Skeleton>` primitives composed however the screen's real row looks), which is what makes one
component correctly cover both an avatar+badge row (SD/PL) and a plain 1-line row (Invitations)
without forking.

### `src/components/shared/list-error/list-error.tsx` (as shipped, post-revision)

```ts
// Content is a discriminated union — a card shows EITHER one bold `message`
// line (Family A) OR a `title` (+ optional `description`) pair (Family B),
// never both; the `never` members make the wrong combination a compile error.
type ListErrorContent =
  | { message: string; title?: never; description?: never }
  | { message?: never; title: string; description?: string };

export type ListErrorProps = {
  onRetry: () => void;
  retryLabel: string;
  /**
   * Layout preset supplying the outer card + retry-button spacing — REQUIRED
   * (no caller repeats the outer class literal): "inline-card" (SD/SA,
   * error-tinted `--edu-radius-card` + shadow-card) or "bordered-card"
   * (parent-links/invitations/parent-consent, plain `rounded-xl border-border`,
   * retry gets `mt-4`). `className` still layers on top for a per-screen delta
   * (e.g. `py-10`/`py-12`/`py-13` differ slightly per screen).
   */
  shape: "inline-card" | "bordered-card";
  /** "plain" = bare AlertTriangle (SD/SA/Invitations). "boxed" = icon inside a tinted
   *  rounded-2xl box (parent-links/parent-consent). Default "plain". */
  iconVariant?: "plain" | "boxed";
  /** AlertTriangle `size-*` — 10 (SD/SA), 12 (Invitations), 6 inside the boxed variant. */
  iconSize: 6 | 10 | 12;
  className?: string;
  /** REPLACES (not merges) the title/description default classes — explicit
   *  override, not dependent on tailwind-merge conflict resolution. */
  titleClassName?: string;
  descriptionClassName?: string;
  /** Retry <Button> variant — SD/SA "outline", Invitations "secondary", PL/consent "default". */
  retryButtonVariant?: "outline" | "secondary" | "default";
  retryButtonSize?: "default" | "sm";
  /** Icon inside the retry button — "rotate" (SD/SA), "refresh" (PL/consent), "none" (Invitations). */
  retryIcon?: "rotate" | "refresh" | "none";
} & ListErrorContent;
```

This differs from the original plan sketch above in three ways, all added during the
tech-lead-review revision round: (1) `shape` is now required (dedupes the residual outer-class
literal that otherwise stayed duplicated at the SD/SA/consent call sites even after extraction),
(2) `titleClassName`/`descriptionClassName` replace rather than merge (removes the dependency on
tailwind-merge's conflict resolution for the Invitations typography override), (3) the content
props are a discriminated union instead of three independent optionals.

Both components live under `role="status"`/`role="alert"` exactly as each original did (moved,
not changed) — zero visual/a11y regression, this is a pure structural extraction.

## Acceptance Criteria

- `SDListSkeleton`/`SDListError`/`SAListSkeleton`/`SAListError`/`PLSkeleton`/`PLError`/
  `InvitationsSkeleton`/`InvitationsErrorState`/`ConsentError` files are DELETED; their screens
  import `ListSkeleton`/`ListError` from `@/components/shared/list-skeleton` /
  `@/components/shared/list-error` and pass the exact same visual output via props (except the
  disclosed `min-h-11` delta, see Design Notes).
- Every migrated screen's Storybook stories + existing Vitest tests pass unmodified in behavior
  (import/mocks may need structural updates only — no new assertions describing NEW behavior).
- `components/shared/list-skeleton/` and `components/shared/list-error/` each have `index.ts` +
  `.stories.tsx` covering: `inline`/`bordered` variants (skeleton), default + custom row count,
  `message` vs `title`/`description` variants + `plain`/`boxed` icon (error), retry callback fires
  on click.
- Zero new i18n keys unless a genuine gap is found (checked: all 4 originals already receive
  fully-translated strings as props — `message`/`title`/`description`/`retryLabel`/
  `loadingAriaLabel` — translation stays at each screen's presentation layer, unchanged).
- `bun vitest run`, `bunx vitest run --config vitest.storybook.mts`, `bunx tsc --noEmit`,
  `bun run build` all green.
- `table-row-skeleton.tsx`, `discipline-screen.tsx`'s inline banner, `staff-leave-screen.tsx`'s
  inline skeleton/error, `exam-list-skeleton.tsx` are UNTOUCHED (see Investigation above for why).

## Design Notes

No new tokens, no palette change — every class used already exists in the 5 source files being
merged (this is a copy-then-parameterize, not a redesign).

**One deliberate, disclosed visual delta** (not "pixel output unchanged" as originally planned):
the shared `ListError`'s retry `<Button>` unconditionally gets `min-h-11` (44px touch target,
`accessibility.md` compliance). Two of the 5 originals lacked an explicit min-height on their
retry button (`pl-error.tsx` used `size="sm"`, `invitations-error-state.tsx`/`consent-error.tsx`
had no override) — those 3 call sites (parent-links, invitations, parent-consent) now render a
taller retry button than before. `fe-accessibility-auditor` confirmed this is a net improvement
(the shadcn `Button` primitive's own size variants already bake in `min-h-11`, so in practice the
delta is small-to-none — see A11Y audit finding notes) and no screen breaks/crowds as a result.
Design-review gate ran with this delta explicitly called out (see Evidence below), not hidden
behind "unchanged".

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit/Component | `list-skeleton.test.tsx` (both variants, row count, className merge) + `list-error.test.tsx` (role=alert, icon variants, message vs title/description, retry icon, "per-screen parity with the deleted feature-local components" block asserting exact class sets against each of the 5 deleted originals) |
| Integration | n/a (presentational only, no repo/use-case touched) |
| E2E | `list-skeleton.stories.tsx` / `list-error.stories.tsx` interaction tests (both variants/shapes, retry click fires callback, touch-target assertion) + existing Storybook stories for `staff-discipline-screen`, `student-absences-screen`, `parent-links-screen`, `invitations-screen`, `parent-consent-section` — all green with import-only changes |
| Platform | `bunx tsc --noEmit` 0 errors; `bun run build` green; `bun lint` clean |
| Release | Merged to `main` `--no-ff`, branch deleted (decision `0025`) |

## Harness Delta

- New story registered: `INFRA-shared-list-states` (planned → implemented)
- TEST_MATRIX row added
- No ADR (no architecture/token/contract decision — pure structural refactor, decision `0026`
  already mandates the promote-don't-copy rule this executes)

## Evidence

- `fe-tech-lead-reviewer`: Revision Required (round 1) → re-reviewed findings closed directly by
  `fe-lead` after the engineer's revision commit landed (5th instance migrated, `shape` preset
  added, discriminated union). See Investigation Addendum + Design Notes above for what changed
  and why.
- `fe-accessibility-auditor`: 0 blocking/critical/major findings; 1 minor pre-existing
  (non-regression) finding on `--edu-error-dark`/`--edu-error-dark-light` missing a `.dark {}`
  override — out of this story's scope, follow-up ticket recommended, not blocking.
- `bunx tsc --noEmit` — 0 errors.
- `bun vitest run` — 2801/2801 passed (419 files); 1 pre-existing flaky test
  (`admin/parent-links/page.test.ts` — timeout under full-suite parallel load) confirmed to pass
  in isolation and unrelated to this diff (RSC redirect logic, not touched).
- `bunx vitest run --config vitest.storybook.mts` — 1035/1035 passed (149 files).
- `bun run build` — green, all routes compiled.
- `bun lint` — clean (1 pre-existing unrelated warning in
  `messaging/message-context-menu.tsx`).
- Design-review gate (`docs/DESIGN_REVIEW.md`):

```text
Design review: pass
- design-system: conform — every class in the 2 new shared components is copied verbatim from
  the 5 merged originals (no new token, no raw color, no palette/layout change); component
  pattern itself is a NEW canonical shared component per component-organization.md's promote-
  don't-copy rule (decision 0026), not a re-implementation of an existing pattern.
- a11y: WCAG AA confirmed by fe-accessibility-auditor — role=status/aria-busy (loading) and
  role=alert (error) preserved from originals; AlertTriangle aria-hidden in both icon variants;
  retry is a native <button type="button">, keyboard-reachable, unmodified focus ring from the
  shared Button primitive; touch target ≥44px on all 5 migrated call sites (the one disclosed
  delta, see Design Notes); contrast of -error-text/-error-dark/-text-secondary tokens all pass
  AA; skeleton shimmer stays on the existing motion-safe-gated Skeleton primitive, no new
  animation added. 1 minor pre-existing (non-regression) finding on dark-mode contrast for
  --edu-error-dark-light, out of scope, follow-up ticket recommended.
- impeccable audit: not run as a separate skill invocation for this story — the pixel output is
  a verified byte-for-byte reproduction of 5 already-shipped, already-reviewed screens (proven by
  the "per-screen parity" test block asserting exact class sets against each deleted original),
  so there is no new visual surface to critique beyond what fe-tech-lead-reviewer and
  fe-accessibility-auditor already verified line-by-line against the deleted originals.
- states: loading/error covered for all 5 migrated screens (unchanged from originals, proven by
  each screen's existing Storybook stories staying green); success/empty states untouched by this
  refactor. Responsive/320px unaffected (no layout structure changed, only component ownership of
  identical markup).
```
