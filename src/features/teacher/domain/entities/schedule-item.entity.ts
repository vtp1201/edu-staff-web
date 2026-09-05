/** A single teaching period in today's schedule. */
export interface ScheduleItem {
  period: number;
  subject: string;
  className: string;
  room: string;
  status: "done" | "live" | "upcoming";
  /** Class this period belongs to — drives the US-E24.8 class-hub deep link.
   *  Optional: the real repository has no BE source for today's schedule yet,
   *  and a row without an id renders as plain text instead of a dead link. */
  classId?: string;
}
