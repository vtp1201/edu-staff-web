import "server-only";
import type { AxiosInstance } from "axios";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { SUBJECT_CATALOGUE_EP } from "@/bootstrap/endpoint/subject-catalogue.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import {
  fail,
  ok,
  type Result,
} from "@/features/admin/class-management/domain/use-cases/result";
import type { ClassResponseDto } from "@/features/admin/class-management/infrastructure/dtos/class-response.dto";
import { ClassManagementMapper } from "@/features/admin/class-management/infrastructure/mappers/class-management.mapper";
import type { DirectoryMember } from "@/features/iam-directory/domain/entities/directory-member.entity";
import type { IamDirectoryFailure } from "@/features/iam-directory/domain/failures/iam-directory.failure";
import type { Result as DirectoryResult } from "@/features/iam-directory/domain/use-cases/result";
import type { PrincipalClassSubject } from "../../../domain/teachers/entities/class-subject.entity";
import type {
  PrincipalTeacher,
  SubjectAssignment,
} from "../../../domain/teachers/entities/principal-teacher.entity";
import type { PrincipalTeachersFailure } from "../../../domain/teachers/failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../../../domain/teachers/repositories/i-principal-teachers.repository";
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type { SubjectAssignmentResponseDto } from "../dtos/subject-assignment-response.dto";
import type { SubjectNameDto } from "../dtos/subject-name.dto";
import { PrincipalTeachersMapper } from "../mappers/principal-teachers.mapper";

/**
 * `iam-directory` collaborator supplying the teacher rows (US-E18.40), injected
 * by `bootstrap/di/principal-teachers.di.ts`.
 *
 * Same shape as `class-management`'s `TeacherDirectorySearch`: the DI factory
 * pins the two arguments this repository must not own — the `role: "TEACHER"`
 * filter and the tenant id decoded from the access-token claim — so the IAM wire
 * call stays inside `iam-directory` (decision 0017: one repository never spans
 * two services). This screen lists the WHOLE teacher directory, so there is no
 * `search` parameter.
 */
export type TeacherDirectoryList = () => Promise<
  DirectoryResult<DirectoryMember[], IamDirectoryFailure>
>;

/**
 * Hard cap on the per-class `subject-assignments` fan-out.
 *
 * No tenant-wide "assignments by teacher" endpoint exists (BE US-181 is
 * per-class), so "môn dạy / số lớp phụ trách" costs ONE upstream request per
 * class on every load of an RSC-rendered screen. 40 is chosen because:
 * - it covers a realistic Vietnamese school (3 grade levels × ~12 classes = 36);
 * - `listClasses()` below reads exactly ONE page of `GET /classes`, whose BE cap
 *   is 100 and default 20 (`list_classes.go`), so 40 is 2× today's real ceiling;
 * - beyond it a single page render would issue >40 blocking upstream calls on
 *   top of the IAM directory drain and the subject-catalogue drain.
 *
 * Past the cap the composition degrades to homeroom-only (which is free — it
 * comes from the class list itself); the teacher list is NEVER blocked on it.
 */
export const MAX_SUBJECT_ASSIGNMENT_FANOUT = 40;

/**
 * Map a normalised ApiError to the principal-teachers failure union.
 * Branch on error.code (UPPER_SNAKE), never on message (decision 0008).
 *
 * Re-ground-truthed in US-E18.40 against `services/core/docs/ERROR_CODES.md`
 * (§"Class + TeachingAssignment", §"Class — GVBM assignment") and the Go
 * use-cases. The previous `TEACHER_ASSIGNMENT_CONFLICT`/`TIMETABLE_CONFLICT`
 * branches were invented for the never-implemented `GET /core/api/v1/teachers`
 * and are NOT emitted by any endpoint this repository calls — they are gone.
 * `TIMETABLE_TEACHER_CONFLICT` belongs to the timetable feature's own writes.
 *
 * 422 (`CLASS_ASSIGNMENT_NOT_TEACHER_ROLE`, `CLASS_SUBJECT_NOT_ACTIVE`) has no
 * member in this union and deliberately lands on `unknown` rather than being
 * mislabelled `conflict-exists` ("giáo viên đã có xung đột lịch dạy" would
 * misdescribe "this member is not a TEACHER").
 */
function toFailure(err: unknown): PrincipalTeachersFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (
    code === "CLASS_NOT_FOUND" ||
    code === "CLASS_ASSIGNMENT_NOT_FOUND" ||
    code === "CLASS_ASSIGNMENT_TEACHER_NOT_FOUND" ||
    status === 404
  ) {
    return { type: "not-found" };
  }
  if (code === "CLASS_FORBIDDEN" || status === 403) {
    return { type: "forbidden" };
  }
  if (
    code === "CLASS_ALREADY_EXISTS" ||
    code === "CLASS_ARCHIVED" ||
    status === 409
  ) {
    return { type: "conflict-exists" };
  }
  return { type: "unknown" };
}

