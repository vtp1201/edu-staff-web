# US-E11.1 — Implementation Plan (phased)

4-step student exam flow (List → Briefing → Taking → Results). Mock-first (lms
service not built; `USE_MOCK` toggle in the DI factory).

## Phase 1 — Domain (pure TS, TDD red→green)

- Entities: `exam.entity`, `exam-question.entity`, `exam-result.entity`.
- `exam.failure` union (not-found / max-attempts-exceeded / after-deadline /
  already-submitted / network-error / unknown).
- `i-exam.repository` (list / questions / submit / result) + `SubmitExamInput`.
- Use-cases: list, get-questions, submit (Result-shape with failure mapping),
  get-result.
- Pure helpers: `calculate-score` (`calculateScore`, `scoreColorClass`).
- Tests first: `submit-exam.use-case.test`, `calculate-score.test`.

## Phase 2 — Infrastructure (server-only)

- `exam-response.dto` (camelCase wire shape).
- `exam.mapper` (plain functions, DTO→entity, union narrowing).
- `exam.repository` (envelope-unwrapped cast idiom; endpoints from `EXAM_EP`).
- Mock: `exam.fixtures` + `MockExamRepository`.
- Tests: `exam.mapper.test`, `exam.mock.repository.test`.

## Phase 3 — Bootstrap

- `exam.endpoint` (`/lms/api/v1/exams…`), wired into endpoint barrel.
- `exam.di` per-request factories (`USE_MOCK ? Mock : Real`), wired into di barrel.

## Phase 4 — Presentation (`'use client'`)

- `exam-list` (+ skeleton) — RSC-props screen, stat cards, status filter, cards.
- `exam-briefing` — info chips + numbered rules + agree-gate CTA.
- `exam-taking` — full-screen 2-pane: question/options (left), navigator +
  progress + timer (right), submit modal. Local state only during taking.
- `exam-result` — score hero + stats + filtered question review.
- `exam-detail-screen` — client step machine briefing→taking→result; receives the
  server action as a prop (Next 16).

## Phase 5 — App + i18n + stories

- Routes: `/student/exams` (list), `/student/exams/[examId]` (detail machine).
- `actions.ts` (`submitExamAction` → stable `errorKey`).
- `exam` i18n namespace in vi.json + en.json (parity verified).
- Storybook stories for all four screens (loading/empty/error/success states).

## Proof

`bunx tsc --noEmit`, `bun vitest run`, `bun lint`, `bun run build` — all green.
