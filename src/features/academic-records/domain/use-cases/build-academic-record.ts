import {
  type AcademicRecord,
  type AcademicYear,
  type TermRecord,
  UNRESOLVED_YEAR_ID,
} from "../entities/academic-record.entity";
import { deriveYearSealStatus } from "./derive-year-seal-status";

/**
 * Assembles the multi-year viewer VIEW from the flat `(classId, termId)` record
 * list `core` actually returns (US-E18.54).
 *
 * The year dimension does NOT exist on the academic-record wire and BE has
 * confirmed it never will — it is resolved per `classId` by an injected
 * collaborator (`yearByClassId`) and grouped here. Keeping that grouping in
 * `domain/` (pure, no HTTP) is what lets the mock repository and the real
 * repository share ONE derivation.
 *
 * Degrade rules (AC): a record whose class year did not resolve is NEVER
 * dropped and NEVER given an invented year — it lands in a single
 * {@link UNRESOLVED_YEAR_ID} bucket rendered last with a `null` label, and that
 * bucket is never "the current year".
 *
 * Year ordering is lexicographic on the label, which equals chronological for
 * the conventional `YYYY-YYYY` form — the same rule `core`'s own
 * `EnrollmentResolver` uses to pick a student's latest enrollment.
 */
export function buildAcademicRecord(
  studentMemberId: string,
  records: TermRecord[],
  yearByClassId: Map<string, string>,
): AcademicRecord {
  const buckets = new Map<string, TermRecord[]>();
  for (const record of records) {
    const yearId = yearByClassId.get(record.classId) ?? UNRESOLVED_YEAR_ID;
    const bucket = buckets.get(yearId);
    if (bucket) bucket.push(record);
    else buckets.set(yearId, [record]);
  }

  const resolvedIds = [...buckets.keys()]
    .filter((id) => id !== UNRESOLVED_YEAR_ID)
    .sort((a, b) => a.localeCompare(b));
  const currentYearId = resolvedIds.at(-1) ?? null;

  const orderedIds = buckets.has(UNRESOLVED_YEAR_ID)
    ? [...resolvedIds, UNRESOLVED_YEAR_ID]
    : resolvedIds;

  const years: AcademicYear[] = orderedIds.map((yearId) => {
    const terms = [...(buckets.get(yearId) ?? [])].sort((a, b) =>
      a.termId.localeCompare(b.termId),
    );
    return {
      yearId,
      yearLabel: yearId === UNRESOLVED_YEAR_ID ? null : yearId,
      isCurrent: yearId === currentYearId,
      sealStatus: deriveYearSealStatus(terms),
      terms,
    };
  });

  return {
    studentMemberId,
    years,
    sealed: records.length > 0 && records.every((r) => r.status === "SEALED"),
  };
}
