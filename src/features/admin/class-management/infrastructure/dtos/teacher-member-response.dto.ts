export interface TeacherMemberResponseDto {
  userId: string;
  displayName: string;
  email: string;
  role: string;
}

export type TeacherMembersResponseDto = TeacherMemberResponseDto[];
