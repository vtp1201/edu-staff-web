---
name: error-mapping-conventions
description: How UPPER_SNAKE API error codes map to failure union types and UI behavior in edu-staff-web
metadata:
  type: reference
---

## Pattern
ApiError.code (UPPER_SNAKE) → errorCodeOf(err) → MessagingFailure.type → i18n key under messaging.errors.*

## Key conventions
- Branch on error.code, NEVER on error.message
- retryable=true only for 408/429/502/503/504 — UI shows retry button
- 401 TOKEN_EXPIRED → http interceptor handles refresh; UI does not see it
- 403 FORBIDDEN / NOT_GROUP_ADMIN → UI shows inline "permission denied" message, no retry
- 404 NOT_FOUND variants → inline "not found" message
- 422 VALIDATION_ERROR → error.fields[] → per-field inline errors
- 409 CONFLICT (e.g. ALREADY_GROUP_MEMBER) → toast warning, no retry

## Failure union extension pattern (for US-E10.4)
New failure types added to MessagingFailure union:
create-group-failed | group-mutation-failed | pin-failed | delete-message-failed | not-group-admin | leave-group-failed
