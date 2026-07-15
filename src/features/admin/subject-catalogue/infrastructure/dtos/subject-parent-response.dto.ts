import type {
  ConceptType,
  ParentStatus,
} from "../../domain/entities/subject-parent.entity";

/**
 * Wire shape of `SubjectParentResponse` (core `openapi.yaml`, US-E18.3).
 * - id is `subjectParentId` on the wire (web entity flattens to `id`);
 * - concept is split into `conceptLabelSuggested` (enum, nullable) +
 *   `conceptLabelCustom` (free text, nullable); BE also computes
 *   `effectiveConceptLabel` (custom-else-suggested) which web does NOT consume
 *   (`ConceptBadge` recomputes locally) — kept here only for wire fidelity;
 * - `childCount`/`activeChildCount` are NOT on the wire — derived in the
 *   repository from a fan-out `GET /subjects` fetch (see repository).
 */
export interface SubjectParentResponseDto {
  subjectParentId: string;
  tenantId: string;
  name: string;
  conceptLabelSuggested: ConceptType;
  conceptLabelCustom: string | null;
  effectiveConceptLabel: string;
  status: ParentStatus;
  createdAt: string;
  updatedAt: string;
}

/** Wire body for `POST /subject-parents` (`CreateSubjectParentRequest`). */
export interface CreateSubjectParentRequestDto {
  name: string;
  conceptLabelSuggested?: "BO_MON" | "TO" | "KHOA";
  conceptLabelCustom?: string;
}

/**
 * Wire body for `PATCH /subject-parents/{id}` (`UpdateSubjectParentRequest`).
 * `name` is immutable after creation — only concept fields are updatable.
 */
export interface UpdateSubjectParentRequestDto {
  conceptLabelSuggested?: "BO_MON" | "TO" | "KHOA";
  conceptLabelCustom?: string;
}
