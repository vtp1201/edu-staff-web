/** INT-002 wire shape. Response envelope payload: `{ subjects: [...] }`. */
export interface SubjectAverageResponseDto {
  subjectId: string;
  subjectName: string;
  average: number;
}

export interface SubjectAveragesResponseDto {
  subjects: SubjectAverageResponseDto[];
}
