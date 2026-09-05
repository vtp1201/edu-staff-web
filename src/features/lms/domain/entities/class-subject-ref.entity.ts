/**
 * The minimum a subject picker needs: which subject, and what to call it.
 *
 * Deliberately NARROWER than `principal/`'s `PrincipalClassSubject` (which
 * also carries the assigned teacher) — this screen only chooses a subject to
 * read a course for, and pulling in the principal's teacher-assignment domain
 * would tie a teacher screen to an admin aggregate it has no business knowing.
 *
 * `subjectId` (NOT the offering's own `id`) is what `Course.subjectId` is
 * compared against — mixing the two silently makes every course look foreign.
 */
export interface ClassSubjectRef {
  subjectId: string;
  subjectName: string;
}
