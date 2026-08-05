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
- **A reachable ROUTE is not a reachable UI — check `nav-config.ts`.** Round 2 of
  the same review: reusing the already-guarded `/principal/grade-book` +
  `/admin/grade-book` was right, but both were pre-existing **nav-less orphans**,
  so the capability was URL-only. Whenever you mount a capability on a route you
  didn't create, grep `NAV_BY_ROLE` for its href. Adding an entry has two hard
  constraints its test file enforces: `/profile` must stay LAST for non-admin
  roles (insert BEFORE it), and `NAV_BY_ROLE.admin.length` is HARDCODED (bump it).
  Reuse the existing `labelKey` (`grades`) — a second route for the same concept
  needs no new i18n key; lock that with a test asserting all such entries share it.
- See [[gotcha-rsc-closure-prop-500]] — the other half of the same round: the
  route a role CAN reach also has to not 500 on its default load.
