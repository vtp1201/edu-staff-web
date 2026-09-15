---
name: pattern-conditional-tabpanel-wrapper
description: E24.16 review — an ARIA panel that only exists for one role needs a MODULE-level conditional wrapper (never an in-render component), and route-href helpers belong in bootstrap/tenant, not a feature VM builder
metadata:
  type: project
---

Adding an optional consumer-owned tabpanel (shared `ChildSwitcher` emits
`aria-controls`, the screen owns the panel) across N render branches.

**Why:** a screen with several early-return branches (error / empty / success)
must pair the panel in EVERY branch that renders the tablist, or the active
tab's `aria-controls` dangles in exactly the branch reviewers check last. And
`role="alert"` cannot double as `role="tabpanel"` — the alert has to become a
CHILD of a wrapping region.

**How to apply:**
- One module-level `function XTabPanel({ panelProps, busy, children })` that
  returns `<>{children}</>` when `panelProps === null`. Declaring it inside the
  screen makes it a new component type each render → the whole subtree unmounts
  on every pending-flag edge (focus/scroll lost). Type `panelProps` as
  `{role:"tabpanel"; id; "aria-labelledby"} | null`, not `{}` — the null makes
  "don't wrap" explicit and keeps non-parent DOM byte-identical.
- The no-selected-tab case (foreign route id) must emit NO panel at all; prove
  it with `queryByRole("tabpanel")` being null.
- Storybook is the ONLY DOM proof here (no RTL in repo). With a record rendered
  there are TWO tablists (child + year) and TWO tabpanels → scope every query:
  `within(canvas.getByRole("tablist", { name: "Chọn con" }))` and pick the panel
  by `el.id`, never `getByRole("tabpanel")` bare. Cast
  `canvas.getAllByRole(...) as HTMLElement[]` or `.find((el) => …)` is implicit-any.
- Route-href builders (`academicRecordHref`) live next to `tenantUrl` in
  `src/bootstrap/tenant/` + its barrel — a client component already imports that
  barrel, so it is safe from client bundles. A feature's `presentation/` VM
  builder is not a canonical home for app-routing knowledge.

See [[pattern-promote-with-own-ivm]], [[gotcha-aria-label-on-span-and-tab-order]].
