---
name: project-e13-teacher-workspace
description: E13 Teacher Workspace epic status — US-E13.4 TeacherDashboardHome implemented; upcoming US-E13.1/E13.2/E13.3/E13.5
metadata:
  type: project
---

## E13 Teacher Workspace Epic Status (2026-06-14)

### Implemented
- **US-E13.4**: TeacherDashboardHome — 5 StatCards (totalStudents real from `GET /core/api/v1/classes` + per-class roster sum; schedule/grades/notifs mock-first), today's schedule by Tiết 1–10, pending grades list with "Nhập điểm" Link, notifications list. 291/291 tests pass.

**Why:** Real BE for "Tổng học sinh" available via core service classes endpoint; ClassResponse has no studentCount field, so we fetch classes then do parallel per-class roster count with cursor pagination.

**Key implementation detail:** `TEACHER_EP = { classes: "/core/api/v1/classes", classStudents: (id) => "/core/api/v1/classes/{id}/students" }`. Real repo sums enrollment counts across paginated rosters. Mock repo returns seed data from teacher.jsx 1406.

### Implemented (cont.)
- **US-E13.5**: Principal Teachers Management — teacher-list table (GVCN badge, subject-assignment badges, status), TeacherAssignmentSheet (GVCN picker, GVBM rows with per-class subject availability, conflict indicator). 5 use-cases, 22 unit tests, 11 repo integration tests, 5 action tests, 7 Storybook stories, 379/379 pass; build green. WCAG A11Y-001–006 all fixed including StatusBadge primary tone (`text-edu-text-primary`), TableHead `scope="col"` global fix, conflict icon `role="img"`.

### Implemented (cont.)
- **US-E13.3**: Class Log Screen (Sổ Đầu Bài) — REAL core homeroom-entries API wired (not mock-first; BE US-044 shipped in core openapi.yaml). Teacher screen (list+stats+entry form, save draft/submit), Principal screen (review all, approve/reject with reason). Role boundary enforced server-side. 6 unit + 11 integration + 7 Storybook stories, 397/397 pass. Routes: /teacher/class-log, /principal/class-log. A11Y: text-edu-warning-foreground on bg-edu-success (approve button), text-edu-text-secondary replaces text-muted-foreground on informational text, autoFocus on back button for view transitions, bg-edu-primary-accessible for active filter chip.

### Implemented (cont.)
- **US-E13.7**: Grade Book Parent Child-Switcher (DR-002) — `ChildSwitcher` tablist above GradeBookTable for parent role with ≥2 children; `GetChildListUseCase` + `getChildList()` on `IGradeBookRepository`; mock-first (core `GET /core/api/v1/parent/children` unconfirmed OQ-001); `MockGradeBookRepository` childId-aware (c1=11A2, c2=8B1); `GRADES_EP.childList`; `GradeBookScreenVM` extended with optional `childrenList`/`activeChildId`; ARIA tablist/tab/tabpanel pattern with roving tabindex + ArrowLeft/Right/Enter/Space; `aria-disabled` (not native `disabled`) for loading state; `color-mix(in srgb, var(--edu-*) 8%, transparent)` for tint; 873/873 tests pass; TLR-002 follow-up: RSC page not yet wired to pass `childrenList` to VM.

### Implemented (cont.)
- **US-E13.2**: Attendance BE Wiring — packet assumed BE US-046 `planned`; ground-truthing found it's shipped. Real contract has NO period/subject axis at all (daily class-wide GVCN roll call, not per-subject-period) — replaced `ClassPeriod`/`period` entirely, not just remapped. 4-state status (`present/absent/late/excusedAbsent`, was 3-state) — `late`→existing `--edu-info` token, no new token. No display-name on wire (recurring epic gap) but NOT permanently blocked here: reused the established "duplicate the small fetch inline, don't cross-import another feature's repo" precedent (`real-weekly-timetable.repository.ts`) to resolve names via `GET /classes/:id/students` and homeroom class list via `GET /classes` — both self-contained in `attendance.repository.ts`, zero cross-feature import. History has no bulk endpoint → bounded (≤31d) client fan-out + day-summary aggregate (cross-repo ask #28). ADR `0058`. 343/2216 tests (was 338/2179). a11y FAIL→fixed (solid-bg contrast on new `late` toggle state 4.42:1, missing `aria-live` on new client-fetch history tab)→re-verified PASS. Merged 51432ca.

### Remaining (all planned)
- **US-E13.1**: Teacher Class View (shares classes API)

### A11y lessons from E13.4
- `text-muted-foreground` (#8898a9 = 2.95:1) fails WCAG for text ≤12px → use `text-edu-text-secondary` (#5a6a85 = 5.9:1)
- `bg-primary` (#5D87FF = 3.15:1) fails WCAG for small text buttons → use `bg-edu-primary-accessible` (#4468e0 = 4.88:1)
- "Nhập điểm" CTA: must be `<Link>` with `min-h-[44px]` + `aria-label` (not an optional callback)
- RSC wrappers must not import from `infrastructure/` layer — inline any pure util logic
