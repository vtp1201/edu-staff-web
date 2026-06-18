export const GRADES_EP = {
  sheet: (csId: string) => `/core/api/v1/class-subjects/${csId}/grades`,
  saveScore: (csId: string, studentId: string) =>
    `/core/api/v1/class-subjects/${csId}/grades/${studentId}`,
  publish: (csId: string) =>
    `/core/api/v1/class-subjects/${csId}/grades/publish`,
} as const;
