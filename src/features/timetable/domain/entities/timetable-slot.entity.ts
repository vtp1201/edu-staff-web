/**
 * A single resolved timetable slot (one subject in one period of one day).
 *
 * Names are resolved server-side (no ID joins on the client), so this entity
 * carries display strings directly. `teacherName` is used by the class-scope
 * view (student/parent, US-E15.1); `className` is reserved for the not-yet-built
 * teacher-scope view (US-E15.2) — both optional so one entity serves both
 * variants without teacher-mode fields leaking into this story's UI.
 */
export interface TimetableSlot {
  subjectId: string;
  subjectName: string;
  /** Semantic color-identity key → presentation maps to literal Tailwind classes. */
  subjectColorToken: SubjectColorToken;
  teacherName?: string;
  room?: string;
  /** US-E15.2 (teacher scope) — unused by the class-scope view. */
  className?: string;
}

/**
 * Semantic color identity of a subject. Each key maps to an existing design
 * token family in `src/app/tokens.css` (resolved to literal classes in
 * `presentation/timetable-view/subject-color-tokens.ts`). `geo` is a documented
 * placeholder pending a dedicated token ADR (see the mapper).
 */
export type SubjectColorToken =
  | "primary"
  | "primary-dark"
  | "purple"
  | "success"
  | "warning"
  | "error"
  | "teal"
  | "info"
  | "muted"
  | "geo";
