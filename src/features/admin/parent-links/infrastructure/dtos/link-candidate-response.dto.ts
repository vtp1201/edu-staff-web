/** Wire shape for a create-dialog search candidate (INT-005/INT-006). camelCase. */
export interface LinkCandidateResponseDto {
  memberId: string;
  fullName: string;
  avatarUrl?: string | null;
  className?: string | null;
  phone?: string | null;
}
