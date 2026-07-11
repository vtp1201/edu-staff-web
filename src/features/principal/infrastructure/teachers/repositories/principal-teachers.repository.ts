import "server-only";
import type { AxiosInstance } from "axios";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
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
import type { PrincipalClassSubject } from "../../../domain/teachers/entities/class-subject.entity";
import type { PrincipalTeacher } from "../../../domain/teachers/entities/principal-teacher.entity";
import type { PrincipalTeachersFailure } from "../../../domain/teachers/failures/principal-teachers.failure";
import type { IPrincipalTeachersRepository } from "../../../domain/teachers/repositories/i-principal-teachers.repository";
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type { PrincipalTeacherResponseDto } from "../dtos/principal-teacher-response.dto";
import { PrincipalTeachersMapper } from "../mappers/principal-teachers.mapper";

/**
 * Map a normalised ApiError to the principal-teachers failure union.
 * Branch on error.code (UPPER_SNAKE), never on message (decision 0008).
 */
function toFailure(err: unknown): PrincipalTeachersFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (code === "TEACHER_ASSIGNMENT_CONFLICT" || code === "TIMETABLE_CONFLICT") {
    return { type: "conflict-exists" };
  }
  if (status === 404) return { type: "not-found" };
  if (status === 403) return { type: "forbidden" };
  return { type: "unknown" };
}

export class PrincipalTeachersRepository
  implements IPrincipalTeachersRepository
{
  constructor(private readonly http: AxiosInstance) {}

  async listTeachers(): Promise<
    Result<PrincipalTeacher[], PrincipalTeachersFailure>
  > {
    try {
      const envelope = (await this.http.get(CLASS_EP.principalTeachers, {
        raw: true,
      })) as unknown as ApiEnvelope<PrincipalTeacherResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      return ok(data.map(PrincipalTeachersMapper.toTeacher));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async listClasses(): Promise<Result<Class[], PrincipalTeachersFailure>> {
    try {
      const envelope = (await this.http.get(CLASS_EP.classes, {
        raw: true,
      })) as unknown as ApiEnvelope<ClassResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      return ok(data.map(ClassManagementMapper.toClass));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

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
      await this.http.put(CLASS_EP.classHomeroomTeacher(classId), {
        teacherId,
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
      await this.http.put(CLASS_EP.classSubjectTeacher(classId, subjectId), {
        teacherId,
      });
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}
