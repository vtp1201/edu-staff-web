---
name: project-design-1406-rebaseline
description: Design handoff re-baseline 2026-06-14 — real delta is original 29/04 vs 1406, not 1206 vs 1406; design-spec.jsonc is stale for 4 screens; 4 new stories created
metadata:
  type: project
---

Design handoff 1406 (current in design_src/edu/) is identical to 1206 byte-for-byte.
The REAL delta is original 29/04 handoff vs 1406 (the version design-spec.jsonc was
authored from). ADR 0034 Accepted 2026-06-14.

**Why:** Earlier BA analysis compared 1206 vs 1406 (identical) and concluded "no changes."
Correct comparison is 29/04 (design-spec.jsonc source) vs 1406 (current design_src).

**Changed files (29/04 → 1406):**
- teacher.jsx: 501 → 1102 lines. Added TeacherDashboardHome (5 StatCards incl. ADMIN_APPROVAL mode, TKB by period 1–10) + PrincipalTeachersScreen + TeacherAssignmentSheet (GVCN/GVBM assignment, conflict detection).
- login.jsx: 321 → 328 lines. Added SSO VNeID + Google buttons, ROLE_META (6 roles: admin=ADMIN/principal, manager=MANAGER/principal, staff=STAFF/teacher, teacher, student, parent) + multi-role/multi-tenant select step.
- profile.jsx: 497 → 574 lines. Added Account Requests sidebar card + Linked Accounts section (VNeID/Google link/unlink under Security tab).
- app.jsx: 233 → 292 lines. Additional routes wired (attendance, classlog, discipline, calendar, etc.) — already captured in screens.md.

**design-spec.jsonc is STALE for:** login, teacher-dashboard-home, principal-teachers, profile-linked-accounts. Must regenerate per-screen before FE implements.

**New stories created 2026-06-14:**
- US-E01.2: Login SSO (VNeID + Google) + multi-role/multi-tenant select (E01-auth-rbac)
- US-E13.4: Teacher Dashboard Home (E13-teacher-workspace)
- US-E13.5: Principal Teachers Management GVCN/GVBM (E13-teacher-workspace)
- US-E08.5: Profile Linked Accounts + Account Requests (E08-app-shell)

**How to apply:** When asked about login, teacher dashboard, principal teachers, or profile screens — always reference the 1406 design_src files, not the stale design-spec.jsonc. Always regenerate the relevant design-spec.jsonc section as part of the story packet before handing to FE.
