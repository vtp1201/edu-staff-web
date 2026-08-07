---
name: pattern-rbac-blocked-clientside-join
description: E18.54 — when BE says "do the join client-side", the blocker is usually RBAC not N+1; pick the ONE endpoint with the widest allow-list, degrade the residue honestly, file the ask for the rest
metadata:
  type: project
---

A BE answer of the form "field X isn't on that row — resolve it client-side from
resource Y" is only half an answer. **Check Y's authorization for EVERY consumer
role before designing.** In E18.54 (academic-record viewer) the suggested join
source `GET /classes/{classId}` 403s for STUDENT *and* PARENT — the two primary
AC roles — so the "obvious" design was dead on arrival while looking fine.

**Why:** `core` enforces role gates inside the use case, not the router, so
neither `openapi.yaml` nor the route table shows them. Only the Go use case
does (`get_class.go`, `get_student_enrollment.go`,
`list_student_academic_records.go` — the last one has `default: forbidden`,
i.e. TEACHER cannot read a học bạ at all even though an FE route exists).

**How to apply:**
1. Enumerate every read that carries the field, then tabulate its allow-list
   from the Go use case. Pick the ONE with the widest coverage even if it
   carries less data (E18.54: the enrollment point read
   `GET /classes/{cid}/students/{sid}` covers ADMIN+MANAGER+STUDENT-self+
   assigned-TEACHER and yields only `academicYearLabel`; losing `className` was
   worth not building a per-role strategy zoo).
2. Roles the chosen endpoint still cannot serve = an **honest degrade bucket**
   with its own i18n copy + its own VM signal, never a dropped or invented
   value — plus a **new BE ask**. Two strategies is engineering; four is the
   "elaborate workaround" a packet escape hatch is telling you not to build.
3. A join collaborator is `(ids[], scopeId) => Promise<Map>` built in
   `bootstrap/di`, deduping internally (so no caller can forget), capped, and
   **fail-soft per id** (one 403 must not fail the primary read).
4. Say so in the story Evidence *and* the endpoint doc comment: which
   allow-list, which role is left out, which ask number.

Related: [[pattern-force-mock-vs-honest-degrade]],
[[gotcha-openapi-drifts-from-go-source]], [[pattern-partial-gap-closure-wiring]].
