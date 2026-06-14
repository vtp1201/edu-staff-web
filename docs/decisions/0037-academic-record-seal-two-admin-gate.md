# 0037 Academic Record Seal — Two-ADMIN Unseal Gate

Date: 2026-06-15

## Status

Accepted

## Context

US-E14.6 (Academic Record Seal) seals per-student hoc ba after all underlying
grade entries are LOCKED. Unsealing a sealed record after the fact is a high-risk
operation: it reopens an already-finalized transcript and creates an audit trail
entry (Nghi dinh 13/2023/ND-CP). The design (`design_src/edu/academic-records.jsx`)
specifies a two-ADMIN confirmation flow for unseal — a second ADMIN must co-sign
the unseal request before it executes.

When only one ADMIN exists in the tenant (common in small schools), the design
falls back to a logged self-approve with a prominent warning banner: "Khong co
Admin thu hai de xac nhan — hanh dong nay se duoc ghi lai va kiem tra." This
fallback must also be recorded in the audit log.

The FE team must not silently skip the second-ADMIN check. The BE (US-064) is
expected to enforce the same invariant server-side, but the UI is the first line
of defense.

## Decision

1. The Unseal action on the Academic Record Seal screen requires a two-step
   confirmation modal. Step 1: current ADMIN enters an unseal reason (required,
   min 10 chars). Step 2: if a second ADMIN is available (GET /admin/list returns
   count >= 2), show a co-signer picker — the request is held PENDING until the
   second ADMIN approves via their own session. If count === 1, show self-approve
   fallback with the warning banner.

2. Every unseal action (both confirmed and self-approved fallback) is written to
   the audit log (entity_type: "record", action: "UNSEAL") with actor ID, reason,
   and co-signer ID (null for fallback).

3. The UI reflects the UNSEALED state with a warning badge and unseal metadata
   (who unsealed, when, reason) visible to ADMIN users on the record row.

4. Sealing (bulk-seal for a class/term/year batch) requires allLocked === true
   for every student in the batch. If any student has a non-LOCKED grade entry
   the Seal button is disabled with a tooltip listing the unresolved students.

5. Implementation is mock-first (BE US-064 planned). The domain use-case
   `unsealRecord` must accept a `coSignerId: string | null` parameter and emit
   a UnsealResult that includes the fallback flag.

## Alternatives Considered

1. Single-ADMIN unseal with reason only (no co-signer). Rejected: insufficient
   data integrity control for a transcript that may be used externally (tuyen sinh,
   GDPR compliance).

2. Hard-block unseal when second ADMIN unavailable. Rejected: small school
   operations would be blocked entirely; fallback with prominent audit trail is
   a pragmatic middle ground aligned with the design spec.

## Consequences

Positive:
- Strong audit trail for any transcript modification post-seal.
- GDPR/Nghi dinh 13 compliance for personal-data mutation logging.
- Reduces accidental unseal (two steps + reason required).

Tradeoffs:
- Additional UI complexity (co-signer picker + pending state).
- BE US-064 must implement the co-signer confirmation endpoint; FE mock-first
  until then.
- Single-admin tenants see a fallback banner which may feel jarring; accepted
  as the correct risk communication.

## Follow-Up

- BE team to implement co-signer confirmation endpoint as part of US-064.
- FE team: domain use-case `unsealRecord` + `canUnseal` + `coSignUnseal` in
  `src/features/academic-records/domain/use-cases/`.
- TEST_MATRIX row US-E14.6 must include integration proof for the co-signer
  confirmation path and the single-admin fallback path.
