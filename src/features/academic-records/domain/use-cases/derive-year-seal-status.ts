import type {
  AcademicYear,
  TermRecord,
} from "../entities/academic-record.entity";

/**
 * Derives a year-level seal status from its terms:
 *   any UNSEALED         → 'unsealed_in_year'
 *   all SEALED           → 'all_sealed'
 *   none SEALED          → 'none'
 *   otherwise (mixed)    → 'partial'
 * An empty term list reads as 'none'.
 */
export function deriveYearSealStatus(
  terms: TermRecord[],
): AcademicYear["sealStatus"] {
  if (terms.some((t) => t.status === "UNSEALED")) return "unsealed_in_year";

  const sealedCount = terms.filter((t) => t.status === "SEALED").length;
  if (sealedCount === 0) return "none";
  if (sealedCount === terms.length) return "all_sealed";
  return "partial";
}
