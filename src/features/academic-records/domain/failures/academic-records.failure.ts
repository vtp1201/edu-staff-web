export type AcademicRecordsFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "network-error" }
  | { type: "unknown" }
  // US-E14.6 / US-E18.13 seal / unseal reactive failures
  | { type: "unlocked-grades-exist" } // 422 ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST — seal rejected server-side (replaces the old client-side `not-all-locked` pre-check)
  | { type: "too-many-reseals" } // 422 ACADEMIC_RECORD_TOO_MANY_RESEALS — reseal cap (5) reached
  | { type: "not-sealed" } // unseal-initiate on a non-sealed record (unrelated to seal — force-mocked surface)
  | { type: "reason-too-short" } // unseal reason < 20 chars (AC-7)
  | { type: "no-pending-request" } // unseal-confirm target missing
  | { type: "same-admin-as-initiator" } // AC-8 two-admin gate
  | { type: "self-approve-not-allowed" }; // ADR-0037 — self-approve only when tenant has exactly 1 admin
