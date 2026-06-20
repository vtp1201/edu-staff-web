---
name: social-service-status
description: social microservice is mock-first — not shipped; all messaging/group endpoints use MockMessagingRepository (decision 0017/0014)
metadata:
  type: project
---

The `social` microservice (chat/feed bounded context) does NOT exist in edu-api yet. All endpoints under `/social/api/v1/*` are mock-first per decision 0017 and 0014. The mock implementation lives in `src/features/messaging/infrastructure/repositories/mocks/messaging.mock.repository.ts`. The DI factory selects mock when `NEXT_PUBLIC_USE_MOCK` is set.

**Why:** social service is planned but not built; iam + noti are the only live services.
**How to apply:** Every new endpoint under /social/ must be flagged MOCK-FIRST. No real openapi.yaml exists for social — define the contract shape the mock must implement.
