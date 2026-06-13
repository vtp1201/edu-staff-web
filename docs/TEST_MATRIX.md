# Test Matrix

This file maps product behavior to proof.

No product behavior has been defined or implemented yet. Do not mark a row
implemented until tests or validation evidence exist.

## Status Values

| Status | Meaning |
| --- | --- |
| planned | Accepted as intended behavior, not implemented |
| in_progress | Actively being built |
| implemented | Implemented and proof exists |
| changed | Contract changed after earlier implementation |
| retired | No longer part of the product contract |

## Matrix

| Story | Contract | Unit | Integration | E2E | Platform | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | Add rows when story packets are created | no | no | no | no | planned | none |
| US-E12.1 | Admin role enabler: nav-config admin 7 items + DEFAULT_ROUTE + UserRole "admin" | yes | yes | no | yes | implemented | validate-grade-range.use-case.test.ts (13), get-setup-progress.use-case.test.ts (4), nav-config.test.ts admin block; mock repo; bun build clean |
| US-E12.1 | School Setup screen: grade range form (1≤min≤max≤13), narrowing warning, publish mode radio, onboarding progress, collapsible guide | yes | yes | no | yes | implemented | domain unit tests; mock repository integration; bun build + tsc clean; design-review pass |

## Evidence Rules

- Unit proof covers pure domain and application rules.
- Integration proof covers backend enforcement, data integrity, provider
  behavior, jobs, or service contracts.
- E2E proof covers user-visible browser flows.
- Platform proof covers only shell, deployment, mobile, desktop, or runtime
  behavior that cannot be proven in lower layers.
- A story can be implemented without every proof column if the story packet
  explains why.
