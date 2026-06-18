export const EXAM_EP = {
  list: "/lms/api/v1/exams",
  questions: (examId: string) => `/lms/api/v1/exams/${examId}/questions`,
  submit: (examId: string) => `/lms/api/v1/exams/${examId}/submit`,
  result: (examId: string) => `/lms/api/v1/exams/${examId}/result`,
} as const;
