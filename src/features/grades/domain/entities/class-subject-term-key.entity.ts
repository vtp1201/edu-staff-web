/**
 * Real identity remap (US-E18.12, ADR 0054): the invented opaque
 * `classSubjectId` ("csId") is retired at the repository boundary in favor of
 * the class/subject/term/year tuple the real `core` service actually keys
 * grade entries by. `classId`/`subjectId` are independent real ids (already
 * wired since US-E18.4/US-E18.11) — no second identity system is invented.
 */
export interface ClassSubjectTermKey {
  classId: string;
  subjectId: string;
  termId: string;
  academicYearLabel: string;
}
