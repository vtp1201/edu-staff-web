import type { TeacherClassKpi } from "../entities/teacher-class.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";

/** Fetches the GVCN-only KPI slice of one class (attendance rate, open
 *  violations, pending leave). Each field degrades to `undefined` when its
 *  source is unavailable — the card hides that tile instead of failing. */
export class GetHomeroomKpiUseCase {
  constructor(private readonly repo: ITeacherClassRepository) {}

  execute(classId: string): Promise<ClassResult<Partial<TeacherClassKpi>>> {
    return this.repo.getHomeroomKpi(classId);
  }
}
