import type {
  ConsentStatus,
  RelationshipType,
} from "../../domain/entities/parent-student-link.entity";

/**
 * Wire shape for one parent-student link (US-E20.1, INT-001/INT-002). camelCase,
 * nested person objects per the INT-001 contract; flattened to the domain entity
 * by the mapper. Mock-first (`core` not built) — swap-ready for the real service.
 */
export interface ParentStudentLinkResponseDto {
  linkId: string;
  student: {
    memberId: string;
    fullName: string;
    avatarUrl?: string | null;
    className: string;
  };
  parent: {
    memberId: string;
    fullName: string;
    avatarUrl?: string | null;
    phone: string;
  };
  relationship: RelationshipType;
  consentStatus: ConsentStatus;
  note?: string | null;
  linkedOn: string;
}

/** INT-001 list payload after envelope unwrap (pagination via `meta`). */
export interface ParentStudentLinksListResponseDto {
  items: ParentStudentLinkResponseDto[];
}
