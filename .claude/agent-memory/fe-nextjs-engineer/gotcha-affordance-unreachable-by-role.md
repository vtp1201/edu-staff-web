---
name: gotcha-affordance-unreachable-by-role
description: A role-gated affordance can be perfectly secure and still unreachable — check WHICH ROUTE mounts the container against that route's namespace guard before claiming an AC is met
metadata:
  type: feedback
---

Before claiming a role-gated capability works, grep for **every route that mounts
the container**, then read that route's namespace layout guard. The guards in this
repo are STRICT EQUALITY (`evaluateNamespaceAccess` / `evaluateAdminAccess`:
`role === requiredRole`), so a capability whose allowed roles are
`["principal","admin"]` is DEAD if its only mount point is under `teacher/`.

**Why:** US-E18.44 shipped a reject flow where RBAC, the server-action re-check
and the capability-as-presence VM were all correct and fail-closed — and the
control was still unreachable, because `GradeEntryContainer` had exactly one
route (`teacher/grades`). Tech-lead blocked it: "not a security hole, an AC that
cannot be exercised." "Server action guards on `["principal","admin"]`" reads like
proof of reachability but is the opposite — it's proof the mounting route is wrong.

**How to apply:**
- Fix by reusing an EXISTING already-guarded route for those roles, not by
  inventing a route/nav entry.
- Put the Server Action in the route dir that can reach it, and revalidate every
  sibling namespace path that renders the same data (`admin/*` + `principal/*` are
  two distinct routes with separate guards but one screen).
- Watch for the mirror-image defect: after moving the mount, an affordance the OLD
  screen owned can become unreachable. Term lock lived only on the 2 routes that
  moved, so it had to move WITH them (plus its stories) — see
  [[pattern-role-discriminated-vm]] and [[pattern-readonly-variant-second-caller]].
- Moving a mount onto a different READ SHAPE is often the point, not a side
  effect: the privacy-narrowed shape (`GradeBookRow`/`GradeCell`) structurally
  cannot carry staff-only payload, so an approver view must read the staff shape.
- While writing tests for a moved mutation, re-check its guard: the moved
  `lockTermAction` (irreversible) turned out to have NO `requireRole` at all —
  route layouts don't protect a directly-invoked Server Action.
