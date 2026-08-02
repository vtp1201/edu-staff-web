---
name: feedback-reuse-claims-need-be-authorize-groundtruth
description: a BE repository primitive being real for one caller does not mean it's authorized for a new caller role — grep authorize() before briefing reuse as a fact
metadata:
  type: feedback
---

When planning to reuse an existing, already-real BE-backed repository method
for a NEW caller role (e.g. principal calling a primitive built for
parent/student), do not accept "it's role-agnostic / member-scoped, so it
should work for anyone" as ground truth without grepping the BE's actual
`authorize()` function for that specific handler.

**Why:** US-E15.3's intake research concluded `getByMember(memberId)` was
"role-agnostic, no BE gap, no mock-first needed" because it's keyed by
memberId not caller role, and the parent view already calls it successfully.
This was WRONG — `fe-tech-lead-reviewer` read
`edu-api/services/core/internal/timetable/core/application/usecase/get_member_timetable.go`'s
`authorize()` directly and found it only permits SUPER_ADMIN/ADMIN, the
target member itself, or a linked PARENT — no MANAGER (principal) branch at
all. The engineer had already built the whole screen assuming no gap; fixing
it required a full extra round (principal-scoped force-mock DI factory).

Compare: for US-E13.10 (principal reusing admin-roster's read paths), the
SAME kind of claim ("principal's token IS BE role ADMIN/MANAGER, so
ADMIN-gated endpoints should authorize it") was explicitly flagged in the
story packet as "the engineer MUST re-verify this directly ... before wiring
for real" — and the engineer DID ground-truth
`list_classes.go` directly, confirmed a genuine `MANAGER` read branch exists
(US-164), and shipped correctly on the first pass, no rework needed.

**How to apply:** whenever a story's plan claims "endpoint X already works
for role Y, so it'll work for role Z too" (member-scoped, resource-scoped, or
"same auth tier" reasoning), explicitly instruct whoever executes the
plan/story (planner, architect, or engineer) to grep the BE's Go
`authorize()`/RBAC check for that exact handler and quote the allowed-caller
list verbatim before treating the reuse as risk-free. Don't let "it's called
successfully by an existing caller" stand in for "it's authorized for this
NEW caller" — those are different claims. If ground-truthing reveals a gap,
default to the established repo pattern: a scoped force-mock DI factory (see
`principal-classes.di.ts`/US-E13.8) rather than shipping broken and finding
out from a 403 downstream.
