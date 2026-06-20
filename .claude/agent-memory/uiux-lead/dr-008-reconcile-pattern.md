---
name: dr-008-reconcile-pattern
description: Group-chat (DR-008) — labeled net-new but messaging.jsx was fully built; design-spec groupChat + group i18n keys were only gaps; 7th consecutive reconcile in the DR-001 to DR-008 batch
metadata:
  type: project
---

DR-008 Group Chat extension (US-E10.4 group lifecycle + message interactions):

**Fact:** Despite being labeled "genuinely net-new" in the handoff prompt, `design_src/edu/messaging.jsx` was ALREADY FULLY BUILT at 1953 lines. It contained ALL group-chat flows: CreateGroupModal (2-step), GroupInfoPanel (320px slide-in), MessageContextMenu (reply/pin/copy/delete), ReplyStrip, quote bubbles, per-role seeding, and all states (empty/loading/offline).

**Why this matters:** The prompt said "THIS ONE IS DIFFERENT — GENUINELY NET-NEW" but the reconcile check revealed the JSX was already there. The truly new artifacts were:
1. `docs/product/design-spec.jsonc` — `messaging.groupChat` sub-section (was missing)
2. `src/bootstrap/i18n/messages/{vi,en}.json` — 5 new sub-namespaces under `messaging`: `group`, `groupInfo`, `contextMenu`, `reply`, `deleteDialog` (~35 new keys total)

**US clarification:** DR-008 header said US-E10.1 (base messaging, already implemented). The group-chat enhancement maps to US-E10.4 (`planned`). Handoff correctly feeds US-E10.4 → /ba → /fe. Do NOT mark US-E10.4 implemented — design-only.

**7th confirmation of reconcile pattern:** DR-002 through DR-008 all followed the same pattern: JSX already built in design_src, only gap was design-spec.jsonc entry (and for DR-008, also new group i18n keys).

**How to apply:** For future DRs that claim to be "net-new," ALWAYS grep design_src/edu/<slug>.jsx first. If the file exists AND has the feature content → reconcile path, not full pipeline. Save full pipeline for screens with no design_src file at all.
