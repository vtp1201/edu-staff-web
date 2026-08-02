/**
 * `ReportInboxItem` — the wire row, ground-truthed against
 * `edu-api/services/social/docs/openapi.yaml` (US-E18.32).
 *
 * Used by BOTH `GET /reports` (array) and `GET /reports/{reportId}` (single):
 * the service returns the same schema from both, "so the list and detail
 * responses can never drift".
 *
 * NOTE what is deliberately NOT here: no `reporterUserId` (NFR-098-01, a
 * permanent privacy posture enforced at DTO shape), no denormalized content
 * preview, no content author, no duplicate-report count. The previous web DTO
 * declared all four; they were invented before the contract was published.
 */
export interface ReportInboxItemDto {
  reportId: string;
  targetType: "MESSAGE" | "POST" | "COMMENT";
  targetId: string;
  reasonCategory:
    | "HARASSMENT"
    | "INAPPROPRIATE_CONTENT"
    | "SPAM"
    | "MISINFORMATION"
    | "OTHER";
  reasonFreeText?: string | null;
  /** Part of the primary key — echo back on every point-read / CAS write. */
  filedAt: string;
  status: "PENDING" | "RESOLVED";
  /** Present only on a RESOLVED row. */
  resolvedAt?: string | null;
  resolvedByUserId?: string | null;
  resolutionOutcome?: "DISMISS" | "DELETE" | "ESCALATE" | null;
}

/** `POST /reports` body (US-098 + US-166's COMMENT target). */
export interface SubmitReportRequestDto {
  targetType: ReportInboxItemDto["targetType"];
  targetId: string;
  reasonCategory: ReportInboxItemDto["reasonCategory"];
  /** Required (non-empty, ≤500) iff reasonCategory = OTHER; omitted otherwise. */
  reasonFreeText?: string;
}

/** `POST /reports/{reportId}/resolve` body — `filedAt` is the CAS key. */
export interface ResolveReportRequestDto {
  action: "DISMISS" | "DELETE" | "ESCALATE";
  filedAt: string;
}
