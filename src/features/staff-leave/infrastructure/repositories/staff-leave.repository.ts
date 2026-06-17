import "server-only";
import type { AxiosInstance } from "axios";
import { STAFF_LEAVE_EP } from "@/bootstrap/endpoint/staff-leave.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type {
  StaffLeaveRequestEntity,
  StaffLeaveStatus,
} from "../../domain/entities/staff-leave-request.entity";
import type { StaffLeaveFailure } from "../../domain/failures/staff-leave.failure";
import type {
  IStaffLeaveRepository,
  StaffLeaveActionResult,
  StaffLeaveResult,
} from "../../domain/repositories/i-staff-leave.repository";
import type { StaffLeaveResponseDto } from "../dtos/staff-leave-response.dto";
import { StaffLeaveMapper } from "../mappers/staff-leave.mapper";

/**
 * Map a normalised ApiError to the staff-leave failure union (US-E09.3).
 * Branch on error.code (UPPER_SNAKE) / status, never on message.
 */
export function toFailure(err: unknown): StaffLeaveFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "LEAVE_NOT_FOUND" || code === "NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (
    code === "LEAVE_ALREADY_DECIDED" ||
    code === "ALREADY_PROCESSED" ||
    status === 409
  ) {
    return { type: "already-processed" };
  }
  if (code === "MISSING_REJECT_REASON") {
    return { type: "missing-reject-reason" };
  }
  if (code === "REASON_TOO_SHORT") {
    return { type: "reason-too-short" };
  }
  return { type: "network-error" };
}

/**
 * Real `core` staff-leave repository (US-E09.3). The `core` service is not
 * shipped yet (mock-first, decision 0014) — DI selects the mock when USE_MOCK.
 * The HTTP interceptor unwraps the envelope; repos receive the payload directly.
 */
export class StaffLeaveRepository implements IStaffLeaveRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listRequests(filter?: {
    status?: StaffLeaveStatus;
  }): Promise<StaffLeaveResult<StaffLeaveRequestEntity[]>> {
    try {
      const dtos = (await this.http.get(STAFF_LEAVE_EP.list, {
        params: filter?.status ? { status: filter.status } : undefined,
      })) as unknown as StaffLeaveResponseDto[];
      return { ok: true, value: dtos.map(StaffLeaveMapper.toEntity) };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async approve(id: string): Promise<StaffLeaveActionResult> {
    try {
      await this.http.put(STAFF_LEAVE_EP.approve(id));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async reject(id: string, reason: string): Promise<StaffLeaveActionResult> {
    try {
      await this.http.put(STAFF_LEAVE_EP.reject(id), { reason });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
