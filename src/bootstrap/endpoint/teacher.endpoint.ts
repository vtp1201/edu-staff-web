/** Core service endpoints consumed by the teacher dashboard (decision 0017). */
export const TEACHER_EP = {
  classes: "/core/api/v1/classes",
  classStudents: (classId: string) =>
    `/core/api/v1/classes/${classId}/students`,
  /**
   * draft US-245 — `GET /core/api/v1/classes/{classId}/attendance/summary?termId=`
   * (core `openapi.draft.yaml`, `AttendanceSummary`). RECORDED, NOT CALLED: the
   * required `termId` has no source anywhere on the web today, so the class
   * card's "Chuyên cần %" tile stays mock-only until a term lookup exists
   * (see `teacher-class.repository.ts#getHomeroomKpi`).
   */
  classAttendanceSummary: (classId: string) =>
    `/core/api/v1/classes/${classId}/attendance/summary`,
  /** Homeroom-teacher (GVCN) lookup — reserved for a future US (not called yet). */
  classHomeroomTeacher: (classId: string) =>
    `/core/api/v1/classes/${classId}/homeroom-teacher`,
} as const;
