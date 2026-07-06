export type AcademicRecordsFailure =
  | { type: "not-found" }
  | { type: "forbidden" }
  | { type: "network-error" }
  | { type: "unknown" }
  // US-E14.6 seal / unseal gate failures
  | { type: "not-all-locked" } // seal blocked — some grade batches still unlocked
  | { type: "already-sealed" } // seal idempotency
  | { type: "not-sealed" } // unseal-initiate on a non-sealed record
  | { type: "reason-too-short" } // unseal reason < 20 chars (AC-7)
  | { type: "no-pending-request" } // unseal-confirm target missing
  | { type: "same-admin-as-initiator" } // AC-8 two-admin gate
  | { type: "self-approve-not-allowed" }; // ADR-0037 — self-approve only when tenant has exactly 1 admin
