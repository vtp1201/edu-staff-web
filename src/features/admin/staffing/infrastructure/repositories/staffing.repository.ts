import "server-only";
import type { AxiosInstance } from "axios";
import { STAFFING_EP } from "@/bootstrap/endpoint/staffing.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type {
  CreateDepartmentInput,
  Department,
  DepartmentStatus,
  PatchDepartmentInput,
} from "../../domain/entities/department.entity";
import type {
  AssignmentStatus,
  CopyAssignmentsInput,
  CopyAssignmentsResult,
  CreateAssignmentInput,
  PositionAssignment,
} from "../../domain/entities/position-assignment.entity";
import type {
  CreatePositionTitleInput,
  PatchPositionTitleInput,
  PositionTitle,
  PositionTitleStatus,
  ScopeType,
} from "../../domain/entities/position-title.entity";
import type { StaffingFailure } from "../../domain/failures/staffing.failure";
import type { IStaffingRepository } from "../../domain/repositories/i-staffing.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { CopyAssignmentsResultDto } from "../dtos/copy-assignments-result.dto";
import type { DepartmentResponseDto } from "../dtos/department-response.dto";
import type {
  AssignmentStatusDto,
  PositionAssignmentResponseDto,
} from "../dtos/position-assignment-response.dto";
import type { PositionTitleResponseDto } from "../dtos/position-title-response.dto";
import { StaffingMapper } from "../mappers/staffing.mapper";

/**
 * Map a normalised ApiError to the staffing failure union. Branch on
 * error.code (UPPER_SNAKE), never on message (US-E06.8). Covers the full
 * `Staffing` section of core/docs/ERROR_CODES.md (both tables, US-E18.2).
 */
export function toFailure(err: unknown): StaffingFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // Network/transport error (no HTTP response received).
  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }

  switch (code) {
    // already-exists (409)
    case "DEPARTMENT_NAME_ALREADY_EXISTS":
    case "POSITION_TITLE_NAME_ALREADY_EXISTS":
    case "POSITION_ASSIGNMENT_ALREADY_EXISTS":
      return { type: "already-exists" };

    // has-active-assignments (409) — archive blocked
    case "DEPARTMENT_HAS_ACTIVE_ASSIGNMENTS":
    case "POSITION_TITLE_HAS_ACTIVE_ASSIGNMENTS":
      return { type: "has-active-assignments" };

    // archived / terminal-state (409) — mutate an already-archived / non-active entity
    case "DEPARTMENT_ARCHIVED":
    case "POSITION_TITLE_ARCHIVED":
    case "POSITION_TITLE_NOT_ACTIVE":
      return { type: "archived" };

    // invalid-permissions (422)
    case "POSITION_TITLE_INVALID_PERMISSIONS":
      return { type: "invalid-permissions" };

    // invalid-scope-type (400)
    case "POSITION_TITLE_INVALID_SCOPE_TYPE":
      return { type: "invalid-scope-type" };

    // member-not-teacher (422)
    case "MEMBER_NOT_TEACHER":
      return { type: "member-not-teacher" };

    // academic-year-not-active (422)
    case "ACADEMIC_YEAR_NOT_ACTIVE":
      return { type: "academic-year-not-active" };

    // scope-entity-not-found (404)
    case "SCOPE_ENTITY_NOT_FOUND":
      return { type: "scope-entity-not-found" };

    // not-found (404)
    case "DEPARTMENT_NOT_FOUND":
    case "POSITION_TITLE_NOT_FOUND":
    case "POSITION_ASSIGNMENT_NOT_FOUND":
      return { type: "not-found" };

    // forbidden (403)
    case "POSITION_FORBIDDEN":
      return { type: "forbidden" };

    // value-object / format 400s (defensive — ids come from prior API
    // responses, not user input). Bucketed into one `validation` failure.
    case "DEPARTMENT_INVALID_ID":
    case "DEPARTMENT_INVALID_NAME":
    case "DEPARTMENT_INVALID_CONCEPT_LABEL":
    case "POSITION_TITLE_INVALID_ID":
    case "POSITION_TITLE_INVALID_NAME":
    case "POSITION_ASSIGNMENT_INVALID_ID":
    case "POSITION_ASSIGNMENT_INVALID_MEMBER_ID":
    case "POSITION_ASSIGNMENT_INVALID_ACADEMIC_YEAR_ID":
    case "POSITION_ASSIGNMENT_INVALID_SCOPE_ENTITY_ID":
      return { type: "validation" };

    // Internal: bad tenant claim from JWT — not user-actionable.
    case "STAFFING_INVALID_TENANT_ID":
      return { type: "unknown" };

    default:
      break;
  }

  // Generic status fallbacks (branch on code first, status last).
  if (status === 403) return { type: "forbidden" };
  if (status === 404) return { type: "not-found" };

  // Retryable transport-class errors (decision 0008).
  if ((err as { retryable?: boolean })?.retryable) {
    return { type: "network-error" };
  }

  return { type: "unknown" };
}

export class StaffingRepository implements IStaffingRepository {
  constructor(private readonly http: AxiosInstance) {}

