import type { SubjectColorToken } from "./entities/timetable-slot.entity";

/**
 * The palette a week's subjects are spread over. Excludes `muted`/`geo` (both
 * grey) so two subjects in the same week never read as the same colour.
 */
export const SUBJECT_PALETTE: readonly SubjectColorToken[] = [
  "primary",
  "purple",
  "success",
  "warning",
  "error",
  "teal",
  "info",
  "primary-dark",
];

/**
 * Assign a colour to every subject IN THIS WEEK: the distinct subject ids are
 * sorted, then spread across {@link SUBJECT_PALETTE} by index.
 *
 * Not a fixed subject→colour table: real `subjectId`s are UUIDs, so any static
 * table misses them and the whole grid rendered grey. Spreading the week's own
 * subjects guarantees adjacent lessons are told apart (the actual job of the
 * colour) with no BE colour field and no subject-catalogue join. Sorting — not
 * order of appearance — keeps a subject on the same colour no matter which day
 * it happens to start on.
 *
 * More than 8 distinct subjects in one week wraps around; a repeat is only a
 * cosmetic collision, and the subject NAME is always on the card.
 */
export function assignSubjectColors(
  subjectIds: Iterable<string>,
): Map<string, SubjectColorToken> {
  const distinct = [...new Set(subjectIds)].filter(Boolean).sort();
  return new Map(
    distinct.map((id, index) => [
      id,
      SUBJECT_PALETTE[index % SUBJECT_PALETTE.length],
    ]),
  );
}
