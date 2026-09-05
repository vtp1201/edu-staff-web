import "server-only";

import type { AxiosInstance } from "axios";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type { ClassSubjectRef } from "../../domain/entities/class-subject-ref.entity";
import type { IClassSubjectsRepository } from "../../domain/repositories/i-class-subjects.repository";
import type { ClassSubjectSummaryResponseDto } from "../dtos/class-subject-response.dto";
import { toLmsFailure } from "../mappers/lms-failure.mapper";

/** BE caps `limit` at 100. A class offers a couple of dozen subjects, so this
 *  is one round trip in practice — the cursor loop below exists for
 *  correctness, not for volume. */
const PAGE_SIZE = 100;

/**
 * `core` class-subjects read (`GET /classes/{classId}/subjects`) — the GVCN
 * subject picker. Readable by any authenticated caller per core's own contract
 * ("all authenticated"), so it takes no role argument; what a teacher may then
 * DO with the chosen subject's course is gated separately, server-side.
 *
 * It duplicates one GET that `principal/`'s teacher-assignment repository and
 * `bootstrap/lib/resolve-my-grade-subjects.ts` also make; that is deliberate —
 * a short read beats a permanent cross-feature dependency on an admin
 * aggregate, and the grade-book helper answers a different question (every
 * class the caller touches, not one class's offerings). Revisit if a fourth
 * consumer appears.
 */
export class ClassSubjectsRepository implements IClassSubjectsRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listClassSubjects(classId: string): Promise<ClassSubjectRef[]> {
    try {
      const rows: ClassSubjectSummaryResponseDto[] = [];
      let cursor: string | undefined;
      // Cursor-paginated (`ClassSubjectList`). A picker that silently stopped
      // at page 1 would HIDE subjects rather than fail — invisible data loss,
      // so the loop is the only correct read.
      for (;;) {
        const envelope = (await this.http.get(CLASS_EP.classSubjects(classId), {
          params: { cursor, limit: PAGE_SIZE },
          raw: true,
        })) as unknown as ApiEnvelope<ClassSubjectSummaryResponseDto[]>;
        const { data, pagination } = parseEnvelope(envelope);
        rows.push(...data);
        if (!pagination?.hasMore || !pagination.nextCursor) break;
        cursor = pagination.nextCursor;
      }

      // One option per SUBJECT: the picker is keyed on `subjectId`, so a
      // subject listed twice upstream would crash React on a duplicate key
      // (the same defence `dedupeGradeSubjects` applies for the grade book).
      const seen = new Set<string>();
      const refs: ClassSubjectRef[] = [];
      for (const dto of rows) {
        // An ARCHIVED offering is a subject this class no longer teaches;
        // showing it would offer a course BE then refuses to serve. Filtered
        // BEFORE the dedupe set is touched, so an old ARCHIVED row cannot
        // shadow the live ACTIVE one for the same subject.
        if (dto.status !== "ACTIVE") continue;
        if (seen.has(dto.subjectId)) continue;
        seen.add(dto.subjectId);
        refs.push({
          subjectId: dto.subjectId,
          // A blank name would render an unreadable option — fall back to the
          // id so the row stays selectable and visibly wrong, not invisible.
          subjectName: dto.lockedFields?.subjectName?.trim() || dto.subjectId,
        });
      }
      return refs;
    } catch (err) {
      throw toLmsFailure(err);
    }
  }
}
