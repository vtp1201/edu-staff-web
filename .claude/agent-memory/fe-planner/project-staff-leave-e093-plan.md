---
name: project-staff-leave-e093-plan
description: Phase breakdown for US-E09.3 staff leave management; conflicts between AC-4/5/9 (dialog) and design (inline textarea); open questions on avatar tone tokens, errorLight token, CalendarClock icon
metadata:
  type: project
---

US-E09.3 Staff Leave Management plan written into story packet at `docs/stories/epics/E09-discipline-conduct/US-E09.3-staff-leave-management/story.md` (after state-engineer + component-architect sections).

**Why:** 5-phase breakdown for `fe-nextjs-engineer`; grounded in staffing.di.ts pattern and auth use-case test pattern.

Phases:
1. Domain (TDD red-green on 3 use-cases)
2. Infra (mock repo + real stub + DTO/mapper + endpoint constants)
3. Bootstrap (DI + i18n both locale files — tsc validates)
4. Presentation + Storybook (7 stories incl. ApproveFlow + RejectFlow interaction)
5. Route + nav (RSC page + actions.ts + nav-config.ts CalendarClock entry)

Key conflicts to flag to fe-lead:
- AC-4 "confirm dialog" for approve vs design's direct button → plan follows design (no dialog)
- AC-5 + AC-9 "dialog" + "trap focus" for reject vs design's inline textarea → plan follows design (autoFocus + Escape key)

Open questions logged:
- Avatar tone: seed data has raw hex `staff.color`; entity drops it; plan maps `staff.role` → token class only. Per-person color variation needs entity field + ADR.
- `T.errorLight` (rejection editor background): verify token exists in `src/app/tokens.css` before use; if absent → ADR required.
- `CalendarClock` vs `CalendarX`: nav uses CalendarClock, page header uses CalendarX — verify both in installed lucide-react.

Reject validation: 10 chars (AC-5 authoritative; design prototype shows 5 — ignored).
No TanStack Query — RSC props + useState + Server Actions (same as staffing/class-log).
AvatarInitials component: feature-local initially; promote to components/shared/ on 2nd use (decision 0026).

**How to apply:** When planning subsequent E09 or other admin features with leave/approval patterns, reference this breakdown. Inline reject (no modal) is the established pattern for this feature. Date normalisation (DD/MM/YYYY → ISO YYYY-MM-DD at mapper layer) is required for correct lexicographic filter comparison.
