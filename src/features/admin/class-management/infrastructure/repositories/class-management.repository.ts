import "server-only";
import type { AxiosInstance } from "axios";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type {
  Class,
  CreateClassInput,
  RenameClassInput,
} from "../../domain/entities/class.entity";
import type { TeacherMember } from "../../domain/entities/teacher-member.entity";
import type { ClassManagementFailure } from "../../domain/failures/class-management.failure";
import type {
  ClassListPage,
  IClassManagementRepository,
} from "../../domain/repositories/i-class-management.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { ClassResponseDto } from "../dtos/class-response.dto";
import type { TeacherMemberResponseDto } from "../dtos/teacher-member-response.dto";
import { ClassManagementMapper } from "../mappers/class-management.mapper";

/**
 * Map a normalised ApiError to the class-management failure union.
 * Branch on error.code (UPPER_SNAKE), never on message (TR-026, decision 0008).
 */
function toFailure(err: unknown): ClassManagementFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  if (code === "CLASS_ALREADY_EXISTS" || status === 409) {
    return { type: "duplicate-class" };
  }
  if (code === "CLASS_GRADE_LEVEL_OUTSIDE_TENANT_RANGE" || status === 422) {
    return { type: "grade-level-out-of-range" };
  }
  if (code === "CLASS_NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (status === 403) {
    return { type: "forbidden" };
  }
  if ((err as { retryable?: boolean })?.retryable) {
    return { type: "network-error" };
  }
  return { type: "unknown" };
}

export class ClassManagementRepository implements IClassManagementRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listClasses(params: {
    academicYear?: string;
    gradeLevel?: number;
    cursor?: string;
  }): Promise<Result<ClassListPage, ClassManagementFailure>> {
    try {
      // cursor-paginated list: { raw: true } + parseEnvelope (TR-026).
      const envelope = (await this.http.get(CLASS_EP.classes, {
        params: { ...params },
        raw: true,
      })) as unknown as ApiEnvelope<ClassResponseDto[]>;
      const { data, pagination } = parseEnvelope(envelope);
      return ok({
        data: data.map(ClassManagementMapper.toClass),
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      });
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createClass(
    input: CreateClassInput,
  ): Promise<Result<Class, ClassManagementFailure>> {
    try {
      const data = (await this.http.post(
        CLASS_EP.classes,
        input,
      )) as unknown as ClassResponseDto;
      return ok(ClassManagementMapper.toClass(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async renameClass(
    classId: string,
    input: RenameClassInput,
  ): Promise<Result<Class, ClassManagementFailure>> {
    try {
      const data = (await this.http.patch(
        CLASS_EP.class(classId),
        input,
      )) as unknown as ClassResponseDto;
      return ok(ClassManagementMapper.toClass(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archiveClass(
    classId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    try {
      await this.http.post(CLASS_EP.classArchive(classId));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async assignHomeroomTeacher(
    classId: string,
    teacherUserId: string,
  ): Promise<Result<void, ClassManagementFailure>> {
    try {
      await this.http.put(CLASS_EP.classHomeroomTeacher(classId), {
        teacherUserId,
      });
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getHomeroomTeacher(
    classId: string,
  ): Promise<Result<TeacherMember | null, ClassManagementFailure>> {
    try {
      const data = (await this.http.get(
        CLASS_EP.classHomeroomTeacher(classId),
      )) as unknown as TeacherMemberResponseDto | null;
      return ok(data ? ClassManagementMapper.toTeacherMember(data) : null);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  // MOCK-FIRST (decision 0014): the IAM member-list contract for a TEACHER-role
  // filter is not finalised, and resolving tenantId from the session cookie is
  // out of scope for this story. The DI factory always serves listTeachers from
  // the mock repository; this real implementation is a placeholder.
  // TODO(US-E12.10 follow-up): wire GET /iam/api/v1/tenants/:tenantId/members?role=TEACHER
  // with tenantId decoded from the session JWT once the contract is confirmed.
  async listTeachers(): Promise<
    Result<TeacherMember[], ClassManagementFailure>
  > {
    return fail({ type: "unknown" });
  }
}
