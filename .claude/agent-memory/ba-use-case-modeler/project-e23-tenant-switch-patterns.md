---
name: project-e23-tenant-switch-patterns
description: E23 multi-tenant switch UC patterns — zero-noise negative AC, server-side-enforcement dedicated UC, shared mint mechanism across two stories
metadata:
  type: project
---

E23 (multi-tenant switch, high-risk/authorization lane) spans two sibling
stories sharing one mint mechanism (`switchTenantAction` → `SwitchTenantUseCase`
→ `POST /members/switch-tenant` → `setAuthCookies`, httpOnly):
- US-E23.1 — header "Đổi trường" menu item + dialog (net-new presentation,
  reuses existing use-case/action).
- US-E23.2 — in-place enhancement of the EXISTING `(auth)/select-tenant`
  screen owned by `US-001-tenant-path-resolver` (E05, ba-lead-confirmed
  consolidation, NOT a new screen — read that packet's design.md for the
  unchanged routing/guard logic before writing AC).

**Patterns applied, worth reusing for future high-risk/authorization stories:**
1. **Zero-noise as a NEGATIVE AC.** "Hide X when condition" must assert
   *absence of the DOM node/route visit*, not "not covered by other tests."
   Wrote explicit AC-00X.Y "(NEGATIVE assertion)" labels so fe-qa-playwright
   knows to write an absence check, not skip coverage.
2. **Dedicated server-side-enforcement UC**, separate from the main happy-path
   UC, when a lane is authorization-hard-gate. Its AC assert: (a) no
   client-only state mutation before the server round-trip, (b) the ONLY path
   to a scope change is traceable to a new access-token claim set via
   server-side cookie mutation, (c) no token ever reaches client bundle, (d)
   BE rejection (403 race) cannot be bypassed by stale client state. This UC
   is referenced/mirrored across BOTH E23.1 and E23.2 since they share the
   identical mint mechanism — explicitly labeled "mirrors UC-006"/"mirrors
   AC-004.6" etc. in the sibling packet to keep the two stories' error-path
   language consistent without copy-pasting wholesale.
3. **403-race framing**: "membership revoked between list-fetch and select" is
   the canonical name for this race in both packets — reuse this phrase for
   any future switch-type flow with a similar list→select→mint race.
4. When one BA-lead-confirmed decision resolves an ambiguity from
   requirements.md (e.g. "RoleSwitcher is not redundant", "US-E23.2 enhances
   existing screen in place"), the use-cases.md should NOT re-litigate it —
   just cite the decision and move straight to modeling AC consistent with it.
5. Open questions carried from requirements/integration (BE schema gap,
   double-activation guard, cross-tab consistency) get restated once per
   packet in §6, not resolved — but cross-reference the sibling packet so
   ba-lead sees they were flagged consistently, not divergently.
