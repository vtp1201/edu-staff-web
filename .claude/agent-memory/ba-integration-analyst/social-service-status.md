---
name: social-service-status
description: social microservice is mock-first — not shipped; all messaging/group endpoints use MockMessagingRepository (decision 0017/0014)
metadata:
  type: project
---

The `social` microservice (chat/feed bounded context) had NO shipped `openapi.yaml`/`INTEGRATION.md` as of the messaging (E10) work — all messaging endpoints were mock-first per decision 0017/0014.

**UPDATE (2026-07-12, US-E19.1/E19.2 feed + moderation):** Per DR-012/DR-013, `social` US-097→100 (feed: posts/reactions/comments) and US-098 (reports/audit/moderate-delete) are now stated as **implemented** on the BE side — but still NO published `openapi.yaml` to cite directly; contract shape is inferred from the DR prose + design-spec field names only. Treat these as REAL-but-unconfirmed (flag `[OPEN QUESTION]` to verify exact field names/enums with BE before `fe-nextjs-engineer` implements). The ONE still-genuinely-mock-first item in this domain is **post pin/unpin** (BE US-101, status `in_progress` — no endpoint exists at all yet, not even an unconfirmed one).

**Why:** social service was planned-not-built during E10; it has since progressed feature-by-feature (US-097→100, US-098 shipped; US-101 still in progress) rather than being fully absent. Don't assume "social = always mock-first" going forward — check per-endpoint status against the latest DR/requirements doc.
**How to apply:** Before flagging a `/social/` (or `/feeds/`, `/reports/`, `/rooms/.../moderation-audit`) endpoint as mock-first, check the relevant DR/requirements.md for a specific "US-XXX implemented/in_progress" note — only flag mock-first for endpoints explicitly not-yet-built (like pin/unpin), not the whole service. Still no openapi.yaml exists for social as of this writing — always flag the contract-inference caveat as an open question regardless of implemented/in_progress status.
