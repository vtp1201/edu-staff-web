---
name: pattern-role-discriminated-vm
description: Make "role X has zero affordance for Y" a compile error via a viewerRole-discriminated VM union; plus the story-side tricks it forces (hidden:true under a modal, data-slot list scoping)
metadata:
  type: feedback
---

For a one-component-multi-role screen where an AC says *"no record/edit control
exists anywhere for this role — not merely disabled"*, make the **ViewModel a
discriminated union on `viewerRole`** instead of one flat interface with optional
actions:

- teacher arm: `classId`, `recordAbsenceAction`, `editAbsenceAction` — **no**
  `flagAbsenceAction` field at all;
- principal arm: `classOptions`, `flagAbsenceAction` — **no** record/edit fields.

**Why:** US-E09.6's AC-006.5/AC-005.1 are "genuine absence, not permission-hidden".
With a union the wrong route *cannot even wire* the action, so the AC is a compile
error to violate, not a review catch — same technique as the
`mode: "record" | "edit"` form-dialog union that makes an immutable natural-key
field impossible to make editable.

**How to apply (mechanics that bit):**
- Name the discriminant `viewerRole`, never `role` — Biome's
  `lint/a11y/useValidAriaRole` flags a `role="principal"` JSX prop and fails the
  pre-commit hook (already in [[gotcha-biome-role-prop-and-impeccable-cache]]).
- A captured boolean (`const isTeacher = vm.viewerRole === "teacher"`) does NOT
  narrow. Capture narrowed consts instead:
  `const teacherVm = vm.viewerRole === "teacher" ? vm : null;` and branch on
  `teacherVm &&` / `principalVm &&`. Hooks stay unconditional.
- In stories, `args` is the union, so role-specific mock assertions need one
  explicit narrowing helper (`asTeacher(args).recordAbsenceAction`).

**Storybook consequences for a confirm-dialog screen:**
- While a Radix modal is open the page content is `aria-hidden`, so **`getByRole`
  on the underlying row fails**. Assert "the row did not change" with
  `getByRole("button", { name, hidden: true })` — text queries are unaffected.
- Badge counts drift when the StatCard labels reuse the same i18n leaves
  (`unexcused`/`flagged`). Put a `data-slot="<x>-list"` on the rows container and
  scope counts with `within(canvasElement.querySelector('[data-slot=...]'))`.
- Extend a shared confirm dialog with an optional `errorSlot` (blocked tone
  force-disables confirm, transient keeps it) rather than forking one — the
  `DestructiveConfirmDialog` precedent; `PublishConfirmDialog` now has it too.

Related: [[pattern-destructive-confirm-and-moderation]], [[pattern-high-risk-authctx-reauth]].
