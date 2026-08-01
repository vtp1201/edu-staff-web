/**
 * US-E18.24 — wire shapes for the REAL unseal-workflow + seal-rollup surface
 * (`core` service, BE US-150). Field names ground-truthed verbatim against
 * `services/core/docs/openapi.yaml` (`SealStatusResponse`,
 * `UnsealRequestListItem`, `RequestUnsealRequest`, `RequestUnsealResponse`,
 * `ApproveUnsealResponse`). All wire fields are camelCase.
 */

/**
 * `GET /classes/{classId}/terms/{termId}/academic-records/seal-status`.
 * `status` is the CLASS+TERM ROLLUP enum — distinct from the per-record
 * `AcademicRecordResponse.status` (`PENDING|SEALED|UNSEALED`).
 * `lastSealedAt` is nullable and NOT in the schema's `required` list.
 */
export interface SealStatusResponseDto {
  totalStudents: number;
  sealedCount: number;
  unsealedCount: number;
  status: "PENDING" | "SEALED" | "PARTIAL";
  lastSealedAt?: string | null;
  resealCount: number;
}

/**
 * One row of `GET .../unseal-requests` (cursor-paginated, newest first).
 * NO display names on the wire — `studentMemberId`/`requestedBy` are raw UUIDs
 * resolved client-side via the IAM batch lookup (core deliberately does not
 * duplicate IAM names).
 */
export interface UnsealRequestListItemDto {
  requestId: string;
  classId: string;
  termId: string;
  studentMemberId: string;
  requestedBy: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

/** Request body of `POST .../unseal-requests` — exactly these two fields. */
export interface RequestUnsealRequestDto {
  studentMemberId: string;
  reason: string;
}

/** `201` response of `POST .../unseal-requests`. */
export interface RequestUnsealResponseDto {
  requestId: string;
  status: "PENDING";
  createdAt: string;
}

/**
 * `200` response of `POST /academic-records/unseal-requests/{id}/approve`.
 * `unsealedAt` is OPTIONAL in the schema's `required` list — modelled optional.
 */
export interface ApproveUnsealResponseDto {
  classId: string;
  termId: string;
  studentMemberId: string;
  status: "UNSEALED";
  selfApproved: boolean;
  unsealedAt?: string | null;
}
