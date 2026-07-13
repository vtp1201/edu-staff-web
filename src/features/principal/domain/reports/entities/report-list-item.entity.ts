import type { Term } from "./reports-summary.entity";

/** A generated periodic report row (INT-004). */
export interface ReportListItemEntity {
  id: string;
  name: string;
  term: Term;
  /** ISO-8601 timestamp. */
  createdAt: string;
  status: "ready" | "generating";
}
