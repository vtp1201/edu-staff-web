---
name: project-e21-invitation-flows
description: E21 tenant-invitations (US-E21.1 admin management + US-E21.2 public accept) UC/AC patterns, ADR 0051 security-AC pattern
metadata:
  type: project
---

E21 Tenant Invitations epic — two story packets:
`docs/stories/epics/E21-tenant-invitations/US-E21.1-admin-invitations/use-cases.md`
and `.../US-E21.2-invite-accept/use-cases.md` (written 2026-07-12).

**Role vocabulary** (resolved by ba-lead, no new ADR): invite role-select UI
labels `teacher|student|parent|manager|admin` map to the 5 real system roles
`teacher|student|parent|principal|admin` — `manager` is just a display alias
for `principal` (decision 0022 already added `admin` as the real 5th system
role). Reuse this mapping if E21 or role-select UI resurfaces elsewhere.

**High-risk security-AC pattern (ADR 0051, US-E21.2)**: when a story allows
client-authored payloads that could carry authorization fields (role/tenantId),
write a DEDICATED cross-cutting "SECURITY AC" section (not folded into the
happy-path AC) asserting the exact allowed key-set of the request body and
that it holds across ALL paths including retries — e.g. `AC-SEC-1` in
US-E21.2's use-cases.md. Call out explicitly that `fe-tech-lead-reviewer` must
verify this in code review, not just infer it from UI behavior. This is the
concrete deliverable `ba-lead` asked to confirm existed — worth defaulting to
this pattern whenever a public/account-creating endpoint is in scope.

**4th distinct state beyond expired/used/invalid**: when a token-based public
flow needs an "account already exists" conflict distinct from token-validity
errors, ba-lead may resolve it as a product/UX decision (not requiring BE
confirmation to write AC) even while the exact BE error code is still an
`[OPEN QUESTION]` — the UX shape (message + CTA) can be spec'd now, only the
wire-error-code mapping blocks `/fe` implementation. See US-E21.2 UC-104.

**Open-question style for unresolved BE behavior (e.g. email-mismatch,
OQ-2)**: write the AC so it holds regardless of which BE behavior direction
wins (e.g. "system SHALL NOT silently succeed/merge" holds under both hard-
reject and conditional-allow), then flag the precise trigger/copy as blocked
pending confirmation — avoids re-writing AC once BE confirms.
