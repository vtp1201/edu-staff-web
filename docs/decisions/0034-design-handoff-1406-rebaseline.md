# 0034 Design Handoff 1406 — Re-baseline; design-spec.jsonc Regeneration Needed

Date: 2026-06-14

## Status

Accepted

## Context

EduPortal has received four cumulative design handoffs since project start:

| File (~/Downloads) | Date | Role |
| --- | --- | --- |
| `design_handoff_eduportal` | 2026-04-29 | **Original baseline** |
| `design_handoff_eduportal_2` | 2026-05-09 | First update |
| `design_handoff_eduportal2_1206` | 2026-06-12 | Second update |
| `design_handoff_eduportal2_1406` | 2026-06-14 | **Current — identical to 1206** |

`design_src/edu/` in the repo was updated to match 1406 (verified: `diff -rq`
exit 0). However, `docs/product/design-spec.jsonc` still pins to the original
29/04 handoff (`// Source: design_handoff_eduportal` in its header).

A diff of the **original 29/04 baseline against 1406** (the version design-spec.jsonc
was authored from, versus what is in design_src today) reveals semantic changes:

| File | Lines (orig → 1406) | Semantic changes |
| --- | --- | --- |
| `teacher.jsx` | 501 → 1102 | `TeacherDashboardHome` added (StatCards incl. `Điểm chờ duyệt`/ADMIN_APPROVAL, schedule-by-period TKB); `PrincipalTeachersScreen` added (GVCN/GVBM assignment sheet, conflict detection); overall screen completely re-scoped |
| `login.jsx` | 321 → 328 | SSO VNeID + Google buttons added; `ROLE_META` expanded to all 6 roles (admin/manager/staff/teacher/student/parent) with `enum` + `appRole` mapping; multi-role / multi-tenant role-select step added |
| `profile.jsx` | 497 → 574 | "Yêu cầu tài khoản" (Account Requests) card added; "Liên kết tài khoản" (Linked Accounts — link/unlink VNeID + Google) section added under Security tab |
| `app.jsx` | 233 → 292 | Routes wired for attendance, classlog, discipline, calendar, school-setup, subject-parents, subjects, subject-detail, roster, timetable, messaging, student-view-exams/discipline, parent |
| `ui.jsx` | 350 → 367 | Minor component updates |
| `icons.jsx` | 51 → 64 | New icons added |
| `classops.jsx` | changed | Class operations screen updates |

The earlier BA analysis (pre-2026-06-14) compared 1206 vs 1406 (byte-identical)
and concluded "no screen changes." That conclusion was incorrect — the real delta
is 1406 vs the original 29/04 version, which design-spec.jsonc was derived from.

## Decision

1. **Re-baseline**: treat the diff from original 29/04 to 1406 as the canonical
   design delta. All prior analysis that used 1206 as baseline is superseded.

2. **design_src is authoritative**: `design_src/edu/*.jsx` in this repo now equals
   1406 and is the normative design reference. `design-spec.jsonc` is stale for
   the changed screens and must be regenerated for each affected screen before the
   FE team implements it.

3. **Regeneration order (priority-gated)**:
   - `login.jsx` → `design-spec.jsonc#login` — HIGH (blocks Login SSO + role-select US)
   - `teacher.jsx` (TeacherDashboardHome + PrincipalTeachersScreen) → `design-spec.jsonc#teacher-dashboard`, `#principal-teachers` — HIGH (blocks E13 re-scoped stories)
   - `profile.jsx` (Account Requests + Linked Accounts) → `design-spec.jsonc#profile-linked-accounts` — MEDIUM
   - `app.jsx` (route additions) → already captured in `screens.md` as `planned` entries — LOW (no screen-level spec needed for routing)
   Regeneration is done by BA team per-screen as part of story-packet creation.

4. **New stories created** to cover the delta:
   - `US-E01.2` — Login SSO (VNeID + Google) + multi-role/multi-tenant select (amends existing Login screen)
   - `US-E13.4` — Teacher Dashboard Home (new; replaces prior placeholder)
   - `US-E13.5` — Principal Teachers Management (GVCN/GVBM assignment sheet)
   - `US-E08.5` — Profile Linked Accounts (link/unlink VNeID + Google + Account Requests section)

5. **E13 epic overview updated** to reflect correct scope derived from teacher.jsx 1406.

6. **screens.md updated** to reflect design-source change and new/revised screen status.

## Alternatives Considered

1. Regenerate entire design-spec.jsonc in one pass — rejected; too large a blast
   radius; incremental per-screen is safer and unblocks FE earlier.

2. Keep design-spec.jsonc as-is and rely on design_src directly — acceptable for
   screens not yet started, but risky for screens mid-implementation (Login, Profile)
   which reference design-spec.jsonc values. Prefer keeping design-spec.jsonc
   authoritative per decisions 0011/0014.

## Consequences

Positive:

- FE team has accurate design source for all screens going forward.
- E13 stories will be built from the correct, complete 1406 teacher.jsx.
- Login and Profile updates are formally scoped as stories, not silent gaps.

Tradeoffs:

- Login screen (US-E01.1 done) and Profile screen (done) have design delta that
  must be addressed as incremental stories rather than retroactive fixes. The
  existing implementations are not wrong — they implemented the spec they had.
  New stories extend them.
- design-spec.jsonc regeneration per screen adds a BA step before each new screen
  implementation. This is the correct process — not a regression.

## Follow-Up

- BA team regenerates design-spec.jsonc entries for login, teacher-dashboard,
  principal-teachers, profile-linked-accounts as part of each story packet.
- screens.md design-source note updated: `design_src/edu/*.jsx` (1406 = current).
- `docs/product/design-spec.jsonc` header comment updated when each section is
  regenerated to note `// Source: design_handoff_eduportal2_1406`.