/**
 * Translate `iam-directory`'s failure union into this feature's own, at the
 * boundary, so `IamDirectoryFailure` never reaches presentation. `too-many-ids`
 * belongs to the batch-lookup path and is unreachable here → `unknown`.
 */
function fromDirectoryFailure(
  failure: IamDirectoryFailure,
): PrincipalTeachersFailure {
  switch (failure.type) {
    case "forbidden":
      return { type: "forbidden" };
    case "network-error":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}

/** The subject taught in the most classes; ties broken alphabetically. */
function primarySubjectOf(assignments: SubjectAssignment[]): string | null {
  const counts = new Map<string, number>();
  for (const a of assignments) {
    if (a.subjectName === null) continue;
    counts.set(a.subjectName, (counts.get(a.subjectName) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of [...counts].sort(([a], [b]) =>
    a.localeCompare(b, "vi"),
  )) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

export class PrincipalTeachersRepository
  implements IPrincipalTeachersRepository
{
  constructor(
    private readonly http: AxiosInstance,
    /**
     * Optional so the wire-level tests of the OTHER methods can construct the
     * repository with just an http client. Absent = misconfigured DI, which
     * fails closed (`unknown`, zero HTTP) rather than returning an empty roster
     * that would read as "this school has no teachers".
     */
    private readonly listDirectory?: TeacherDirectoryList,
  ) {}

  /**
   * Teacher roster for the principal screens.
   *
   * Data source since US-E18.40: the IAM member directory
   * (`GET /iam/api/v1/tenants/{tenantId}/members?role=TEACHER`, IAM US-144) via
   * the injected port. The previous `GET /core/api/v1/teachers` NEVER existed
   * and never will — BE closed cross-repo ask #44 with "option b: won't
   * implement" (`docs/reports/2026-08-04-be-to-fe-response.md`).
   *
   * The directory is the AUTHORITY for the row set; everything else is composed
   * best-effort on top and degrades to empty rather than failing the list:
   * 1. homeroom — from the enriched `GET /classes` fields (BE US-173), free;
   * 2. subject assignments — one `GET /classes/{id}/subject-assignments` per
   *    class (BE US-181), bounded by {@link MAX_SUBJECT_ASSIGNMENT_FANOUT};
   * 3. subject names — ONE `GET /subjects` drain, shared by every assignment.
   *
   * KNOWN COST: `principal/teachers/page.tsx` also calls `listClasses()` for the
   * assignment-sheet pickers, so `GET /classes` is read twice per render. Fixing
   * that needs a repository-interface change (the page would have to pass its
   * class list in) — deliberately not done here.
   */
  async listTeachers(): Promise<
    Result<PrincipalTeacher[], PrincipalTeachersFailure>
  > {
    if (!this.listDirectory) return fail({ type: "unknown" });

    const directory = await this.listDirectory();
    if (!directory.ok) return fail(fromDirectoryFailure(directory.failure));

    const teachers = directory.value.map((m) =>
      PrincipalTeachersMapper.toTeacherFromDirectoryMember(m),
    );
    const byId = new Map(teachers.map((t) => [t.teacherId, t]));

    // The enrichment reads are best-effort: a class-list outage must not blank
    // the teacher roster (the picker on principal/schedule depends on it too).
    const classesResult = await this.listClasses();
    if (!classesResult.ok) return ok(teachers);
    const classes = classesResult.value;

    for (const klass of classes) {
      if (klass.homeroomTeacherId === null) continue;
      const teacher = byId.get(klass.homeroomTeacherId);
      if (!teacher) continue;
      teacher.homeroomClassId = klass.id;
      teacher.homeroomClassName = klass.name;
    }

    if (
      classes.length === 0 ||
      classes.length > MAX_SUBJECT_ASSIGNMENT_FANOUT
    ) {
      return ok(teachers);
    }

    const perClass = await Promise.all(
      classes.map(async (klass) => ({
        klass,
        rows: await this.tryListSubjectAssignments(klass.id),
      })),
    );
    const flat = perClass.filter((entry) => entry.rows.length > 0);
    if (flat.length === 0) return ok(teachers);

    const subjectNames = await this.tryFetchSubjectNames();
    for (const { klass, rows } of flat) {
      for (const row of rows) {
        // A row whose teacher is absent from the directory (removed/LEFT member)
        // is dropped: the directory decides which rows exist, so there is no
        // teacher to attach it to.
        const teacher = byId.get(row.teacherMemberId);
        if (!teacher) continue;
        teacher.subjectAssignments.push(
          PrincipalTeachersMapper.toSubjectAssignment(
            row,
            klass.name,
            subjectNames.get(row.subjectId) ?? null,
          ),
        );
      }
    }
    for (const teacher of teachers) {
      teacher.primarySubjectName = primarySubjectOf(teacher.subjectAssignments);
    }

    return ok(teachers);
  }

  /**
   * One class's GVBM assignments. NEVER throws: a per-class failure (403 on a
   * class this actor cannot read, transport blip) degrades that class's
   * decoration only — see the aggregate contract in {@link listTeachers}.
   *
   * `response.OK` (not `Paginated`) on the BE side → plain unwrapped array, so
   * no `{ raw: true }` here.
   */
  private async tryListSubjectAssignments(
    classId: string,
  ): Promise<SubjectAssignmentResponseDto[]> {
    try {
      return (await this.http.get(
        CLASS_EP.classSubjectAssignments(classId),
      )) as unknown as SubjectAssignmentResponseDto[];
    } catch {
      return [];
    }
  }

  /**
   * subjectId → name, draining `GET /subjects` (any authenticated tenant member
   * may read it — `list_subjects.go`). Same idiom as `exam-bank.repository.ts`,
   * except an unresolved id yields `null` rather than the raw uuid: a uuid under
   * the "Môn học" label would be a lie. Never throws — a missing subject name is
   * cosmetic.
   */
  private async tryFetchSubjectNames(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      let cursor: string | undefined;
      do {
        const envelope = (await this.http.get(SUBJECT_CATALOGUE_EP.subjects, {
          params: { ...(cursor ? { cursor } : {}) },
          raw: true,
        })) as unknown as ApiEnvelope<SubjectNameDto[]>;
        const { data, pagination } = parseEnvelope(envelope);
        for (const s of data) map.set(s.subjectId, s.name);
        cursor =
          pagination?.hasMore && pagination.nextCursor
            ? pagination.nextCursor
            : undefined;
      } while (cursor);
    } catch {
      // Best-effort: presentation renders its own placeholder for a null name.
    }
    return map;
  }

  async listClasses(): Promise<Result<Class[], PrincipalTeachersFailure>> {
    try {
      const envelope = (await this.http.get(CLASS_EP.classes, {
        raw: true,
      })) as unknown as ApiEnvelope<ClassResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      // The old KNOWN GAP here ("hardcodes studentCount 0 / no homeroom
      // because `ClassResponse` carries neither on the wire") is CLOSED: BE
      // US-173 enriches `GET /classes` with `studentCount` +
      // `homeroomTeacherId`/`homeroomTeacherName`, so this call site gets them
      // for free from the shared mapper — no fan-out needed (US-E18.30), and
      // `listTeachers` derives homeroom from exactly these fields (US-E18.40).
      return ok(data.map((dto) => ClassManagementMapper.toClass(dto)));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  /**
   * Curriculum `ClassSubject` offerings of a class (US-057) — the GVBM subject
   * picker in the assignment sheet. Genuinely unrelated to
   * `subject-assignments` (a different aggregate, different path); untouched by
   * US-E18.40 per that story's scope.
   */
  async getClassSubjects(
    classId: string,
  ): Promise<Result<PrincipalClassSubject[], PrincipalTeachersFailure>> {
    try {
      const data = (await this.http.get(
        CLASS_EP.classSubjects(classId),
      )) as unknown as ClassSubjectResponseDto[];
      return ok(data.map(PrincipalTeachersMapper.toClassSubject));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async assignHomeroomTeacher(
    classId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>> {
    try {
      // Wire body is `teacherMemberId` (`AssignHomeroomRequest`, required+uuid —
      // ground-truthed in core's Go http dto, US-E18.40). It used to send
      // `teacherId`, which the BE validator rejects; the VALUE is unchanged
      // (IAM `memberId === userId`), only the field name was wrong.
      await this.http.put(CLASS_EP.classHomeroomTeacher(classId), {
        teacherMemberId: teacherId,
      });
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async assignSubjectTeacher(
    classId: string,
    subjectId: string,
    teacherId: string,
  ): Promise<Result<void, PrincipalTeachersFailure>> {
    try {
      // `AssignSubjectTeacherRequest` — same field-name correction as above.
      await this.http.put(CLASS_EP.classSubjectTeacher(classId, subjectId), {
        teacherMemberId: teacherId,
      });
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}
