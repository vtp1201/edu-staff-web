---
name: fr-patterns
description: Confirmed functional requirement writing patterns for edu-staff-web — format, scope, domain/presentation split
metadata:
  type: feedback
---

# FR Writing Patterns

## The system SHALL rule
Every FR uses "The system SHALL" as the subject. Never use "The user SHALL" — the user is the trigger, the system is the actor that must fulfill the requirement.

## Trigger / precondition / postcondition / errorCondition split
- Trigger: what the user does (not what the system does)
- Preconditions: state that must be true before the FR fires
- Postconditions: what is true after the system fulfills the FR
- Error conditions: what the system SHALL do when the mutation/load fails

## Scope: extend vs re-spec
When a story is an EXTENSION of an existing feature module:
- Do NOT re-spec existing entities, use cases, or endpoints
- Only spec the delta: new fields, new use cases, new endpoints, new failure types
- Reference existing domain artifacts by name (e.g., "extend `MessagingFailure` union with…")

## Design-spec values in FRs
Include concrete token values from design-spec.jsonc when they are behaviorally load-bearing (e.g., sizes, border-radius, animation timing that affects a11y). Do NOT duplicate full visual style tables — those live in design-spec.jsonc. Reference them with "per the design-spec groupList token values."

## Optimistic UI
Always spec both the happy path (optimistic prepend) AND the rollback (on API failure). Both are functional requirements.

## Domain enforcement for gated actions
For every role-gated destructive or privileged action, include a corresponding FR that the use case SHALL return a failure type when called without the required privilege — not just "the UI does not render the button."

## Mock-first pattern
When the real service is unavailable (decision 0017), the FR scopes to mock behavior. Note: "endpoints are defined but mock-first — real wiring deferred." Use `[ASSUMPTION]` label.
