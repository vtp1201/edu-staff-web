---
name: pattern-seeded-client-body-and-create-only-resource
description: US-E24.9 review — a useState-seeded client body under a URL-state RSC needs key={urlParam}; a BE resource with CREATE but no UPDATE makes any "Sửa" affordance a guaranteed 409
metadata:
  type: feedback
---

Two defects that a reviewer found in the same story, both invisible to tsc/lint/tests.

**1. `useState(seedProp)` under a URL-driven RSC is stale forever.**
`?week=` nav re-renders the RSC with fresh props, but React reuses the mounted
client subtree, so maps seeded once with `useState(initial)` keep the PREVIOUS
week's rows. With a full-replace PUT downstream that is data loss, not just a
cosmetic staleness: an already-written record renders as "chưa ghi" and the next
save overwrites it. Fix = `key={vm.<urlParam>}` on the client body in the RSC.

**Why:** same family as [[pattern-seed-resync-and-live-region]] (`useState(seedProp)`
is stale forever) — the key-remount variant applies when the whole subtree is
week/tab-scoped rather than append-paginated.

**How to apply:** any time an RSC passes server-read rows into a client component
that seeds state from them, ask "what changes these props without unmounting?".
Proof in a node-env repo (no @testing-library/react): call the async RSC and
assert `element.key` — two different params must yield two different keys with
the same `element.type`. That is exactly the input React reconciles on.

**2. CREATE + SUBMIT + no UPDATE ⇒ the edit affordance is a dead end.**
core's `/homeroom-entries` allows one entry per (class, date), has POST + submit +
revise but `/{entryId}` is GET-only. A UI that routes "Sửa" on an existing entry
back through create 409s every time, which also made SUBMIT and REVISE
unreachable. Correct shape = three disjoint states: no entry → editor+create;
saved DRAFT → submit-BY-ID only (state the lock in VISIBLE text, and after
`revise` do NOT re-open the editor); REJECTED → revise → back to DRAFT.

**Why:** verdict was REVISION REQUIRED — every write path past the first save was
dead, and no test caught it because the stories only exercised the create path.

**How to apply:** before wiring a mutation UI, enumerate the resource's verbs from
`openapi.yaml`; if there is no update verb, no screen may offer "Sửa" on saved
content. Pin it with a story whose create action THROWS ("create must NOT be
called for an existing entry") — a passing story then proves the dead end is shut.
