import "server-only";

import { mockDelay } from "@/bootstrap/lib/mock";
import type { ClassSubjectRef } from "../../../domain/entities/class-subject-ref.entity";
import type { IClassSubjectsRepository } from "../../../domain/repositories/i-class-subjects.repository";
import { MOCK_CLASS_SUBJECTS } from "./lms.fixtures";

/** Mirrors the real read: an unknown class is a denial (`forbidden`), never
 *  an empty list — an empty picker would look like a class with no subjects. */
export class MockClassSubjectsRepository implements IClassSubjectsRepository {
  async listClassSubjects(classId: string): Promise<ClassSubjectRef[]> {
    await mockDelay();
    const rows = MOCK_CLASS_SUBJECTS[classId];
    if (!rows) throw { type: "forbidden" as const };
    return rows.map((r) => ({ ...r }));
  }
}
