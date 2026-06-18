export const EXAM_BANK_EP = {
  list: "/lms/api/v1/exam-bank",
  detail: (id: string) => `/lms/api/v1/exam-bank/${id}`,
  create: "/lms/api/v1/exam-bank",
  update: (id: string) => `/lms/api/v1/exam-bank/${id}`,
  publish: (id: string) => `/lms/api/v1/exam-bank/${id}/publish`,
  delete: (id: string) => `/lms/api/v1/exam-bank/${id}`,
} as const;