  // --- Derivation helpers (fields BE does not return on the wire) ---

  /**
   * Fully page through `GET /position-assignments?status=ACTIVE` (BE has no
   * `positionTitleId` filter, so counts must come from an unfiltered-by-title
   * bulk fetch). No failure mapping — callers sit inside their own try/catch.
   */
  private async fetchActiveAssignmentDtos(): Promise<
    PositionAssignmentResponseDto[]
  > {
    const out: PositionAssignmentResponseDto[] = [];
    let cursor: string | undefined;
    do {
      const env = (await this.http.get(STAFFING_EP.positionAssignments, {
        params: {
          status: "ACTIVE",
          ...(cursor ? { cursor } : {}),
          raw: true,
        },
      })) as unknown as ApiEnvelope<PositionAssignmentResponseDto[]>;
      const { data, pagination } = parseEnvelope(env);
      out.push(...data);
      cursor =
        pagination?.hasMore && pagination.nextCursor
          ? pagination.nextCursor
          : undefined;
    } while (cursor);
    return out;
  }

  /**
   * Two count maps derived from the active assignments: by `scopeEntityId` (for
   * departments — a department id won't collide with a subject-parent id) and by
   * `positionTitleId` (for titles).
   */
  private async fetchAssignmentCounts(): Promise<{
    byScopeEntity: Map<string, number>;
    byTitle: Map<string, number>;
  }> {
    const dtos = await this.fetchActiveAssignmentDtos();
    const byScopeEntity = new Map<string, number>();
    const byTitle = new Map<string, number>();
    for (const dto of dtos) {
      byScopeEntity.set(
        dto.scopeEntityId,
        (byScopeEntity.get(dto.scopeEntityId) ?? 0) + 1,
      );
      byTitle.set(
        dto.positionTitleId,
        (byTitle.get(dto.positionTitleId) ?? 0) + 1,
      );
    }
    return { byScopeEntity, byTitle };
  }

  /** id → title name map from the full position-titles list (for join). */
  private async fetchTitleNameMap(): Promise<Map<string, string>> {
    const env = (await this.http.get(STAFFING_EP.positionTitles, {
      params: { raw: true },
    })) as unknown as ApiEnvelope<PositionTitleResponseDto[]>;
    const { data } = parseEnvelope(env);
    return new Map(data.map((t) => [t.positionTitleId, t.name]));
  }

  // --- Departments ---

