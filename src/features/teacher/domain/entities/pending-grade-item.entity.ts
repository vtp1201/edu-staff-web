/** A grading task awaiting the teacher's input. */
export interface PendingGradeItem {
  studentName: string;
  assessmentType: string;
  className: string;
  /** Class this grading task belongs to — US-E24.8 deep link. Optional for the
   *  same reason as `ScheduleItem.classId` (no BE source yet). */
  classId?: string;
}
