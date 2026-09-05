---
name: pattern-third-mode-on-shared-component
description: US-E24.10 — adding teacher/readonly modes to a shipped student component; optional-prop defaults as the regression guard, staff rows are NOT links, and the one-optimistic-mutation rule
metadata:
  type: project
---

Adding the 2nd and 3rd `mode` to an already-shipped shared component
(`features/lms/presentation/course-timeline/`, student-only since US-E24.3).

**Why:** decision 0026 forbids forking, so the same files gain branches — which
is exactly where a silent student-mode regression hides.

**How to apply:**

- **Every new prop is optional with a default that reproduces today's markup**
  (`interactive = true`, `editable = false`, `mode` omitted). Then existing
  fixtures/stories that pass nothing render byte-identically, and the guard is
  structural rather than a promise. Assert the ABSENCES per mode in one node
  test (`not.toContain` the teacher labels for student/readonly) — that half is
  what a screenshot never proves.
- **A staff row is NOT a link.** There was no teacher-side player route, so the
  packet's implied chevron would have pointed at the student route (a dead end
  or a 403). Check that the target route EXISTS for the new role before
  inheriting the old mode's navigation.
- **Teacher affordances go BESIDE the row's link, never inside it** — buttons
  nested in an `<a>` are invalid and break the one-focus-target contract. In
  practice that means the staff branch renders plain content + a sibling
  control cluster.
- **HTML5 native `draggable` is mouse-only.** The "Lên/Xuống" buttons are the
  REQUIRED keyboard path (accessibility.md), not a nicety, and both paths must
  call the SAME pure order-builder + the same mutation — two code paths for one
  cache key is how the drag and keyboard bodies drift apart.
- **Exactly one optimistic mutation** (reorder). The other six wait: a patched
  row's new `state` is BE-computed from the window, and a create/delete/publish
  that "succeeded" then failed is a worse lie than a spinner. See
  [[pattern-usecase-result]].
- Removing the LAST entry of an `Exclude<>`-derived union (the final
  `TabPlaceholder`) collapses it to `never` — delete the component, its test
  block, its story and its now-unread i18n keys in the same commit.
