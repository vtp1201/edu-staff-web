/**
 * The two fields of core's `SubjectResponse` (`GET /core/api/v1/subjects`) this
 * feature needs, narrowed to a name lookup. Any authenticated tenant member may
 * read that list (`list_subjects.go`), so a principal can always drain it.
 *
 * Same idiom as `exam-bank.repository.ts`'s `fetchSubjectNames()` — core's
 * assignment/exam rows carry `subjectId` only.
 */
export interface SubjectNameDto {
  subjectId: string;
  name: string;
}
