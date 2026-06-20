---
name: project-edustaff5-delta
description: edustaff_5 design sync delta analysis 2026-06-19 — 7 files, 3 new stories (US-E08.6/E11.5/E11.6), commit 79fe0b9
metadata:
  type: project
---

edustaff_5 design sync (commit 44c62bb on main) analyzed 2026-06-19. 7 files diff'd:

**Cosmetic/no-US:**
- `icons.jsx`: purely additive SVG path entries — no screen behavior change
- `ui.jsx`: StatCard `iconBg` prop (backward-compatible, 9 lines) — no US

**Already covered by existing implemented stories:**
- `announcements.jsx`: tagged US-E10.3 in header; US-E10.3 is implemented (status=implemented, 15/15 AC, commit in TEST_MATRIX)
- `teacher.jsx`: TeacherDashboardHome=US-E13.4(impl); TeacherAssignmentSheet=US-E13.5(impl); TeacherGrades view=US-E13.6(impl); enhanced grade entry columns=US-E14.2(impl, grade-entry.jsx is normative 1506 reference)

**Real deltas — new story packets created:**
- `exam.jsx`: `submitted_pending_essay` status (4th exam state: MCQ auto-graded + essay pending teacher) NOT in US-E11.1 AC → **US-E11.5** (normal lane, extends `src/features/exam/`, mock-first lms)
- `student.jsx`: `LessonPlayer` (chapter nav + video/pdf/text content types + Notes/Q&A tabs) NOT covered → **US-E11.6** (normal lane, new `src/features/lms/`, mock-first lms); `StudentCourses` filter tabs also new
- `app.jsx`: SSE disconnect banner (sseStatus: connecting/connected/disconnected, 4s auto-reconnect, manual reconnect CTA) + pending-message pill (floating, outside /messages, navigates to /messages) → **US-E08.6** (normal lane, `src/components/shared/sse-status/`, extends useRealtimeEvents hook from US-E06.2)

**Boundary confirmed:** US-E11.3 (exam-bank, FE in-flight) NOT touched. exam.jsx is student-facing exam TAKING flow; E11.3 is teacher/admin exam CREATION tool — completely separate.

**No ADRs needed:** No new architectural decisions. SSE disconnect follows ADR 0041 pattern; mixed exam/lesson player follow existing mock-first lms pattern (decision 0014).

**Commit:** 79fe0b9 on main (docs(ba): edustaff_5 delta analysis — add US-E08.6, US-E11.5, US-E11.6)

**Why:** edustaff_5 was a design sync that added substantial new screens/behaviors beyond the 1506 baseline (ADR 0038). Analysis needed to distinguish cosmetic changes from real AC deltas requiring FE implementation.

**How to apply:** For future design syncs, cross-check each file against TEST_MATRIX implemented/planned entries + existing story packet ACs — don't assume a file = a new story; many will be covered by prior analysis.
