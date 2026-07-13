---
name: project-us-e192-moderation-plan
description: US-E19.2 content-moderation plan — shared ReportContentDialog + high-risk Remove-content, key reuse/extension decisions
metadata:
  type: project
---

Plan written to `docs/stories/epics/E19-social/US-E19.2-content-moderation/plan.md`
(worktree `us-e19.2`, branch `feat/us-e19.2-content-moderation`).

Key structural decisions (useful for future high-risk / shared-dialog stories):
- `ReportContentDialog` (shared, `components/shared/`) is pure presentation; the
  actual `SubmitReportUseCase`/repo call lives in the OWNING story's feature module
  (`features/moderation/domain`) and is exposed via a DI factory
  (`makeSubmitReportUseCase`). Each CONSUMER route (e.g. US-E19.1 feed) writes its
  OWN thin `'use server'` action calling that shared factory — Server Actions can't
  cross route boundaries, but the use-case/repo/DI factory is the single shared impl.
  Pattern worth reusing whenever a shared dialog triggers a cross-feature-owned mutation.
- Destructive confirm flow reused `components/shared/destructive-confirm-dialog/`
  by EXTENDING it with new optional props (`errorSlot` with tone-gated retry) rather
  than forking a "ModConfirmRemove" — per component-organization.md, composed +
  already-shared → extend via prop.
- `src/features/audit-log/` (US-E12.12, generic compliance audit trail) is a strong
  STRUCTURAL precedent (RSC-seed + useInfiniteQuery + URL-synced filter + Server
  Action-as-queryFn) for any queue/filter screen, but is NOT the same bounded
  feature as a `social`-service "moderation audit log" — don't conflate/share code
  just because both are called "audit log".
- `src/features/staff-leave/` `toFailure(err)` (`errorCodeOf`/`statusOf`, never
  `.message`) is the canonical failure-mapping shape to cite whenever an AC demands
  "branch on error.code not error.message" — plan an explicit unit test with a
  mismatched code/message pair as the proof.
- Mock-first precedent: even a BE-marked-"REAL" service with no published
  `openapi.yaml` should get BOTH a real `*Repository` and a `Mock*Repository` from
  day one (staff-leave did this), DI-switched by `NEXT_PUBLIC_USE_MOCK` — don't wait
  for BE confirmation to structure the code, but DO recommend `USE_MOCK=true` as the
  working default when multiple `[OPEN QUESTION]`s affect the real wire contract.
