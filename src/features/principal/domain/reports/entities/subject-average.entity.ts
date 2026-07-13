/** One subject's school-wide average score for a term (INT-002). */
export interface SubjectAverageEntity {
  subjectId: string;
  subjectName: string;
  /** 0–10 scale. */
  average: number;
}
