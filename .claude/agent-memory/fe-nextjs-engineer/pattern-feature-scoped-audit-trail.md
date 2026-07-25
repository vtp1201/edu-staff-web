---
name: pattern-feature-scoped-audit-trail
description: Feature-scoped audit trail (US-E20.3) — second mock store + emission on success paths, and the mock-linkId-collision trap in deterministic tests
metadata:
  type: project
---

Adding an append-only audit trail to an existing mock-first feature
(`features/admin/parent-links`, ADR `0064` forbids extending the shared
`audit-log` feature's `AuditEntityType`).

**Why:** the whole reason the story existed was ownership — the trail must live
in the consuming feature, never in the shared audit feature. Grep gate
(`grep -r "audit-log" src/features/<f>/`) is an actual NFR, so don't even name
the path in a doc comment (say "the shared audit feature" instead).

**How to apply (shape that worked):**
- SECOND module-level store in the SAME mock repo file (`AUDIT_STORE:
  Record<linkId, Entry[]>`), deliberately NOT derived from the active-rows
  `STORE` → the trail survives a delete. Own `__reset*` + `__setMockAuditClock`
  test-only exports mirroring the existing `__resetMock*` convention.
- Write with **unshift only, never sort at read** → order is reverse-chronological
  by construction and the component must NOT re-sort (the design mockup DID sort;
  don't copy that).
- `recordAuditEntry(...)` goes immediately before each mutation's `return ok(...)`
  — strictly after every guard clause, so forbidden/validation/already-linked
  record nothing. Extend `AuthContext` with `actorId`/`actorName` (DI:
  `decodeSubClaim(token) ?? "mock-admin"` + a `MOCK_ACTOR_NAME` constant) so the
  actor is provably the acting session, testable with a forged authCtx.
- Extending a required field on `AuthContext` ripples into EVERY test fixture
  literal (4 spots) → rewrite them as `{ ...adminCtx, role: "teacher" }`.

**TRAP — the mock's `linkId` is `l-${Date.now()}-${STORE.length}`**: a
create→unlink→re-create inside one test can mint the SAME id (same ms, same
length after the removal), so "the re-create gets a new id" is a flaky
assumption. Prove the 3-event same-id ordering off the SEED (which is authored
newest-first) and keep the runtime test to a create→unlink pair with an injected
counter clock.

Storybook: `body.getByText(<person name>)` is ambiguous when a dialog overlays
the table row showing the same name → scope via
`within(document.querySelector('[data-slot="dialog-content"]'))`.

**Review-fix pass (both found AFTER my "done" — expect them next time):**
- **Conditional field → gate on the DISCRIMINANT, not just truthiness.** When an
  entity documents "field X populated ONLY for action === 'created'", the render
  must be `action === "created" && note && (...)`, never `note && (...)`. QA
  treats data-layer-only enforcement as a MAJOR gap even when unreachable — the
  repo's bar is "unsuppressable **by construction** at every layer". Regression
  proof = forge the impossible entity (`{action:"unlinked", note:"PROBE"}`) and
  assert both the probe text AND the label prefix are absent. Node-env
  `renderToStaticMarkup` (no jsdom, no i18n provider needed when the component
  takes a `labels` prop) — precedent `sd-self-approved-note.test.tsx`.
- **A small inline error banner is NOT a `ListError` preset.** `components/shared/
  list-error` presets are all big centred cards (`items-center text-center`,
  `px-5 py-10`); a compact left-aligned in-dialog banner (`items-start`, icon+text
  one line, `px-3 py-2.5`) is a different shape-family → extract a feature-local
  component (`pl-section-error-banner.tsx`, props `{message, retryLabel, onRetry}`,
  no `useTranslations` inside) rather than bloating `ListError`. The 2nd copy in the
  SAME directory already trips decision `0026` — extract on copy #2, don't wait.
  Sub-components in a screen folder get NO own `.stories.tsx` here (the single
  `<screen>.stories.tsx` covers them) — match that, don't add one.
- Sibling sub-sections must keep a11y parity: both region loading wrappers need
  `role="status"` (WCAG 4.1.3). Copying a sibling's structure but dropping its
  `role` reads as a regression to the auditor.

Related: [[pattern-high-risk-authctx-reauth]], [[pattern-mock-first-wiring]],
[[pattern-usecase-result]].
