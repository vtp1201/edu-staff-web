---
name: feedback-spec-structure
description: Section order and table/AC formats that produced a buildable spec for US-E13.7 (ChildSwitcher); fe-lead can implement without questions
metadata:
  type: feedback
---

The 18-section spec.md structure used for US-E13.7 was confirmed complete:

1. Header (status, lane, date, depends-on, design-spec key, sources)
2. Feature Intake (lane, risk, gates)
3. Scope & Objectives (purpose, in/out/definitions)
4. Actors & Roles (table with role-gated visibility column)
5. Technical Requirements (table: ID, priority, source, SHALL statement, AC refs, dependencies)
6. Non-Functional Requirements (table: ID, category, requirement, measurable target, QA verification method)
7. Integration Map (per INT-XXX: endpoint, mock-first flag, response shape in code block, error mapping table, TQ key)
8. Design Spec Values (tokens only, no raw hex; sub-tables per element; ARIA structure example)
9. Use Case Summary (table: UC ID, title, FR coverage, AC count)
10. Acceptance Criteria (all AC in Given/When/Then grouped by UC)
11. Edge-Case Matrix (14 scenarios minimum; table with scenario/state/expected)
12. Storybook Stories (required + recommended; table with UC/AC mapping)
13. Scope Boundary (in/out table)
14. Open Questions (table: ID, question, default/fallback, owner, blocking?)
15. Assumptions (table: ID, assumption, impact if wrong)
16. Constraints (table: constraint, source)
17. Traceability Matrix (requirement, source, UC, integration, AC, test layer, priority)
18. Validation Proof Table (mirrors story.md Validation: layer, expected proof, story/AC ref) + Handoff to FE

**Why:** This order maps directly to how fe-lead builds the work: scope → actors → FRs → NFRs → data → design tokens → use cases → ACs → edge cases → stories → boundary → risks → proof. No questions left unanswered.

**Key patterns that worked:**
- Group all 42+ AC blocks by UC (not by FR) — fe-lead reads them as test scenarios, not requirements.
- Flag `child.color+'14'` as an implementation detail for fe-lead (CSS var + hex string append is not valid CSS — fe-lead must resolve; spec does not prescribe how).
- OQ table with "blocking?" column lets fe-lead start without waiting for all answers.
- Traceability matrix maps FRs to test layer explicitly — this is what produces TEST_MATRIX rows.

**How to apply:** Use this section order for any normal-lane spec with ARIA tablist pattern, TanStack Query integration, or mock-first service.

---

## US-E17.7 addenda — polish/audit-first spec patterns (2026-06-21)

When the story is a polish upgrade of already-implemented components (no new BE, no new tokens, no new i18n keys):

- **§4 Functional Spec: use a per-file change table (# | Location | Current | Required)** — this is more useful to fe-lead than prose descriptions. The engineer can diff current code against the table row-by-row.
- **Pseudo-JSX resulting structure block:** include a pseudo-JSX block showing the target component shape. Label it "not implementation code" — fe-lead owns the exact impl but needs the shape to start.
- **Audit-first AC as its own criterion:** always include an "audit-first — no duplicate component" AC (e.g. AC-01.14). This prevents fe-lead from creating a parallel component.
- **Open questions resolved in spec header context:** when OQs are pre-resolved by the caller, embed resolution inline in §4 (next to the prop/callback they affect) rather than only in §9. Both places.
- **Storybook proof: name stories explicitly and list the assertions per story** — `getByRole('status')`, `aria-hidden`, color class, `clientHeight >= 44`. This maps 1:1 to TEST_MATRIX rows.
- **No Unit layer row when there is no domain logic** — the Validation table should say "Not applicable" rather than leaving it blank. Blank reads as "forgot to fill in".

---

## US-E17.4/E17.5/E17.6 addenda — cross-cutting UX polish spec patterns (2026-06-21)

When the story is a pure UI upgrade touching multiple file locations (cross-cutting empty state standardisation, no new tokens/i18n/BE):

- **Use a simplified §3 format:** one subsection per FR with file target + class names + i18n call. No Integration Map section needed.
- **AC numbering: AC-{FR}-{seq}**, e.g. AC-01.1 for FR-01's first AC. Group by FR, not by UC.
- **Storybook play() requirements in §11 Handoff:** list exact DOM assertions by name (`role="status"`, `aria-hidden="true"`, class presence/absence). This maps to TEST_MATRIX without ambiguity.
- **[CONFLICT] for design-spec typos:** flag in §9 with resolution inline (e.g. US-E17.5: `grades.gradeBook.emptyState` is a design-spec typo; actual namespace is `gradeBook`).
- **Body contrast fix is mandatory for notification stories:** `text-muted-foreground` / `text-edu-text-muted` at 13px = 3.08:1 FAILS WCAG 1.4.3. Spec must explicitly prohibit the failing class AND require `text-edu-text-secondary` (5.1:1). Include in AC as a "MUST NOT have class X" assertion.
- **Multi-location stories:** state machine AC per location (AC-05.X pattern) is cleaner than repeating loading/error/populated ACs inside each FR's AC block when there are 4+ locations.

## US-E11.5 addenda — additive delta spec patterns (2026-06-21)

When the story extends an already-implemented feature (delta, not net-new), apply these patterns:

- **Domain-changes-first ordering in §Handoff:** list domain entities first, then mapper/DTO, then fixtures, then UI. This is the only safe order because nullable relaxation cascades.
- **ADR cross-reference in domain section:** cite the ADR (e.g. ADR-0048) directly in the entity section and in the relevant ACs. Spec is self-contained only if the FE team can read the ADR link without digging.
- **Breaking-change flag as explicit [RISK] note:** `score`/`passed` nullable relaxation touches all E11.1 call sites — flag this prominently in §5 next to the entity change, not just in §14 OQs.
- **`submitted_pending_essay` is a SUCCESS state:** explicitly call out in §11 UI States that pending-essay is NOT empty/error. This distinction is non-obvious and directly prevents a common implementation mistake.
- **Mock fixtures must list safe defaults:** for every additive entity field, document the safe default (e.g. `hasEssayQuestions` absent → `false`) — prevents mapper crashes on E11.1 data.
- **i18n key table:** include a table of ALL new keys with vi + en values in §13. If any might already exist, add a note to check before adding. Saves one round-trip.
- **Storybook story per screen-state-group, not per AC:** group stories as List/Briefing/Taking/Result-Pending/Result-Completed and list AC coverage per story — this is what the QA gate checks, not individual AC stories.

## US-E22.1 addenda — verify "already staged" i18n claims, don't trust the handoff phrasing (2026-07-12)

When a DR/requirements doc says i18n keys are "already staged" / "confirmed no collision" for
an upstream-authored feature (uiux → ba chain), still grep `messages/vi.json` yourself before
writing the spec — "staged" can mean "drafted in the DR markdown" (a `docs/design-requests/DR-NNN-*.md`
code block), NOT "already merged into `src/bootstrap/i18n/messages/{vi,en}.json`". For US-E22.1,
DR-016 had a full copy block (banner+dialog `emailVerify` namespace + 4 additive
`profile.personal.*` keys) but none of it existed in the actual messages files yet — so the
spec's §10 Handoff had to explicitly instruct fe-nextjs-engineer to add ALL of it, not just
reference it as done. Also: integration.md/use-cases.md can surface a BE error code (here
`USER_TOO_MANY_ATTEMPTS`/429 lockout) that the upstream DR's copy block never anticipated —
flag the resulting missing i18n key as a `[GAP]` needing exactly one new key, not a redesign.
