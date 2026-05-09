export const ATTENDANCE_EP = {
  myClasses: "/attendance/classes",
  roster: (classId: string) => `/attendance/classes/${classId}/roster`,
  save: (periodId: string) => `/attendance/periods/${periodId}`,
  history: (classId: string) => `/attendance/classes/${classId}/history`,
} as const;
