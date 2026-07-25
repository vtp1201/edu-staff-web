---
name: project-us-e095-staff-discipline-plan
description: US-E09.5 Staff Discipline plan — one-repo decision, shared pure-fn extraction, security phase as its own gate
metadata:
  type: project
---

US-E09.5 (`src/features/staff-discipline/`) plan written to the packet's
`plan.md`. Key decisions:

- **One `IStaffDisciplineRepository`** (10 methods, both sub-resources), not
  two repos + facade — follows `i-discipline.repository.ts`'s precedent (3
  sub-resources already in one interface). Recommendation only, flagged as
  overridable by `fe-component-architect` before Phase 1 use-case signatures
  lock in.
- Extracted two shared pure functions instead of duplicating logic across the
  4 reject use-cases / 2 approve use-cases: `deriveSelfApproved` and
  `isRejectionReasonLongEnough` (10-char client UX guard, distinct from
  server's non-empty guard) — both independently unit-testable without a repo
  mock.
- NFR-008/NFR-009 security enforcement got its own explicit TDD phase (Phase 8)
  with a checklist, not folded into general testing — mirrors US-E20.1's
  Unlink gate posture and the `fe-tech-lead-reviewer` requirement that
  UI-hidden-button tests alone don't satisfy a forbidden-role assertion.
- i18n: `staffDiscipline` namespace already authored (DR-022) — verified via
  direct read of `vi.json`; confirmed `staffDiscipline.rejectDialog.*` exists
  standalone (no `reason` key, only `reasonPlaceholder`/`reasonMinLength`) —
  spec.md §8 already flags this drift and resolves it (use as-authored, don't
  cross-reference `discipline.leave.rejectDialog`). Plan follows that
  resolution, doesn't re-litigate it.
- fe-component-architect + fe-state-engineer both recommended to run before
  fe-nextjs-engineer: 2 independent query-key families × filter-scoped keys ×
  8 mutation-invalidation edges × per-tab-independent-error-state requirement
  (AC-010.3) is non-trivial enough to warrant fe-state-engineer specifically.

Reference: [Discipline feature E09.1 base](project-discipline-e091-base.md),
[Staff leave US-E09.3 plan](project-staff-leave-e093-plan.md).
