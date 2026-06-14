/** A single teaching period in today's schedule. */
export interface ScheduleItem {
  period: number;
  subject: string;
  className: string;
  room: string;
  status: "done" | "live" | "upcoming";
}
