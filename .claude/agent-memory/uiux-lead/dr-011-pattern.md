---
name: dr-011-pattern
description: DR-011 cross-cutting interaction patterns — 1 DR for 6 P2+P3 UX issues; no JSX file needed; design-spec + copy keys only
metadata:
  type: project
---

DR-011 "UX Polish: Confirmations, Navigation, Loading & Feedback" (2026-06-21).

**Pattern:** 6 cross-cutting interaction issues (UX-02/04/05/06/07/08) → 1 DR. No new JSX mockup file needed — only `docs/product/design-spec.jsonc#interactionPatterns` + copy keys.

**Key lessons:**
- Already-implemented components found as feature-local copies in multiple features → spec a `components/shared/` canonical home in design-spec; FE consolidates at build time (don't force into shared/ in design, just document the canonical home)
- UX writer used `adminSchoolSetup.stepper.*` (correct namespace); design-spec initially had `adminSetup.stepper.*` — fixed before merge
- Common.confirmDialog + Common.skeleton sub-namespaces added under existing `Common` namespace (line ~7 in vi.json)
- 21 new i18n keys total; 1 reuse confirmed (`announcements.btnSendNow` as confirm CTA)

**Why:** Same precedent as DR-010 (responsive + empty states as one cross-cutting DR). All 6 issues are interaction patterns, not distinct screens.

**How to apply:** When multiple P2+P3 cross-cutting patterns arrive together, 1 DR is appropriate if they all resolve to design-spec entries + copy keys without needing separate JSX files.

**Files changed:**
- `docs/design-requests/DR-011-ux-polish-interactions.md` (new)
- `docs/product/design-spec.jsonc` → `interactionPatterns` section (263 lines)
- `src/bootstrap/i18n/messages/vi.json` + `en.json` (31 lines each)
