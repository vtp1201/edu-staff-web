---
name: pattern-injected-config-into-mock
description: Mock-first repo can take REAL config (from another feature's DI) via constructor injection
metadata:
  type: feedback
---

When a screen is mock-first for its OWN endpoints but depends on a REAL setting
owned by another feature, fetch the real value in the DI factory and inject it
into the mock repo constructor.

**Why:** US-E14.2 grades — grade endpoints mocked (BE not live), but
`gradePublishMode` (admin-settings, REAL) + assessment scheme (REAL) drive
behavior. `MockGradesRepository(publishMode)` lets publish set
PUBLISHED vs PENDING_APPROVAL correctly without mocking the real services.

**How to apply:** in `xxx.di.ts`, `await makeOtherRepository().getX()` (guard
with try/catch + safe default), then `new MockXxxRepository(realValue)` OR
`new XxxRepository(http, realValue)`. Both repo impls take the config the same
way so swapping USE_MOCK is transparent. See `bootstrap/di/grades.di.ts`.

Also: proportional score-color util (`score/maxScore >= 0.8 → success,
< 0.5 → error`) handles SCALE_10 and SCALE_4 with one rule — see
`features/grades/presentation/grade-entry-screen/score-color.ts`.
Tokens `text-edu-success-text` / `text-edu-error-text` exist (no ADR needed).
