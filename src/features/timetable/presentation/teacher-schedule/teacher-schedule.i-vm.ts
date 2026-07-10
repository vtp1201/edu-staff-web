import type {
  TimetableActionResult,
  TimetableDataState,
} from "../timetable-view/timetable-view.i-vm";

/**
 * The teacher schedule reuses the class-view result/state contracts verbatim —
 * the error-key union (`TimetableViewFailure["type"] | "forbidden"`) and the
 * `WeeklyTimetable` payload are identical (plan §4: reuse, don't fork). Aliases
 * keep the teacher route's imports self-documenting without duplicating types.
 */
export type TeacherScheduleActionResult = TimetableActionResult;
export type TeacherScheduleDataState = TimetableDataState;

export interface TeacherScheduleScreenProps {
  /** RSC-seeded initial data region (the signed-in teacher's week). */
  initialState: TeacherScheduleDataState;
}
