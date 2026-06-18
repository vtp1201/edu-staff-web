export const LESSON_BANK_EP = {
  list: "/lms/api/v1/lessons",
  detail: (id: string) => `/lms/api/v1/lessons/${id}`,
  upload: "/lms/api/v1/lessons",
  update: (id: string) => `/lms/api/v1/lessons/${id}`,
  delete: (id: string) => `/lms/api/v1/lessons/${id}`,
} as const;
