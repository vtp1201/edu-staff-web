/**
 * Parent–student link entity (US-E20.1, spec.md §6 shape — authoritative).
 * A `(studentId, parentId)` pair with a relationship, aggregate consent status
 * and an optional admin note. Flat display fields (name/avatar/class/phone) are
 * inlined by INT-001 (avoids an N+1 per row); the DTO's nested wire shape is
 * flattened by the mapper.
 */
export type RelationshipType = "father" | "mother" | "guardian";

export type ConsentStatus = "agreed" | "pending" | "declined";

export interface ParentStudentLink {
  linkId: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
  studentClassName: string;
  parentId: string;
  parentName: string;
  parentAvatarUrl?: string;
  parentPhone: string;
  relationship: RelationshipType;
  note?: string;
  consentStatus: ConsentStatus;
  /** ISO-8601 date the link was created. */
  linkedOn: string;
}
