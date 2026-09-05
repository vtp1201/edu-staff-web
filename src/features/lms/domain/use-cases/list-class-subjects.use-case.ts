import type { ClassSubjectRef } from "../entities/class-subject-ref.entity";
import type { IClassSubjectsRepository } from "../repositories/i-class-subjects.repository";
import { type Result, runCatching } from "./result";

/** The GVCN subject picker's options. A failure here costs the picker, never
 *  the course the teacher already resolved — the caller degrades to their own
 *  subject list rather than blanking the tab. */
export class ListClassSubjectsUseCase {
  constructor(private readonly repo: IClassSubjectsRepository) {}

  execute(classId: string): Promise<Result<ClassSubjectRef[]>> {
    return runCatching(() => this.repo.listClassSubjects(classId));
  }
}
