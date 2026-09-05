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
  /** The class this slot belongs to (wire: `SlotResponse.classId`, always
   *  present on the by-member response). Optional here because the mock/legacy
   *  class-scoped path carries no per-slot id. US-E24.8 uses it to deep-link a
   *  teacher's schedule cell into the class hub; an absent id renders a plain,
   *  unlinked cell rather than a dead link. */
  classId?: string;
  /** The slot's CURRENT assigned teacher (wire: `SlotResponse.teacherMemberId`,
   *  always present on the real responses). US-E24.9 keys the class hub's
   *  "tiết của bạn" highlight AND every period-log/period-prep write on this id
   *  — never on `teacherName` (a display string) and never on `sub`
   *  (decision 0074). Optional because the mock/legacy class-scoped seed has no
   *  member ids for most slots. */
  teacherMemberId?: string;
  /** Bell-schedule start, `"HH:mm"`. NO wire source yet (BE US-244 is still in
   *  `openapi.draft.yaml`), so the real mapper leaves both times undefined and
   *  the UI must render the no-time state — see US-E24.9's AC. */
  startTime?: string;
  /** Bell-schedule end, `"HH:mm"` — same draft-status caveat as `startTime`. */
  endTime?: string;
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
