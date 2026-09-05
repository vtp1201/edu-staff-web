import type { ClassSubjectRef } from "../entities/class-subject-ref.entity";

/**
 * The ONE `core` read this feature needs: which subjects a class offers, so a
 * GVCN can pick another teacher's course to read.
 *
 * A separate port from `ILmsRepository` on purpose — a repository never spans
 * two services (`.claude/rules/api-integration.md`), and this call goes to
 * `core`, not `lms`.
 *
 * Throws an `LmsFailure` like every other port in this feature, so the
 * use-case's catch boundary (`runCatching`) is the same one.
 */
export interface IClassSubjectsRepository {
  listClassSubjects(classId: string): Promise<ClassSubjectRef[]>;
}
