# US-E11.9 Teacher Question Bank

## Status

planned

## Lane

normal

(hard-gate check: no auth/RBAC change beyond existing pattern — search is
staff-only (TEACHER/MANAGER/ADMIN) per BE `canBrowseBank`, a read-scoping
consistent with existing school-scoped content patterns, not a weakening; no
token/session change; no tenant isolation change; no data-loss risk — no
delete endpoint modeled; no PII; no validation weakening; no new
design-system token.)

## Dependencies

- Depends on: none (BE contract already exists and is stable — ground-truthed
  US-E18.16; design already delivered — DR-021).
- Blocks: none known.
- Feature module(s) chạm: `src/features/question-bank` (net-new).
- Shared contract/file: `src/bootstrap/endpoint/lms.endpoint.ts` (new
  `QUESTION_BANK_EP` group, additive — do NOT confuse with existing
  `LMS_EP.questions`, the unrelated per-lesson Q&A thread), `docs/TEST_MATRIX.md`.

## Origin

`docs/design-requests/DR-021-lesson-plan-question-bank.md` (delivered
2026-07-17) — net-new design for a BE contract ground-truthed in
`docs/stories/epics/E18-be-wiring/US-E18.16-lesson-question-bank-wiring/story.md`
(finding #27). This BA pass turns the design into an engineering-ready spec.

## Product Contract

See `requirements.md`, `integration.md`, `use-cases.md` — consolidated in
`spec.md` (the document `fe-lead` builds from).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `screens.questionBank` (normative layout).
- `docs/product/screens.md` (Question Bank + Builder row).
- `docs/product/roles-permissions.md` (teacher role; staff-only search).
- `.claude/rules/api-integration.md` (envelope, camelCase, service map `core`).
- `design_src/edu/question-bank.jsx` (reference mockup).

## Acceptance Criteria

See `use-cases.md` / `spec.md` traceability matrix. Must cover the mandatory
subjectId/tag search-filter gate (422 `QUESTION_SEARCH_FILTER_REQUIRED`) as a
first-class AC, not a generic error case.

## Design Notes

See `spec.md`.

## Validation

To be filled by `/fe` when implemented. Add a `docs/TEST_MATRIX.md` row now at
`planned` (all proof flags `0`/`no`) per `.claude/rules/tdd.md`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain use-cases (create/update/publish DRAFT question, list mine, search PUBLISHED with mandatory-filter validation), mapper, failure mapping |
| Integration | repository ↔ HTTP boundary against `LMS_EP.questions` (new group) real contract (mock-first dev default) |
| E2E | Storybook interaction + Playwright: search-without-filter (blocked)→search-with-filter→create→publish flow, all states |
| Platform | `bun build` green |

## Harness Delta

- Story registered via `harness-cli story add --id US-E11.9 --lane normal`.
- `docs/TEST_MATRIX.md` row added (`planned`).
- Shared ADR `0057` (publish terminology) covers this story too.

## Evidence

BA analysis artifacts: `requirements.md`, `integration.md`, `use-cases.md`,
`spec.md` in this packet.
