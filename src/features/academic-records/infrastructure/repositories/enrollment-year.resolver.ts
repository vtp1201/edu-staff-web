import "server-only";
import type { AxiosInstance } from "axios";
import { studentEnrollmentPath } from "@/bootstrap/endpoint/admin-roster.endpoint";
import type { EnrollmentDto } from "@/features/admin-roster/infrastructure/dtos/enrollment-response.dto";

/**
 * Hard cap on the class-detail fan-out. A student cannot plausibly hold records
 * in more than a handful of classes (2 terms × ~12 school years), so the cap
 * only ever bites on corrupt/hostile data — beyond it the extra classes stay
 * UNRESOLVED (they degrade into the viewer's "unresolved year" bucket) instead
 * of storming `core` with unbounded point reads.
 */
export const MAX_CLASS_YEAR_LOOKUPS = 24;

export type ResolveYearByClassId = (
  classIds: string[],
  studentMemberId: string,
) => Promise<Map<string, string>>;

/**
 * Builds the academic-record viewer's `classId → academicYearLabel` join
 * (US-E18.54).
 *
 * Why an enrollment point read and not `GET /classes/{classId}`: the year lives
 * on BOTH, but only the enrollment row is readable by a STUDENT (see
 * `ROSTER_EP.unenroll`'s doc for the two RBAC lists). One endpoint covering
 * ADMIN + MANAGER + STUDENT-self + assigned-TEACHER beats two role-specific
 * strategies. It costs the class NAME (absent from `EnrollmentResponse`), which
 * the viewer therefore does not display rather than rendering a uuid.
 *
 * Contract of this collaborator:
 * - ONE request per DISTINCT classId (the caller passes the raw, duplicated
 *   list; deduping is this function's job so no caller can forget it);
 * - FAIL-SOFT per class — a 403/404 on one class resolves to "absent from the
 *   map", never a rejection: a parent (forbidden on every class) or a teacher
 *   (forbidden on classes they are not assigned to) must still see the records
 *   themselves, honestly degraded.
 *
 * This module lives in `academic-records/infrastructure` because it has exactly
 * one consumer and no class-enrollment read module exists in the app yet.
 * PROMOTE it to a shared module (do not copy it) the day a second feature needs
 * the same join.
 */
export function makeEnrollmentYearResolver(
  http: AxiosInstance,
): ResolveYearByClassId {
  return async (classIds, studentMemberId) => {
    const distinct = [...new Set(classIds)].slice(0, MAX_CLASS_YEAR_LOOKUPS);
    const years = new Map<string, string>();
    if (distinct.length === 0) return years;

    const resolved = await Promise.all(
      distinct.map(async (classId) => {
        try {
          const dto = (await http.get(
            studentEnrollmentPath(classId, studentMemberId),
          )) as unknown as EnrollmentDto;
          const label = dto?.academicYearLabel?.trim();
          return label ? ([classId, label] as const) : null;
        } catch {
          return null;
        }
      }),
    );

    for (const entry of resolved) {
      if (entry) years.set(entry[0], entry[1]);
    }
    return years;
  };
}
