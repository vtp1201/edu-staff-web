---
name: pattern-rbac-widening-zero-code-delta
description: E18.57 — a BE RBAC WIDENING (403 → filtered 200 with possibly-empty list) is a zero-code-delta FE story; the real payload is honest role-aware EMPTY copy + a regression guard + killing stale in-code RBAC claims
metadata:
  type: project
---

A BE grant that turns "role X gets 403" into "role X gets a FILTERED 200 (maybe
`[]`)" needs **no** repository/mapper/use-case/DI change when RBAC is BE-side
off the Bearer token and FE sends no role parameter. Verify it, don't assume:
grep the feature for role references (only presentational ones may exist), and
check the repo has no "no rows ⇒ must be unauthorized" shortcut — a failure must
come ONLY from a thrown wire error.

**Why:** the story then looks empty, and the temptation is to either invent work
(role-awareness in the mock repo — forbidden, per-role filtering is BE-only,
decision 0014) or to close it as a no-op. Both are wrong. The genuine defects a
widening leaves behind are:
1. **Copy that now lies.** A shared generic empty state ("chưa có bản ghi nào")
   asserts *there is nothing*, while the truth for the newly-scoped role is
   *nothing you're authorized to see*. BE usually gives NO signal separating
   "truly zero" from "zero authorized" — do not probe with a second call (that
   is itself a scope leak). One message true under BOTH readings is correct.
2. **Stale in-code RBAC claims.** Endpoint/repository doc-comments asserting
   "ROLE is NOT in the allow-list" are read as ground truth by the next
   engineer — more dangerous than a stale doc. Grep the ask number (`#48`) and
   the role name across `src/` + `docs/`, not just the file the packet named.
3. **A missing regression guard.** Pin `records: []` → `{ok:true, data:…}` at
   the repo level and `error: null` at the VM level, framed so the test WOULD
   fail under the old all-or-nothing reading.

**How to apply:** make the copy switch a pure exported selector on the `.i-vm`
(`emptyStateCopyKey(role): "empty" | "empty.<roleReason>"`) — unit-testable with
no render, and a static union return keeps `t(\`${key}.title\`)` compile-checked
against typed messages. Pair the new Storybook story with a *negative* assertion
in the pre-existing generic-empty story (new copy must NOT leak to other roles)
so the two states are provably screenshot-distinct. Related:
[[pattern-force-mock-vs-honest-degrade]], [[pattern-stale-assertion-only-unmock]].
