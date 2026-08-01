---
name: project-us-e1826-timetable-by-member-plan
description: US-E18.26 timetable by-member/room-wiring plan — code-verified corrections to the story's own assumptions, new getByMember repo primitive, ambiguous-child reuse decision
metadata:
  type: project
---

Plan written directly into `docs/stories/epics/E18-be-wiring/US-E18.26-timetable-by-member-room-wiring/story.md`
(§ "Phased Implementation Plan (fe-planner, 2026-08-01)"), not a separate plan.md
— matches precedent (US-E18.11/23/24 packets are single story.md files, no
sibling plan.md).

Key corrections found by reading current code (not just prior story prose):
1. Admin-builder `MockTimetableRepository` already round-trips `room` in
   memory correctly — the drop happens one layer up in
   `TimetableSlotMapper.toEntity`/`toRequest` (`timetable.mapper.ts`). The
   story text wrongly assumed the mock needed a fix.
2. Teacher-schedule N+1 simplification is confirmed correct/buildable:
   current `getByTeacher` does exactly the fan-out described; new by-member
   endpoint + kept `GET /classes` (repurposed as classId→className lookup,
   not a fan-out source) cuts it to 2 calls total regardless of class count.
3. `GetChildTimetableUseCase` needs a NEW repo method `getByMember(memberId,
   weekStart?)` — its current `getByClass(child.classId,...)` call can't
   work since the by-member endpoint is keyed by memberId not classId.
4. `TimetableErrorKey = TimetableViewFailure["type"] | "forbidden"` is
   consumed by an exhaustive `Record<TimetableErrorKey,...>` in BOTH
   `timetable-view.tsx` and `teacher-schedule.tsx` — adding a NEW failure
   type is NOT zero-diff (contradicts the packet's framing). Planner's call:
   map `TIMETABLE_CHILD_AMBIGUOUS` (defensively unreachable 422) to the
   EXISTING `network-error` type instead of inventing `ambiguous-child`.
5. Child-picker fallback (no precedent found in E18.20/23/member-directory
   despite the story's suggestion to check them) — recommended ONE concrete
   direction: `TimetableChild.name?` optional + new `ordinal: number` (1-based,
   assigned via STABLE sort by `linkId` ascending, never raw array position)
   drives "Con thứ N" fallback label + avatar shows ordinal digit instead of
   initials; `classId`/`className` optional → "Chưa có lớp" fallback when
   both omitted.
6. Flagged (not blocking) a naming/shape collision risk: `parent-links`
   feature's `LinkedStudentResponseDct` (US-E20.2, speculative/contract-first
   INT-001 shape with fullName/avatarUrl) is a DIFFERENT wire schema from
   this US's ground-truthed US-148 `linked-students` enrichment — do not
   reuse/conflate the two DTOs across features.

Component-architect: YES (narrow — only child-picker fallback contract).
State-engineer: NO (no new query key/cache shape — plain server-side await,
composition of 2 HTTP calls is repository-internal, not client-cache concern).
