import type { RankBand } from "@/features/grades/domain/use-cases/rank-band";

/**
 * Academic-record VIEWER entities (US-E18.54 remodel).
 *
 * These are **client-side DERIVED VIEWS**, not the wire shape. `core`'s
 * aggregate is permanently keyed by `(classId, termId, studentMemberId)` with a
 * DYNAMIC per-subject grade-column array — BE confirmed (2026-08-07 §2) there
 * will be no year grouping and no fixed `tx1/tx2/giuaKy/cuoiKy` slots on the
 * wire, EVER. So the previous year-keyed entity shape (which never matched any
 * real contract) is gone: a {@link TermRecord} IS one wire row, and
 * {@link AcademicYear} is assembled client-side by `buildAcademicRecord`
 * (`domain/use-cases/build-academic-record.ts`) from a classId → academic-year
 * resolution supplied by the repository's injected resolver.
 *
 * Fields with NO wire source were DELETED rather than faked: student
 * name/code/dateOfBirth (no identity fields on this contract, and no lookup a
 * PARENT could call), and the conduct grade (`hạnh kiểm` lives in `core`'s
 * separate conduct context and is absent from `gradeSnapshot`).
 */
export type TermStatus = "PENDING" | "SEALED" | "UNSEALED";

/**
 * One frozen grade column inside a subject's snapshot — the real
 * `GradeSnapshotItemResponse` minus its `subjectId` (which becomes the parent
 * {@link SubjectScore}'s key). `coefficient`/`value` arrive as DECIMAL STRINGS
 * on the wire and are parsed here; `null` = unparseable/absent, never `0`.
 */
export interface SubjectColumnScore {
  columnId: string;
  columnName: string;
  columnType: string;
  coefficient: number | null;
  value: number | null;
}

/** One subject's rollup for a term, derived from its snapshot columns. */
export interface SubjectScore {
  subjectId: string;
  /**
   * Resolved from the tenant subject catalogue by an OPTIONAL DI collaborator.
   * `null` when the lookup failed or the subject is unknown — presentation
   * renders an i18n placeholder. NEVER the raw subjectId uuid.
   */
  subjectName: string | null;
  columns: SubjectColumnScore[];
  /** Coefficient-weighted average of the present column values. */
  termAvg: number | null;
  rankBand: RankBand | null;
}

/** ONE academic record row = one `(classId, termId)` wire aggregate. */
export interface TermRecord {
  classId: string;
  /** Free-form on the wire (`"HK1"`, `"HK2"`, or a uuid) — NOT a union. */
  termId: string;
  status: TermStatus;
  sealedAt: string | null;
  sealedBy: string | null;
  unsealedAt: string | null;
  unsealedBy: string | null;
  unsealReason: string | null;
  resealCount: number;
  subjects: SubjectScore[];
  /**
   * The server-computed `termAverage` when present (authoritative — it is what
   * was frozen at seal time), else the mean of the subject averages.
   */
  gpa: number | null;
}

/** Sentinel year bucket for records whose classId → year join did not resolve. */
export const UNRESOLVED_YEAR_ID = "__unresolved-year__";

export interface AcademicYear {
  /** The resolved `academicYearLabel`, or {@link UNRESOLVED_YEAR_ID}. */
  yearId: string;
  /** `null` ONLY for the unresolved bucket — presentation labels it in i18n. */
  yearLabel: string | null;
  isCurrent: boolean;
  sealStatus: "all_sealed" | "partial" | "none" | "unsealed_in_year";
  terms: TermRecord[];
}

export interface AcademicRecord {
  studentMemberId: string;
  years: AcademicYear[];
  /** true only when every term of every year is SEALED. */
  sealed: boolean;
}
