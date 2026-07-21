/**
 * INT-001 wire shape (camelCase). One linked student in the parent's own list.
 * `avatarUrl` is nullable on the wire (mapped to `undefined` in the entity).
 */
export interface LinkedStudentResponseDto {
  studentId: string;
  fullName: string;
  avatarUrl?: string | null;
  linkId: string;
}
