# US-E11.8 Teacher Lesson Plan Authoring

## Status

planned

## Lane

normal

(hard-gate check: no auth/RBAC change beyond existing teacher-role gating
pattern already used by exam-bank/lesson-bank, no token/session change, no
tenant isolation change beyond the standard tenant-scoped-list pattern, no
data-loss risk — no delete endpoint modeled, no PII beyond existing
teacher/subject identifiers already handled elsewhere, no validation
weakening, no new design-system token.)

## Dependencies

- Depends on: none (BE contract already exists and is stable — ground-truthed
  US-E18.16; design already delivered — DR-021).
- Blocks: none known.
- Feature module(s) chạm: `src/features/lesson-plan` (net-new).
- Shared contract/file: `src/bootstrap/endpoint/lms.endpoint.ts` (new
  `LESSON_PLAN_EP` group, additive), `docs/product/screens.md` (already has a
  placeholder row from DR-021), `docs/TEST_MATRIX.md` (new row).

## Origin

`docs/design-requests/DR-021-lesson-plan-question-bank.md` (delivered
2026-07-17) — net-new design for a BE contract ground-truthed in
`docs/stories/epics/E18-be-wiring/US-E18.16-lesson-question-bank-wiring/story.md`
(finding #27). This BA pass turns the design into an engineering-ready spec.

## Product Contract

See `requirements.md`, `integration.md`, `use-cases.md` — consolidated in
`spec.md` (the document `fe-lead` builds from).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `screens.lessonPlan` (normative layout).
- `docs/product/screens.md` (Lesson Plan Authoring + Builder row).
- `docs/product/roles-permissions.md` (teacher role).
- `.claude/rules/api-integration.md` (envelope, camelCase, service map `core`).
- `design_src/edu/lesson-plan.jsx` (reference mockup).

## Acceptance Criteria

See `use-cases.md` / `spec.md` traceability matrix.

## Design Notes

See `spec.md`.

## Validation

To be filled by `/fe` when implemented. Add a `docs/TEST_MATRIX.md` row now at
`planned` (all proof flags `0`/`no`) per `.claude/rules/tdd.md`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain use-cases (create/update/publish DRAFT lesson plan, list mine, browse by subject), mapper, failure mapping |
| Integration | repository ↔ HTTP boundary against `LMS_EP.lessonPlans` real contract (mock-first dev default per `NEXT_PUBLIC_USE_MOCK`) |
| E2E | Storybook interaction + Playwright: create→save draft→edit→publish→locked-view flow, loading/empty/error states |
| Platform | `bun build` green |

## Harness Delta

- Story registered via `harness-cli story add --id US-E11.8 --lane normal`.
- `docs/TEST_MATRIX.md` row added (`planned`).
- No ADR from this BA pass specific to E11.8 (shared ADR `0057` covers the
  publish-terminology decision for both E11.8/E11.9).

## Evidence

BA analysis artifacts: `requirements.md`, `integration.md`, `use-cases.md`,
`spec.md` in this packet.