  async listDepartments(
    status?: DepartmentStatus,
  ): Promise<Result<Department[], StaffingFailure>> {
    try {
      const [envelope, counts] = await Promise.all([
        this.http.get(STAFFING_EP.departments, {
          params: { status, raw: true },
        }) as unknown as Promise<ApiEnvelope<DepartmentResponseDto[]>>,
        this.fetchAssignmentCounts(),
      ]);
      const { data } = parseEnvelope(envelope);
      return ok(
        data.map((dto) =>
          StaffingMapper.toDepartment(
            dto,
            counts.byScopeEntity.get(dto.departmentId) ?? 0,
          ),
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getDepartment(
    id: string,
  ): Promise<Result<Department, StaffingFailure>> {
    try {
      const [data, counts] = await Promise.all([
        this.http.get(
          STAFFING_EP.department(id),
        ) as unknown as Promise<DepartmentResponseDto>,
        this.fetchAssignmentCounts(),
      ]);
      return ok(
        StaffingMapper.toDepartment(
          data,
          counts.byScopeEntity.get(data.departmentId) ?? 0,
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createDepartment(
    input: CreateDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>> {
    try {
      const data = (await this.http.post(
        STAFFING_EP.departments,
        input,
      )) as unknown as DepartmentResponseDto;
      // A freshly-created department has no assignments yet.
      return ok(StaffingMapper.toDepartment(data, 0));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async patchDepartment(
    id: string,
    input: PatchDepartmentInput,
  ): Promise<Result<Department, StaffingFailure>> {
    try {
      const [data, counts] = await Promise.all([
        this.http.patch(
          STAFFING_EP.department(id),
          input,
        ) as unknown as Promise<DepartmentResponseDto>,
        this.fetchAssignmentCounts(),
      ]);
      return ok(
        StaffingMapper.toDepartment(
          data,
          counts.byScopeEntity.get(data.departmentId) ?? 0,
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archiveDepartment(id: string): Promise<Result<void, StaffingFailure>> {
    try {
      await this.http.post(STAFFING_EP.archiveDepartment(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  // --- Position Titles ---

  async listPositionTitles(filter?: {
    scopeType?: ScopeType;
    status?: PositionTitleStatus;
  }): Promise<Result<PositionTitle[], StaffingFailure>> {
    try {
      const [envelope, counts] = await Promise.all([
        this.http.get(STAFFING_EP.positionTitles, {
          params: { ...filter, raw: true },
        }) as unknown as Promise<ApiEnvelope<PositionTitleResponseDto[]>>,
        this.fetchAssignmentCounts(),
      ]);
      const { data } = parseEnvelope(envelope);
      return ok(
        data.map((dto) =>
          StaffingMapper.toPositionTitle(
            dto,
            counts.byTitle.get(dto.positionTitleId) ?? 0,
          ),
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getPositionTitle(
    id: string,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    try {
      const [data, counts] = await Promise.all([
        this.http.get(
          STAFFING_EP.positionTitle(id),
        ) as unknown as Promise<PositionTitleResponseDto>,
        this.fetchAssignmentCounts(),
      ]);
      return ok(
        StaffingMapper.toPositionTitle(
          data,
          counts.byTitle.get(data.positionTitleId) ?? 0,
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createPositionTitle(
    input: CreatePositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    try {
      const data = (await this.http.post(
        STAFFING_EP.positionTitles,
        input,
      )) as unknown as PositionTitleResponseDto;
      return ok(StaffingMapper.toPositionTitle(data, 0));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async patchPositionTitle(
    id: string,
    input: PatchPositionTitleInput,
  ): Promise<Result<PositionTitle, StaffingFailure>> {
    try {
      const [data, counts] = await Promise.all([
        this.http.patch(
          STAFFING_EP.positionTitle(id),
          input,
        ) as unknown as Promise<PositionTitleResponseDto>,
        this.fetchAssignmentCounts(),
      ]);
      return ok(
        StaffingMapper.toPositionTitle(
          data,
          counts.byTitle.get(data.positionTitleId) ?? 0,
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archivePositionTitle(
    id: string,
  ): Promise<Result<void, StaffingFailure>> {
    try {
      await this.http.post(STAFFING_EP.archivePositionTitle(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  // --- Position Assignments ---

  /**
   * Join `positionTitleName` from a title lookup. `memberName` has NO BE source
   * (IAM MemberResponse carries no name field, and there is no bulk/by-id user
   * lookup outside `/users/me`) → fall back to the raw `memberId` so the UI never
   * renders blank. Known cross-repo gap — see US-E18.2 §Cross-repo.
   */
  private toAssignment(
    dto: PositionAssignmentResponseDto,
    titleNames: Map<string, string>,
  ): PositionAssignment {
    return StaffingMapper.toPositionAssignment(dto, {
      memberName: dto.memberId,
      positionTitleName:
        titleNames.get(dto.positionTitleId) ?? dto.positionTitleId,
    });
  }

  async listAssignments(filter?: {
    memberId?: string;
    academicYearId?: string;
    status?: AssignmentStatus;
  }): Promise<Result<PositionAssignment[], StaffingFailure>> {
    try {
      // Domain status `REVOKED` maps to the wire's `ARCHIVED` on the way out.
      const wireStatus: AssignmentStatusDto | undefined = filter?.status
        ? filter.status === "REVOKED"
          ? "ARCHIVED"
          : "ACTIVE"
        : undefined;
      const [envelope, titleNames] = await Promise.all([
        this.http.get(STAFFING_EP.positionAssignments, {
          params: {
            memberId: filter?.memberId,
            academicYearId: filter?.academicYearId,
            status: wireStatus,
            raw: true,
          },
        }) as unknown as Promise<ApiEnvelope<PositionAssignmentResponseDto[]>>,
        this.fetchTitleNameMap(),
      ]);
      const { data } = parseEnvelope(envelope);
      return ok(data.map((dto) => this.toAssignment(dto, titleNames)));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getAssignment(
    id: string,
  ): Promise<Result<PositionAssignment, StaffingFailure>> {
    try {
      const [data, titleNames] = await Promise.all([
        this.http.get(
          STAFFING_EP.positionAssignment(id),
        ) as unknown as Promise<PositionAssignmentResponseDto>,
        this.fetchTitleNameMap(),
      ]);
      return ok(this.toAssignment(data, titleNames));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createAssignment(
    input: CreateAssignmentInput,
  ): Promise<Result<PositionAssignment, StaffingFailure>> {
    try {
      // BE requires `scopeEntityType`; it is fully determined by the selected
      // title's `scopeType` (BE enforces the pair matches). Look it up so the UI
      // needs no extra field. Reuse the fetched title's name for the join.
      const title = (await this.http.get(
        STAFFING_EP.positionTitle(input.positionTitleId),
      )) as unknown as PositionTitleResponseDto;
      const data = (await this.http.post(STAFFING_EP.positionAssignments, {
        positionTitleId: input.positionTitleId,
        memberId: input.memberId,
        scopeEntityType: title.scopeType,
        scopeEntityId: input.scopeEntityId,
        academicYearId: input.academicYearId,
      })) as unknown as PositionAssignmentResponseDto;
      return ok(
        StaffingMapper.toPositionAssignment(data, {
          memberName: data.memberId,
          positionTitleName: title.name,
        }),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async revokeAssignment(id: string): Promise<Result<void, StaffingFailure>> {
    try {
      await this.http.post(STAFFING_EP.revokeAssignment(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async copyAssignments(
    input: CopyAssignmentsInput,
  ): Promise<Result<CopyAssignmentsResult, StaffingFailure>> {
    try {
      const data = (await this.http.post(
        STAFFING_EP.copyAssignments,
        input,
      )) as unknown as CopyAssignmentsResultDto;
      return ok(StaffingMapper.toCopyResult(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}
