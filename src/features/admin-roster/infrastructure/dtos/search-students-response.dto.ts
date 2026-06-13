export interface SearchStudentDto {
  id: string;
  name: string;
  currentClassId: string | null;
  currentClassName: string | null;
}

export type SearchStudentsResponseDto = SearchStudentDto[];
