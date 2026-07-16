import "server-only";

import { makeClassManagementRepository } from "@/bootstrap/di/class-management.di";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { MOCK_GRADE_SUBJECT_OPTIONS } from "@/features/grades/infrastructure/repositories/mocks/fixtures";

/**
 * Class-subject picker data source (US-E18.12, ADR 0054 §3.4) — composes the
 * already-real `class-management` listing (`GET /classes`, role-filtered
 * server-side: TEACHER sees own classes, ADMIN/PRINCIPAL see all) with the
 * per-class subject listing (`GET /classes/{classId}/subjects`, whose
 * `lockedFields.subjectName` supplies the display name — no separate
 * subject-catalogue join needed).
 *
 * Over-inclusive BY DESIGN: no per-teacher subject-assignment listing endpoint
 * exists, so this may list subjects in a class the teacher isn't individually
 * assigned to teach. The entry endpoint's own `403
 * GRADE_ENTRY_TEACHER_NOT_ASSIGNED` gate is the real authority — this is just
 * a convenience picker, not an access-control boundary.
 */
export interface GradeSubjectOption {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
}

interface ClassSubjectListItemDto {
  subjectId: string;
  lockedFields: { subjectName: string };
}

export async function resolveMyGradeSubjects(): Promise<GradeSubjectOption[]> {
  if (USE_MOCK) {
    return MOCK_GRADE_SUBJECT_OPTIONS.map((o) => ({ ...o }));
  }

  const classesResult = await (
    await makeClassManagementRepository()
  ).listClasses({});
  if (!classesResult.ok) return [];

  const http = await createServerHttpClient();
  const options: GradeSubjectOption[] = [];

  for (const klass of classesResult.value.data) {
    let cursor: string | undefined;
    for (;;) {
      const envelope = (await http.get(CLASS_EP.classSubjects(klass.id), {
        params: { cursor, limit: 100 },
        raw: true,
      })) as unknown as ApiEnvelope<ClassSubjectListItemDto[]>;
      const { data, pagination } = parseEnvelope(envelope);
      for (const cs of data) {
        options.push({
          classId: klass.id,
          subjectId: cs.subjectId,
          className: klass.name,
          subjectName: cs.lockedFields.subjectName,
        });
      }
      if (!pagination?.hasMore || !pagination.nextCursor) break;
      cursor = pagination.nextCursor;
    }
  }

  return options;
}
