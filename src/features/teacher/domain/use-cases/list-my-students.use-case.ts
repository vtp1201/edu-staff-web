import type {
  TeacherStudentRosterRow,
  TeacherStudentsRoster,
} from "../entities/teacher-student-roster-row.entity";
import type { ClassResult } from "../repositories/i-teacher-class.repository";
import type { GetClassStudentsUseCase } from "./get-class-students.use-case";
import type { ListMyClassesUseCase } from "./list-my-classes.use-case";

/**
 * Aggregates every student across all of the signed-in teacher's classes into a
 * single de-duplicated list (US-E13.9). Pure domain-layer composition over two
 * existing use-cases — no new repository method, no new DTO.
 *
 * Error posture:
 * - the class-list call is load-bearing → its failure is the whole-screen error;
 * - each per-class roster call degrades INDEPENDENTLY → a failing class is
 *   skipped and counted in `failedClassCount` so presentation can show a
 *   non-blocking notice. Data is never dropped without a signal.
 *
 * `GetClassStudentsUseCase.execute()` always resolves a `ClassResult` (it never
 * rejects — the repository catches into the typed failure union), so a plain
 * `Promise.all` + filter over the resolved results is enough; `allSettled` would
 * be ceremony for an unreachable rejection path.
 */
export class ListMyStudentsUseCase {
  constructor(
    private readonly listMyClasses: ListMyClassesUseCase,
    private readonly getClassStudents: GetClassStudentsUseCase,
  ) {}

  async execute(): Promise<ClassResult<TeacherStudentsRoster>> {
    const classesResult = await this.listMyClasses.execute();
    if (!classesResult.ok) return { ok: false, error: classesResult.error };

    const classes = classesResult.data;
    // No classes → empty roster without firing N roster calls.
    if (classes.length === 0) {
      return { ok: true, data: { rows: [], failedClassCount: 0 } };
    }

    const rosters = await Promise.all(
      classes.map((cls) => this.getClassStudents.execute(cls.id)),
    );

    const rows: TeacherStudentRosterRow[] = [];
    const seen = new Set<string>();
    let failedClassCount = 0;

    // Class order = the class-list response order; within a class, roster order.
    rosters.forEach((roster, index) => {
      if (!roster.ok) {
        failedClassCount += 1;
        return;
      }
      const cls = classes[index];
      if (!cls) return;
      for (const student of roster.data) {
        // First class encountered wins for a student enrolled in ≥2 classes.
        if (seen.has(student.studentMemberId)) continue;
        seen.add(student.studentMemberId);
        rows.push({
          studentMemberId: student.studentMemberId,
          displayName: student.displayName,
          classId: cls.id,
          className: cls.name,
          status: student.status,
        });
      }
    });

    return { ok: true, data: { rows, failedClassCount } };
  }
}
