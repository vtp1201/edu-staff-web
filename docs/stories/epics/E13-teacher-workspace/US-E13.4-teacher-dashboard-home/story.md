# US-E13.4 Teacher Dashboard Home

## Status

implemented

## Evidence

Design review: pass
- design-system: conform (tokens-only — `bg-card`, `border-border`, `shadow-card`, `text-foreground`, `text-edu-text-secondary` for small text, `bg-edu-primary-accessible` for CTA; no raw color; StatCard + StatusBadge reused)
- a11y: WCAG AA OK (small text → `text-edu-text-secondary` #5a6a85 5.9:1; CTA → `bg-edu-primary-accessible` #4468e0 4.88:1; `min-h-[44px]` touch target; `aria-label` on CTAs; `aria-hidden` decorative; focus-visible outline; `<h1 class="sr-only">` page title; status not color-only)
- impeccable audit: manual pass — no spacing inconsistency, typography hierarchy clear, all states present
- states: loading (totalStudents=null→"—") / empty (scheduleItems.length===0) / error (RSC failure→null VM) / success OK; responsive `grid-cols-1 lg:grid-cols-[1.4fr_1fr]`; dark mode via semantic tokens

Commits: f8abde0 (implementation), a9d7a8e (a11y+CTA+pagination fixes)
Branch: feat/us-e13.4-teacher-dashboard-home → merged to main

## Lane

normal

## Dependencies

- Depends on: US-E13.1 (class view — class count stat wiring shares same API)
- Depends on (soft): US-E14.2 (grade entry — "Điểm chờ duyệt" stat becomes real data once grade entry exists; mock-first is acceptable before E14.2)
- Blocks: nothing — dashboard is entry point
- Feature module(s) chạm: `src/features/teacher/presentation/teacher-dashboard/`
- Note: Existing `TeacherScreen` with section=`dashboard` renders a placeholder. This US replaces it with `TeacherDashboardHome` from teacher.jsx 1406.

## Product Contract

### Context (design delta — ADR 0034)

teacher.jsx in 1406 handoff adds `TeacherDashboardHome` — a full dashboard home
for the teacher role. The prior mock dashboard (done as mock-first earlier) had
minimal content. The new design has:

1. **5 StatCards** (auto-fit grid, min 180px col):
   - "Tổng học sinh" — total across all assigned classes (from real BE)
   - "Tiết học hôm nay" — classes today per schedule (mock-first; schedule BE not yet built)
   - "Chờ chấm điểm" — pending grades count (mock-first; grade entry BE US-060 planned)
   - "Điểm chờ duyệt" — grades awaiting ADMIN_APPROVAL; only meaningful when school is in ADMIN_APPROVAL publish mode (mock-first; labeled "ADMIN_APPROVAL mode")
   - "Tin nhắn mới" — new messages count (mock-first; messaging E10 planned)

2. **Today's Schedule** (left panel, 1.4fr) — list of today's classes keyed by **Tiết number** (period 1–10, not clock time per US-045 note in source). Each row: period number, Morning/Afternoon indicator, subject name, class + room, status badge (Hoàn thành/Đang dạy/Sắp tới). Live lesson has 3px left accent.

3. **Pending Grades list** (right panel, 1fr) — top 3 pending items: student avatar + name, type (KT 15p / Bài tập / KT miệng), class. CTA "Nhập điểm" button → navigate to grades section. Header badge count 23 (mock).

4. **Notifications list** — top 3 recent notifications: icon + color, content text, relative timestamp.

### ADMIN_APPROVAL mode stat

"Điểm chờ duyệt" stat is only meaningful when school grade publish mode = ADMIN_APPROVAL (grade state machine: DRAFT → PUBLISHED → LOCKED per US-045/E14 design). For now this is mock-first, labeled with trendLabel "Chế độ ADMIN_APPROVAL". FE does not gate on the mode — always show the card; data will be 0/real depending on BE.

### BE readiness

Verified against `services/core/docs/openapi.yaml` @ origin/main (2026-06-14):

| Data | Endpoint | Readiness |
| --- | --- | --- |
| Total students across my classes | `GET /core/api/v1/classes` (sum `students` field per class record) | **REAL** (core live) |
| `gradePublishMode` (ADMIN_APPROVAL or SELF_PUBLISH) | `GET /core/api/v1/config/school/operational-settings` (`OperationalSettingsResponse.gradePublishMode`) | **REAL** — enum `[SELF_PUBLISH, ADMIN_APPROVAL]` confirmed in `SetOperationalSettingsRequest`. FE may read this to label the "Điểm chờ duyệt" stat contextually, but the stat value itself is still mock-first. |
| Classes today / schedule | Schedule BE | **mock-first** (not yet built) |
| Pending grades count ("Chờ chấm điểm") | Grade entry BE (branch `feat/us-060-grade-entry`, not merged to core main) | **mock-first** |
| Grades awaiting approval count ("Điểm chờ duyệt") | Grade approval endpoint (part of US-060, not yet in core openapi) | **mock-first** |
| New messages | Messaging (E10 / social service) | **mock-first** |
| Today's schedule rows | Schedule BE | **mock-first** |
| Pending grades items | Grade entry BE | **mock-first** |
| Notifications | Notification service | **mock-first** |

**Summary:** "Tổng học sinh" and optionally `gradePublishMode` wire to real BE. All other stats and list panels use mock-first DI pattern (decision `0014`).

**ADMIN_APPROVAL mode note:** `gradePublishMode` is a REAL field on `operational-settings`. FE may optionally read it to render a contextual label on the "Điểm chờ duyệt" card (e.g. "Chế độ ADMIN_APPROVAL"). The pending-approval *count* itself remains mock-first until US-060 ships. FE decision: wire `gradePublishMode` in same DI factory as school settings, or leave label hardcoded until US-060 readiness review.

## Relevant Product Docs

- `design_src/edu/teacher.jsx` — `TeacherDashboardHome` (lines 105–201), `SCHEDULE_DATA`, `PENDING_GRADES`, `NOTIF_DATA`, `TEACHER_CLASSES`
- `docs/product/screens.md` — Teacher Dashboard row
- `docs/product/design-spec.jsonc` — regenerate `#teacher-dashboard-home` from teacher.jsx 1406 (ADR 0034)
- `.claude/rules/design-system.md` — StatCard pattern, Badge, ProgressBar, schedule status colors (done=muted, live=success + left accent, upcoming=warning)

## Acceptance Criteria

### Stats grid
- AC-1: 5 StatCards render in auto-fit grid (5 cols desktop, reflows smaller).
- AC-2: "Tổng học sinh" stat value loads from `GET /core/api/v1/classes` (sum of `students` across assigned classes); loading skeleton while fetching.
- AC-3: Remaining 4 stats are mock values (configurable via mock DI); labeled and visually distinct.
- AC-4: "Điểm chờ duyệt" stat shows trendLabel indicating ADMIN_APPROVAL mode (informational, not an error).
- AC-5: Trend arrows: upward green, downward red, as per StatCard pattern.

### Today's Schedule
- AC-6: Schedule list keyed by Tiết number (1–10), shows "Buổi sáng" for tiết ≤5, "Buổi chiều" for tiết >5.
- AC-7: Live lesson row has 3px left green accent border.
- AC-8: Status badges: Hoàn thành (muted), Đang dạy (success), Sắp tới (warning).
- AC-9: Mock data (3 entries) on first ship; schedule section labeled "Lịch dạy hôm nay" with weekday badge.

### Pending Grades
- AC-10: Top 3 pending grade items: student avatar initials, student name, assessment type (vi/en), class.
- AC-11: "Nhập điểm" CTA on each row → navigates to teacher grades section.
- AC-12: Mock data; header badge shows count.

### Notifications
- AC-13: Top 3 notifications with icon box (colored bg), content text, relative timestamp.
- AC-14: Mock data.

### Common
- AC-15: Empty state when no classes assigned: full dashboard still renders; stat = 0; schedule = empty state text.
- AC-16: Loading skeletons on initial load (real BE call for student count).
- AC-17: WCAG 2.1 AA — all interactive elements keyboard reachable; "Nhập điểm" is a proper anchor/button with accessible label.
- AC-18: All strings in `messages/{vi,en}.json` namespace `teacherDashboard`.
- AC-19: Tokens-only styling — schedule status colors from design-system tokens, no raw hex.

## Design Notes

### Layout
`display: grid; grid-template-columns: 1.4fr 1fr; gap: 20` for schedule + right column. Stats above this grid in `repeat(auto-fit, minmax(180px, 1fr))`.

### Schedule row
`padding: 12px 24px`, `borderLeft` 3px solid (live=success, others transparent). Period label: 12.5px/800 + 10px muted indicator.

### Pending grades CTA
Link styled as button: `background: primary`, `color: #fff`, `borderRadius: 6`, `padding: 5px 11px`, 11px/700. `onNavigate('grades')` action prop.

### design-spec.jsonc
BA to regenerate `design-spec.jsonc#teacher-dashboard-home` section from teacher.jsx 1406 TeacherDashboardHome component before FE implements.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | GetTeacherDashboardStats use-case (real total-students from classes sum; mock for rest); mapScheduleStatus (done/live/upcoming → token color) |
| Integration | TeacherDashboardRepository (GET /core/api/v1/classes → student count sum; mock for schedule/grades/notifs) |
| E2E | Storybook: Loading / WithData / EmptySchedule / AllClassesHaveStudents |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: add US-E13.4 row (planned).
- `docs/product/screens.md`: Teacher Dashboard row → `🎨 design-ready` (has 1406 spec).
- `docs/product/design-spec.jsonc`: add `#teacher-dashboard-home` section regenerated from teacher.jsx 1406.
