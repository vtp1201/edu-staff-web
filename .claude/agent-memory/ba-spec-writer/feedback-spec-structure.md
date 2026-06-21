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
