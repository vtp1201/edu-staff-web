---
name: pattern-staff-discipline-e09-5
description: US-E09.5 staff-discipline — mock-mode authCtx role hint, missing principal/teacher route guard, RSC-seed kills the skeleton path, Storybook accessible-name collision between filter chips and row actions
metadata:
  type: project
---

US-E09.5 (`src/features/staff-discipline/`) repeated the US-E20.1 authCtx seam on
a NORMAL-lane story whose NFR-008/009 were high-risk-grade. New things learned:

**Mock-mode role hint (the missing half of the authCtx pattern).** `decodeRoleClaim`
returns a synthetic `"admin"` for ANY token when `NEXT_PUBLIC_USE_MOCK=true`
(jwt.ts) → deriving `authCtx.role` purely from the token denies every principal
mutation in dev AND breaks a teacher self-view. Solution: pure
`resolveStaffDisciplineAuthContext({claimRole, claimMemberId, useMock,
mockRoleHint, ...})` in domain + `makeStaffDisciplineAuthContext(routeRole)` in DI.
The route-scoped hint is used ONLY when `useMock`; in real mode the claim wins and
unknown role ⇒ deny-by-default (`"student"`). Unit-test asserts the hint is ignored
in real mode — that test IS the security argument for the hint's existence.

**There is NO `(app)/principal/**` or `(app)/teacher/**` role guard.** Only
`(app)/admin/layout.tsx` has one (`evaluateAdminAccess`). `(app)/layout.tsx` gates
auth + tenant only. Packets/ADRs that say "reuse the existing role-group guard" for
principal/teacher are describing something that doesn't exist — don't hunt for it,
flag it. Server-side enforcement has to come from the repo-level authCtx re-check.

**RSC seeding makes the loading skeleton unreachable** on a tab whose only server
param is fixed: `initialData: seed` ⇒ `isLoading` is never true, so an
`XxxTabLoading` story asserting a skeleton is a LIE. Prove NFR-006 on a genuinely
cold path instead (conduct notes: change `termId` → new key → skeleton) and name the
seeded story honestly (`...RscSeededNoSkeletonFlash`).

**Storybook accessible-name collision:** state-filter chips reuse the status labels
("Từ chối" = REJECTED = the reject button label), so
`getAllByRole("button",{name:"Từ chối"})[0]` clicks the FILTER, not the row action —
the panel never opens and the failure looks like "Unable to find label". Fix at the
component (better a11y too): row action buttons get
`aria-label={`${label} — ${staff.staffName}`}` (StaffLeaveRequestCard precedent);
stories then query the exact composed name. Same trick disambiguates the row's
"edit" trigger from the term-bar "create" button (`new RegExp(title + " — ")`).

**i18n gap found:** no `staffDiscipline.errors.validation` (every other feature has
`<ns>.errors.validation`). Worked around with an exhaustive
`useSDErrorMessage()` switch across `discipline.errors.*` + `staffDiscipline.errors.*`
and by making the note field client-preventive (maxLength + disabled submit).
Also `discipline.errors.not-found` says "học sinh" (student) — wrong noun for a
staff screen, but the packet mandates verbatim reuse. Both flagged, not fixed.

**Review-fix pass (2026-07-25) learnings.**
- Design-spec `"type": "segmented (...)"` ⇒ the canonical control is
  `ui/radio-group` `variant="segmented"` (US-E03.1), NOT toggle-group: real
  radiogroup semantics + arrow keys + it accepts `aria-invalid`. A `<label
  htmlFor>` can't name a radiogroup → visible `<span id>` + `aria-labelledby`.
  Per-segment "badge-toned selected" = LITERAL `data-[state=checked]:bg-… /
  text-…` strings (Tailwind v4 can't scan a computed class); reuse the
  `StatusBadge` tone pairs so no new token is needed.
- A picklist whose entries are the STORED wire value (category, term label) is
  DATA → lives in `fixtures.ts` (name the map, derive the array, point the seed
  rows at it so they can't drift), never in `messages/*.json`.
- `aria-invalid` must mark a REAL failure. When the confirm button is disabled
  below the min length, the client guard can never fail on submit ⇒ the only
  honest `aria-invalid` source is the server error key; requirement is carried
  by `aria-required` + hint text.
- **Radix Select inside a Dialog leaves the dialog `aria-hidden` right after the
  popup closes** ⇒ every subsequent `getByRole` inside that dialog fails
  ("Unable to find role …") while `getByLabelText` still works and the printed
  container clearly contains the node. Fix:
  `await waitFor(() => expect(dialogEl).not.toHaveAttribute("aria-hidden"))`
  after picking an option. Same family as the cmdk-in-dialog gotcha.
- **commitlint type-enum has NO `a11y`** (feat|fix|docs|style|refactor|perf|
  test|build|ci|chore|revert) — an `a11y(scope):` commit is rejected; use `fix`.

Related: [[pattern-high-risk-authctx-reauth]], [[pattern-route-role-guard]],
[[gotcha-cmdk-combobox-in-dialog]], [[pattern-invitations-e21-1]],
[[pattern-mock-first-wiring]], [[gotcha-result-shape-and-dynamic-i18n]].
