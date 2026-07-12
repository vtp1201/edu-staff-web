---
name: project-e10-6-renumbered-story
description: US-E10.6 messaging presence — renumbered story ID pitfall + service-name terminology correction pattern
metadata:
  type: project
---

US-E10.6 (messaging presence indicator, DR-017) was renumbered from a briefed
"US-E10.5" because that ID collided with an already-implemented, unrelated
story (`US-E10.5-messaging-defect-fixes`). All three upstream analyst docs
(requirements/integration/use-cases) had already corrected to E10.6 and
flagged the collision explicitly at the top of each file.

**Why:** silent ID collisions are easy to introduce when a story gets
renumbered mid-pipeline (e.g. after intake but before analysts finish) — if
the spec writer doesn't grep for the old number, stray references leak into
downstream Harness proof/TEST_MATRIX rows and corrupt traceability.

**How to apply:** when a packet's inputs mention a renumbering/collision note,
(1) use the corrected ID everywhere including UC/AC prefixes (`UC-10.6.x` not
`UC-10.5.x`), (2) grep the finished story.md/spec.md for the OLD number after
writing — the only hits should be the explicit disambiguation callout
sentences, never a stray traceability ID, (3) call this out again in the
final report back to the caller so ba-lead/fe-lead don't reintroduce it.

**Service-name terminology correction (same story):** requirements.md/DR
called the owning BE service "notification"; canonical service-map name
(decision `0017`) is `noti`. The integration analyst flagged this as a
terminology alignment, not a contract change — no ADR needed. Spec writer
should silently normalize to the canonical name throughout but flag the
correction once in §8 Constraints so downstream engineers don't reintroduce
"notification" as a label. See also [[feedback-spec-structure]] for the
additive-delta section pattern (domain-changes-first ordering) reused here
for the `isOnline` boolean → `presence?` union migration across 3 entities.
