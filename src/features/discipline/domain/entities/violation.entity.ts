export type ViolationSeverity = "low" | "medium" | "high";

export type ViolationStatus = "recorded" | "notified" | "parent_confirmed";

export type ViolationType =
  | "late"
  | "uniform"
  | "phone"
  | "fight"
  | "skip"
  | "cheat"
  | "disrespect"
  | "noise"
  | "other";

export interface ViolationEntity {
  id: string;
  studentId: string;
  studentName: string;
  initials: string;
  /** Semantic avatar tone token (e.g. "teal", "purple"). */
  avatarTone: string;
  classId: string;
  className: string;
  type: ViolationType;
  /** ISO 8601 "YYYY-MM-DD". */
  date: string;
  period: number | null;
  description: string;
  severity: ViolationSeverity;
  handledBy: string;
  status: ViolationStatus;
}

/** Input for recording a new violation (mock-first: free-text student name). */
export interface RecordViolationInput {
  studentName: string;
  classId: string;
  date: string;
  type: ViolationType;
  severity: ViolationSeverity;
  period: number | null;
  description: string;
  notifyParent: boolean;
}
