/**
 * `staff-conduct-notes` wire shape (camelCase). Keyed by `(termId, staffMemberId)`.
 * `academicYearId` is validation-only on POST and is NOT echoed back (spec §6),
 * so it is absent here. No `staffName`/`department` on the wire (mapper resolves).
 */
export interface StaffConductNoteResponseDto {
  termId: string;
  staffMemberId: string;
  rating: "SATISFACTORY" | "NEEDS_IMPROVEMENT" | "UNSATISFACTORY";
  note: string;
  state: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  authorMemberId: string;
  approverMemberId?: string;
  selfApproved?: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
