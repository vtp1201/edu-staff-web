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

## High-risk auth/public-link stories (confirmed US-E21.2, invite-accept)
For any unauthenticated public route that creates an account or mutates auth state (first
seen: tenant-invitation accept flow), always add explicit NFRs/FRs for: (1) no client-supplied
role/tenantId in the mutating request (privilege-escalation guard — state the exact request
payload shape in the FR so reviewers can diff it), (2) token/secret never persisted client-side
(no localStorage, no logging), (3) server response is sole source of truth — no optimistic
success before response, (4) explicit "what happens on account-mismatch/session-conflict"
FR even if the exact BE behavior is unknown — write it as an open question rather than
guessing, since guessing wrong here is a security bug, not a UX nit. Always recommend an ADR
to ba-lead when this is the FIRST occurrence of a new auth pattern in the repo (e.g. first
account-creation-via-public-link flow) — link to [[actor-role-patterns]] for the sensitive-gate
list this falls under.

## One-way DRAFT->PUBLISHED publish + no-delete (recurring authoring-bank pattern)
Confirmed on exam-bank, lesson-plan (US-E11.8), question-bank: when a BE contract models
`PUT /:id/publish` as one-way (no unpublish route) and has no delete endpoint, always write
these as explicit Won't-priority FRs (not just omissions) — "system SHALL NOT provide
delete/unpublish" — so spec.md's traceability matrix records the absence as a deliberate
scope decision, not a gap FE might "helpfully" fill in. Pair with a Must FR that the
PUBLISHED state renders fully read-only/locked (mirrors the pattern once one screen
establishes it — reuse the same locked-banner/disabled-fields FR wording across screens
for consistency). Also always add a single-GET visibility-gating FR when the contract
distinguishes owner-any-status vs non-owner-PUBLISHED-only — don't fold this into the list
FR, it's a distinct access-control behavior worth its own FR/AC.

## design-spec.jsonc vs ground-truthed BE contract conflict (confirmed, US-E11.9 question-bank)
When a design-spec.jsonc entry encodes a stricter UX rule (e.g. "expectedAnswer required" +
publish-disabled-until-filled) but the ground-truthed BE contract (verified directly from Go
source, e.g. `omitempty` validator tags with no per-type required rule) is looser, resolve the
FR in favor of the BE contract — a client that's stricter than the BE just blocks valid saves
for no reason. Write the FR to explicitly name the conflict and state which side wins and why,
then add an openQuestion flagging the design-spec correction to `ba-lead` (this is a data-contract
fix, not a redesign — no ADR needed, just correct the jsonc). Don't silently pick one side without
naming the conflict; the next reader needs to know design-spec.jsonc is currently wrong, not stale.
