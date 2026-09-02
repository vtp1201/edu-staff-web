import type { TeacherClass } from "../entities/teacher-class.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";

/**
 * Reads ONE class of the signed-in teacher (US-E24.8 shell header + role-gated
 * tabs). Deliberately no new repository method / BE round-trip: `listMyClasses`
 * already returns the teacher's own (small) list with roles/subjects/counts, and
 * scoping the lookup to that list is what makes "not mine" indistinguishable
 * from "does not exist" — the page turns both into `notFound()`.
 */
export class GetMyClassUseCase {
  constructor(private readonly repo: ITeacherClassRepository) {}

  async execute(classId: string): Promise<ClassResult<TeacherClass>> {
    const result = await this.repo.listMyClasses();
    if (!result.ok) return result;

    const found = result.data.find((c) => c.id === classId);
    return found
      ? { ok: true, data: found }
      : { ok: false, error: { type: "not-found" } };
  }
}
