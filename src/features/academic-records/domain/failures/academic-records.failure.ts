export type AcademicRecordsFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "network-error" }
  | { type: "unknown" }
  // US-E14.6 / US-E18.13 seal / unseal reactive failures
  | { type: "unlocked-grades-exist" } // 422 ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST — seal rejected server-side (replaces the old client-side `not-all-locked` pre-check)
  | { type: "too-many-reseals" } // 422 ACADEMIC_RECORD_TOO_MANY_RESEALS — reseal cap (5) reached
  | { type: "not-sealed" } // unseal-initiate on a non-sealed record (unrelated to seal — force-mocked surface)
  | { type: "reason-too-short" } // unseal reason < 20 chars (AC-7); ALSO the mapping for 422 UNSEAL_REASON_REQUIRED (same UX meaning, fe-lead resolution #3)
  | { type: "no-pending-request" } // 404 UNSEAL_REQUEST_NOT_FOUND — unseal-confirm target missing
  // US-E18.24 (BE US-150) — unseal listing + approve conflicts
  | { type: "unseal-request-already-approved" } // 409 UNSEAL_REQUEST_ALREADY_APPROVED
  | { type: "unseal-request-invalid-status" } // 400 UNSEAL_REQUEST_INVALID_STATUS (listing)
  | { type: "unseal-request-invalid-cursor" } // 400 UNSEAL_REQUEST_INVALID_CURSOR (listing)
  | { type: "same-admin-as-initiator" } // AC-8 two-admin gate
  | { type: "self-approve-not-allowed" }; // ADR-0037 — self-approve only when tenant has exactly 1 admin
