# 0048 ExamResult nullable score and passed for submitted_pending_essay status

Date: 2026-06-21

## Status

Proposed

## Context

US-E11.5 introduces the `submitted_pending_essay` exam status — a mixed MCQ + essay exam where
MCQ answers are auto-graded immediately at submit time, but essay answers require manual teacher
grading. In this intermediate state there is no final total score and no pass/fail outcome yet.

The existing `ExamResult` entity (from US-E11.1) declares `score: number` and `passed: boolean`
as non-nullable, because a `completed` result always has both. Extending to support
`submitted_pending_essay` without changing this typing would require either:

- a sentinel value (e.g. `score: -1`, `passed: false`) that misrepresents the real state, or
- a parallel result type, adding duplication.

The `lms` service is not yet shipped (mock-first, decision 0014), so no wire-format commitment
exists yet. This is the right moment to decide the typing before the entity is cast in concrete.

## Decision

Relax `score` and `passed` in `ExamResultEntity` to nullable:

```ts
score:  number | null   // null = final score not yet available (pending essay grading)
passed: boolean | null  // null = pass/fail not determinable until score is final
```

A helper `isResultFinal(result: ExamResultEntity): boolean` returns `result.status === 'completed'`
and is the canonical guard in presentation before rendering pass/fail or the total score.

All existing E11.1 presentation code that reads `score` or `passed` must be updated to guard
behind `isResultFinal()` — this is a shallow, mechanical change (the `completed` result path is
unchanged; the new `submitted_pending_essay` path simply doesn't reach the pass/fail branch).

## Alternatives Considered

1. **Sentinel values** (`score: 0`, `passed: false` for pending) — misleading to the student;
   the result card would flash "FAILED" momentarily before the banner corrects it.
2. **Separate `PendingEssayResult` entity** — avoids nullability but splits the mapper and
   result use-case into two branches with a discriminated union; more total code.
3. **Keep non-nullable, add `partialScore` field only** — leaves `score` as the MCQ partial
   score (6.0) and re-interprets its meaning depending on status; semantically ambiguous.

## Consequences

Positive:

- The type correctly models the domain: a null score IS the real state for pending essay exams.
- `isResultFinal()` gives presentation a single, explicit guard rather than comparing status strings everywhere.
- No sentinel values that could mislead downstream analytics or the grade-book.

Tradeoffs:

- All E11.1 components reading `result.score` or `result.passed` must be touched. This is a
  regression risk; the `fe-tech-lead-reviewer` must verify all existing usages are guarded.
- TypeScript will enforce the null check at compile time — previously passing builds may fail
  after the type change until all sites are updated.

## Follow-Up

- `fe-nextjs-engineer` updates `ExamResultEntity` + all E11.1 presentation call sites.
- `fe-tech-lead-reviewer` must explicitly verify E11.1 Storybook stories still pass (no regression).
- When `lms` ships, confirm the wire contract uses `null` (not `0` or omission) for
  pending-essay result fields; update mapper accordingly and close this ADR as Accepted.
