/**
 * `LeaveRequestAttachmentResponse` — the wire shape of one piece of evidence on
 * a student leave request (core US-249, `services/core/docs/openapi.yaml`).
 *
 * Every field is REQUIRED on the wire, including `unavailable`: core returns it
 * always so a storage outage is distinguishable from "no files attached"
 * (DEBT-249-001). The DTO mirrors that — no optional fields, no invented ones.
 */
export interface LeaveRequestAttachmentResponseDto {
  attachmentId: string;
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "application/pdf";
  sizeBytes: number;
  /** Presigned GET URL, ~15 min. EMPTY string when `unavailable`. */
  url: string;
  /** Expiry of `url`; the zero time `0001-01-01T00:00:00Z` when `unavailable`. */
  expiresAt: string;
  uploadedAt: string;
  /** File exists but could not be signed on this read (storage 503). */
  unavailable: boolean;
}
