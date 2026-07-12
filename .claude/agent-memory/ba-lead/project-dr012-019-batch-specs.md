---
name: project-dr012-019-batch-specs
description: DR-012..019 batch (8 DRs, 11 US) full BA pipeline outcome — role-model fix, lane escalations, ADR 0051, ID collisions resolved
metadata:
  type: project
---

Full BA pipeline (requirements → integration → use-cases → spec) ran for all
8 delivered DRs from the 2026-07-12 uiux batch, producing 11 story packets:
US-E19.1/.2 (social feed + moderation), US-E20.1/.2 (parent-student links +
consent), US-E21.1/.2 (tenant invitations + accept), US-E22.1 (email
verification, extends Profile), US-E10.6 (messaging presence, extends
Messaging), US-E23.1/.2 (multi-tenant switch), US-E03.1 (principal reports).
All committed to `main` via `docs/ba-dr-012-019-specs` (merge commit
`1adae77`, 2026-07-12).

**Why:** the design team delivered 8 DRs in one batch; each screen consumes
BE data and several touch existing implemented screens (Profile, Messaging,
the E05 select-tenant flow), so cross-cutting inconsistencies surfaced only
once all 7 requirements-analyst passes ran in parallel and were compared.

Key resolutions (durable, reusable for future stories in this product area):

1. **5-role model, not 4.** `docs/product/roles-permissions.md` was stale
   (only 4 roles documented) even though decision `0022` already added a real
   5th role `admin` (`nav-config.ts` `Role` union:
   `teacher|principal|student|parent|admin`). Patched the doc with the real
   route-group table. Any future BA pass that sees "admin" in a design-spec
   `roles` array should check `nav-config.ts`, not assume it's a typo.
2. **"manager" in invite-role vocabularies is a display alias for
   `principal`** ("BGH" = Ban Giám Hiệu), not a 6th role. Watch for this
   pattern recurring in other invite/role-select UIs.
3. **ID collision precedent**: a briefed US number can already be taken by an
   unrelated shipped story (US-E10.5 was "Messaging defect fixes", not
   "messaging presence" as briefed) — always grep
   `docs/stories/epics/<E>/US-<id>-*` before creating a new packet dir, even
   when the brief states the ID confidently.
4. **Cross-reference verification matters**: a requirements-analyst
   attributed an existing implemented screen to the wrong US (said "US-E01.2"
   when the real owner was `US-001-tenant-path-resolver`, E05). Always verify
   "already implemented" claims against `git log`/actual route ownership, not
   just an agent's inference.
5. **Lane escalations applied**: US-E20.1 normal→high-risk (Unlink strips a
   parent's data-visibility grant = Authorization hard gate). Confirmed this
   repo's own precedent (US-E14.6) is to keep the lightweight `story.md`
   template even for high-risk stories, not the full high-risk-story/ folder
   — don't over-apply the FEATURE_INTAKE template literally when local
   precedent is lighter.
6. **New ADR 0051** binds US-E21.2 (public invitation-accept, first
   unauthenticated-account-creation flow in this repo): no client-supplied
   role/tenantId ever, reuses decision-0018 token hybrid, password min-6
   baseline, 3+1 distinct error states (expired/used/invalid +
   email-already-exists).

**How to apply:** when picking up any of these 11 stories for `/fe`
implementation, read `spec.md` first (has the full traceability matrix +
Handoff section); several stories are `mock-first` (E19.1 pin/unpin, E20
core service, E23 tenant display fields, E03.1 fully) — check the
integration.md before assuming a real endpoint exists. E22.1 and parts of
E19/E21 are the buildable-now candidates (real BE contracts confirmed).
