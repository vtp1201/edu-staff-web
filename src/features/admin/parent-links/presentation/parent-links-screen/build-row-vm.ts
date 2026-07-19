import type {
  ConsentStatus,
  ParentStudentLink,
  RelationshipType,
} from "../../domain/entities/parent-student-link.entity";
import type { ParentLinkRowVM } from "./parent-links-screen.i-vm";

export interface RowVMLabels {
  relationshipLabelOf: (relationship: RelationshipType) => string;
  consentLabelOf: (status: ConsentStatus) => string;
  formatDate: (iso: string) => string;
}

/**
 * Pure flat-entity → row VM mapper (US-E20.1). Nests student/parent so
 * `PLTable` and `PLCardList` consume ONE identical shape (full data parity,
 * UC-007). All display labels are resolved here (once per fetch) so the leaf
 * table/card components never re-derive i18n or date formatting.
 */
export function buildRowVM(
  link: ParentStudentLink,
  labels: RowVMLabels,
): ParentLinkRowVM {
  return {
    linkId: link.linkId,
    student: {
      memberId: link.studentId,
      fullName: link.studentName,
      avatarUrl: link.studentAvatarUrl,
      className: link.studentClassName,
    },
    parent: {
      memberId: link.parentId,
      fullName: link.parentName,
      avatarUrl: link.parentAvatarUrl,
      phone: link.parentPhone,
    },
    relationship: link.relationship,
    relationshipLabel: labels.relationshipLabelOf(link.relationship),
    consentStatus: link.consentStatus,
    consentLabel: labels.consentLabelOf(link.consentStatus),
    note: link.note,
    linkedOnLabel: labels.formatDate(link.linkedOn),
    actions: { viewDetail: true, unlink: true },
  };
}
