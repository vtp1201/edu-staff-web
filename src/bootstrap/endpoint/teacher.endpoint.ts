/** Core service endpoints consumed by the teacher dashboard (decision 0017). */
export const TEACHER_EP = {
  classes: "/core/api/v1/classes",
  classStudents: (classId: string) =>
    `/core/api/v1/classes/${classId}/students`,
} as const;
