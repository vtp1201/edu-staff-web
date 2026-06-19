export const ACADEMIC_RECORDS_EP = {
  record: (studentId: string) => `/core/api/v1/academic-records/${studentId}`,
  years: (studentId: string) =>
    `/core/api/v1/academic-records/${studentId}/years`,
} as const;
