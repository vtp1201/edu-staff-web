export interface Term {
  id: string;
  name: string;
  /** ISO date string `YYYY-MM-DD` */
  startDate: string;
  /** ISO date string `YYYY-MM-DD` */
  endDate: string;
  /** True when the term already has grade entries (delete is protected). */
  hasGrades: boolean;
}
