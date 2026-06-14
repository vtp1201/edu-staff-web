import type { TeacherClass } from "../entities/teacher-class.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";

/** Fetches the classes assigned to the current teacher (incl. GVCN flag). */
export class ListMyClassesUseCase {
  constructor(private readonly repo: ITeacherClassRepository) {}

  execute(): Promise<ClassResult<TeacherClass[]>> {
    return this.repo.listMyClasses();
  }
}
