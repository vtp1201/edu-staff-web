import "server-only";
import type { AxiosInstance } from "axios";
import { DISCIPLINE_EP } from "@/bootstrap/endpoint/discipline.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { ChildEntity } from "../../domain/entities/child.entity";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../../domain/entities/conduct-summary.entity";
import {
  assertCanDecideLeave,
  type DecideLeaveInput,
  type LeaveAttachmentEntity,
  type LeaveRequestEntity,
  type SubmitChildLeaveRequestInput,
  type SubmitLeaveRequestInput,
  type SubmitMyLeaveRequestInput,
} from "../../domain/entities/leave-request.entity";
import type {
  RecordViolationInput,
  ViolationEntity,
} from "../../domain/entities/violation.entity";
import type { DisciplineFailure } from "../../domain/failures/discipline.failure";
import type { IDisciplineRepository } from "../../domain/repositories/i-discipline.repository";
import type { LeaveRequestAttachmentResponseDto } from "../dtos/leave-request-attachment-response.dto";
import type { StudentLeaveRequestResponseDto } from "../dtos/student-leave-request-response.dto";
import { toLeaveAttachmentEntity } from "../mappers/leave-attachment.mapper";
import { toLeaveRequestEntity } from "../mappers/leave-request.mapper";

/**
 * Map a normalised ApiError to the discipline failure union (US-E09.1,
 * ground-truthed US-E18.14). Branch on error.code (UPPER_SNAKE) / status, never
 * on message.
 *
 * The specific `/core/api/v1/conduct/*` codes are ground-truthed against
 * `edu-api/services/core/internal/conduct/**` (`core/domain/error/*.go`,
 * `core/domain/service/approval_transition.go`,
 * `pkg/kit/response/error.go`'s `codeFromKey` — confirms decision `0008`
 * UPPER_SNAKE holds for `core`). The shared `ApprovalTransition` domain service
 * emits the `VIOLATION_*` transition codes for violations, conduct-grades, AND
 * leave alike (ADR 0073 — one state machine). Judgment calls made where no
 * distinct UX exists (documented inline). The trailing "legacy generic
 * fallbacks" block is kept for back-compat with the mock/pre-remap contract;
 * it is unreachable via the real API (the repository is force-mocked) but
 * harmless.
 */
export function toFailure(err: unknown): DisciplineFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }

  // --- ground-truthed core conduct matrix (US-E18.14) ---
  switch (code) {
    // student-violations
    case "VIOLATION_NOT_FOUND":
    // A malformed/invalid id references a record that is effectively
    // unreachable — surface it as not-found rather than a generic error.
    case "VIOLATION_INVALID_ID":
      return { type: "not-found" };
    case "VIOLATION_FORBIDDEN":
      return { type: "forbidden" };
    case "VIOLATION_SAME_ACTOR":
      return { type: "same-actor" };
    case "VIOLATION_INVALID_TRANSITION":
    // A state backstop is the same family as an illegal transition.
    case "VIOLATION_INVALID_STATE":
      return { type: "invalid-transition" };
    case "VIOLATION_REJECTION_REASON_REQUIRED":
      return { type: "missing-reject-reason" };
    case "VIOLATION_INVALID_SEVERITY":
      return { type: "invalid-severity" };
    // Generic create-input validation on a violation — description is the
    // required free-text field the form collects.
    case "VIOLATION_INVALID_INPUT":
      return { type: "missing-description" };

    // student-conduct-grades
    case "CONDUCT_GRADE_NOT_FOUND":
    // A missing term is still a "not found" to the user; no distinct UX need.
    case "CONDUCT_GRADE_TERM_NOT_FOUND":
      return { type: "not-found" };
    case "CONDUCT_GRADE_FORBIDDEN":
      return { type: "forbidden" };
    case "CONDUCT_GRADE_INVALID_GRADE":
      return { type: "invalid-conduct-grade" };
    // ADR 0074: re-setting a conduct grade after it is APPROVED is forbidden —
    // a genuinely new concept, distinct from leave's `already-processed`.
    case "CONDUCT_GRADE_LOCKED":
      return { type: "locked" };

    // student-leave-requests
    case "LEAVE_REQUEST_NOT_FOUND":
      return { type: "not-found" };
    case "LEAVE_REQUEST_FORBIDDEN":
      return { type: "forbidden" };
    case "LEAVE_REQUEST_INVALID_DATE_RANGE":
      return { type: "invalid-date" };
    // Input validation on the leave request is on the free-text reason field
    // (matches the staff-leave precedent, US-E18.8).
    case "LEAVE_REQUEST_INVALID_INPUT":
      return { type: "reason-too-short" };
    // A specific business rule (student not in this class), distinct from the
    // generic role/relationship `forbidden`.
    case "LEAVE_REQUEST_STUDENT_NOT_ENROLLED":
      return { type: "student-not-enrolled" };

    // --- student-leave-request attachments (core US-249, US-E24.6) ---
    // Three DISTINCT keys because the user's next action differs: pick another
    // file / remove one first / nothing can be attached any more.
    case "LEAVE_REQUEST_ATTACHMENT_INVALID_FILE":
      return { type: "attachment-invalid" };
    case "LEAVE_REQUEST_ATTACHMENT_LIMIT_EXCEEDED":
      return { type: "attachment-limit" };
    case "LEAVE_REQUEST_ATTACHMENT_LOCKED":
      return { type: "attachment-locked" };
    // Object storage is unconfigured or transiently unreachable — retryable,
    // and the request itself already exists, so this is a transport-shaped
    // failure, not a rejection of the file.
    case "LEAVE_REQUEST_ATTACHMENT_STORAGE_UNAVAILABLE":
      return { type: "network-error" };
  }

  // A server-declared retryable error is transport-shaped whatever its code —
  // `.claude/rules/api-integration.md`: only `retryable === true` may be
  // retried, and `network-error` is the only key whose UI offers a retry.
  if (err instanceof Error && "retryable" in err && err.retryable === true) {
    return { type: "network-error" };
  }

  // --- legacy generic fallbacks (pre-remap mock contract, kept for back-compat) ---
  if (code === "STUDENT_NOT_FOUND" || code === "MISSING_STUDENT") {
    return { type: "missing-student" };
  }
  if (code === "MISSING_DESCRIPTION") {
    return { type: "missing-description" };
  }
  if (code === "MISSING_REJECT_REASON") {
    return { type: "missing-reject-reason" };
  }
  if (
    code === "LEAVE_ALREADY_DECIDED" ||
    code === "ALREADY_PROCESSED" ||
    status === 409
  ) {
    return { type: "already-processed" };
  }
  if (code === "INVALID_SEVERITY") {
    return { type: "invalid-severity" };
  }
  if (code === "INVALID_CONDUCT_GRADE") {
    return { type: "invalid-conduct-grade" };
  }
  if (code === "FORBIDDEN" || status === 403) {
    return { type: "forbidden" };
  }
  if (code === "CHILD_NOT_FOUND" || code === "NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "INVALID_CHILD") {
    return { type: "invalid-child" };
  }
  if (code === "CONFLICT") {
    return { type: "conflict" };
  }
  return { type: "network-error" };
}

/**
 * Real `core` conduct repository (US-E09.1, remapped US-E18.14, PARTIALLY
 * un-force-mocked US-E24.11 then US-E24.6).
 *
 * **Three MORE methods are real since US-E24.6** — `submitMyLeaveRequest`,
 * `getLeaveRequestsForAttendance`, `uploadLeaveAttachment` (the attendance
 * portal's self-service leave flow, core US-249). Blocker (1) does not apply:
 * the caller addresses THEMSELF by the `memberId` claim, or a linked child
 * whose id the parent already holds. Blocker (2) is closed by
 * `resolveMyClassId()` (US-E24.1) for a student and by
 * `ChildAttendanceRecord.classId` for a parent. `discipline.di.ts` gates them
 * on `USE_MOCK` through `makeSubmitLeaveRepo()`.
 *
 * **Three methods are real since US-E24.11** — `getLeaveRequests`,
 * `approveLeave`, `rejectLeave`. The GVCN homeroom inbox
 * (`GET /student-leave-requests?classId=`) is the one conduct surface both
 * blockers below miss: it needs no roster UUID (core returns the student ids
 * itself, and IAM's batch directory resolves the names) and no self-scope
 * discovery (the caller is a TEACHER who already knows the `classId` of the
 * class hub they are standing in). `discipline.di.ts` therefore gates ONLY
 * those three on `USE_MOCK`; every other factory in that file still force-mocks.
 *
 * Everything below this line still applies to EVERY OTHER method:
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** — `discipline.di.ts`
 * always constructs `MockDisciplineRepository`. Ground-truthed against
 * `edu-api/services/core/internal/conduct/**`, this whole feature cannot be
 * wired real — not a subset, EVERY operation — because two independent,
 * categorical blockers compound (each already logged once in the epic):
 *
 * 1. **No real student-roster UUID lookup.** Every real endpoint keys on a
 *    real `studentMemberId` (IAM/core UUID). The web roster is permanently
 *    mock-first (US-E18.5 / ask #9 — `EnrollmentResponse` has no display
 *    fields, no `/students/unassigned`). Any admin/teacher-authored record
 *    (`recordViolation`, the real equivalent of `overrideConductGrade`) would
 *    have to address a student by a UUID the web has no way to resolve —
 *    same reasoning that force-mocked `staff-leave` (US-E18.8) and
 *    `class-management.listTeachers` (US-E18.4).
 * 2. **No self-scope `classId` discovery for STUDENT or PARENT (ask #15 / #22).**
 *    Every conduct list use-case requires `classId` — even the STUDENT's
 *    own-record-only branch (`ownOnly` filters a class-scoped page, it does not
 *    drop the `classId` requirement) — and `POST /student-leave-requests`
 *    requires `classId` as a mandatory body field even for self-submit. There
 *    is no `GET /members/{id}/enrollment`-equivalent a STUDENT/PARENT can call,
 *    so even self-service (`getMy*`, `submitLeaveRequest`) — the one category
 *    not blocked by the roster gap — is independently blocked.
 *
 * See `docs/stories/epics/E18-be-wiring/US-E18.14-discipline-conduct-wiring/story.md`.
 * Every OTHER method is therefore a permanent blocked stub: it throws the
 * documented failure WITHOUT ever calling `http.*` (mirrors
 * `StaffLeaveRepository`, US-E18.8, and `ClassManagementRepository.listTeachers`,
 * US-E18.4). `toFailure` above is kept correct + unit-tested for the day this
 * unblocks; `DISCIPLINE_EP` is remapped to the real paths for the same reason.
 */
export class DisciplineRepository implements IDisciplineRepository {
  constructor(
    private readonly http: AxiosInstance,
    /** Batched IAM display-name lookup — core's conduct rows carry no names. */
    private readonly resolveNames?: (
      memberIds: string[],
    ) => Promise<Map<string, string>>,
  ) {}

  /**
   * The single blocked exit for every unwireable method. Throws a documented
   * failure — `not-found` reads as "this record is not reachable" on every
   * surface — so a stub can never silently reach the (unwireable) real API.
   * Returns `never`.
   */
  private blocked(): never {
    throw { type: "not-found" } satisfies DisciplineFailure;
  }

  async getViolations(_params: {
    classId?: string;
    semester?: string;
  }): Promise<ViolationEntity[]> {
    return this.blocked();
  }

  async recordViolation(
    _input: RecordViolationInput,
  ): Promise<ViolationEntity> {
    return this.blocked();
  }

  async deleteViolation(_id: string): Promise<void> {
    return this.blocked();
  }

  async getConductSummary(_params: {
    classId?: string;
    semester?: string;
  }): Promise<ConductSummaryEntity[]> {
    return this.blocked();
  }

  async overrideConductGrade(
    _studentId: string,
    _grade: ConductGrade,
    _note: string,
  ): Promise<ConductSummaryEntity> {
    return this.blocked();
  }

  /* ── REAL since US-E24.11 — GVCN homeroom leave inbox ──────────────────── */

  /**
   * `GET /student-leave-requests?classId=` — the GVCN homeroom inbox, already
   * server-filtered to `SUBMITTED` for a teacher caller (no client-side state
   * filter needed, unlike violations).
   *
   * `classId` is NOT optional on the real wire: core requires EXACTLY ONE of
   * `classId` / `studentMemberId` (`400 LEAVE_REQUEST_INVALID_INPUT`
   * otherwise). The interface keeps it optional because the legacy multi-class
   * dashboards call `execute({})`; rather than guessing a class or draining
   * every class, that call is refused HERE, before any HTTP, with the same
   * documented `not-found` a blocked stub throws. Fixing those dashboards to
   * iterate the teacher's own homeroom class ids is a separate, logged
   * follow-up — this method never guesses on their behalf.
   */
  async getLeaveRequests(params: {
    classId?: string;
  }): Promise<LeaveRequestEntity[]> {
    if (!params.classId) return this.blocked();
    try {
      const dtos = await this.fetchAllPages<StudentLeaveRequestResponseDto>(
        DISCIPLINE_EP.leaveRequests,
        { classId: params.classId },
      );
      const names = await this.resolveMemberNames(dtos);
      return dtos.map((dto) => toLeaveRequestEntity(dto, names));
    } catch (err) {
      throw toFailure(err);
    }
  }

  async approveLeave(input: DecideLeaveInput): Promise<LeaveRequestEntity> {
    assertCanDecideLeave(input);
    return this.decide(
      DISCIPLINE_EP.approveLeave(input.id),
      input.studentMemberId,
      undefined,
    );
  }

  async rejectLeave(
    input: DecideLeaveInput & { reason: string },
  ): Promise<LeaveRequestEntity> {
    assertCanDecideLeave(input);
    return this.decide(
      DISCIPLINE_EP.rejectLeave(input.id),
      input.studentMemberId,
      { rejectionReason: input.reason },
    );
  }

  /**
   * The two decision routes are identical apart from the body:
   * `POST .../{id}/(approve|reject)?studentMemberId=` → the updated record.
   * `studentMemberId` completes core's `(tenantId, studentMemberId)` partition
   * key and is a REQUIRED query param, not a filter.
   */
  private async decide(
    url: string,
    studentMemberId: string,
    body: { rejectionReason: string } | undefined,
  ): Promise<LeaveRequestEntity> {
    try {
      const dto = (await this.http.post(url, body ?? {}, {
        params: { studentMemberId },
      })) as unknown as StudentLeaveRequestResponseDto;
      const names = await this.resolveMemberNames([dto]);
      return toLeaveRequestEntity(dto, names);
    } catch (err) {
      throw toFailure(err);
    }
  }

  /* ── REAL since US-E24.6 — self-service leave (STUDENT / linked PARENT) ── */

  /**
   * `POST /student-leave-requests` — the real create contract.
   *
   * Neither US-E18.14 blocker applies here, which is why this method is real
   * while `submitLeaveRequest` (the legacy shape) stays a blocked stub:
   * `studentMemberId` is the caller's OWN `memberId` claim (STUDENT) or a
   * linked child's id the parent already holds (PARENT) — no roster UUID
   * lookup — and `classId` now has a discovery path (`resolveMyClassId()` for
   * a student, the child's own attendance rows for a parent, US-E24.6 Q3).
   *
   * SECURITY: this method does not — and must not — decide WHOSE request this
   * is. It sends what the use-case was given; the caller is responsible for
   * that id coming from the token claim on the self-submit path, and core
   * authorises the pair regardless (`403 LEAVE_REQUEST_FORBIDDEN`).
   */
  async submitMyLeaveRequest(
    input: SubmitMyLeaveRequestInput,
  ): Promise<LeaveRequestEntity> {
    try {
      // The body is written out FIELD BY FIELD rather than spread: core's
      // `CreateStudentLeaveRequestRequest` has exactly five properties, and a
      // spread would silently forward any extra key a future caller adds.
      const dto = (await this.http.post(DISCIPLINE_EP.submitLeaveRequest, {
        studentMemberId: input.studentMemberId,
        classId: input.classId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
      })) as unknown as StudentLeaveRequestResponseDto;
      const names = await this.resolveMemberNames([dto]);
      return toLeaveRequestEntity(dto, names);
    } catch (err) {
      throw toFailure(err);
    }
  }

  /**
   * `GET /student-leave-requests?studentMemberId=` — ONE student's requests,
   * used to annotate the absence history. Core requires EXACTLY ONE of
   * `classId` / `studentMemberId`, so this never sends both.
   */
  async getLeaveRequestsForAttendance(
    studentMemberId: string,
  ): Promise<LeaveRequestEntity[]> {
    try {
      const dtos = await this.fetchAllPages<StudentLeaveRequestResponseDto>(
        DISCIPLINE_EP.leaveRequests,
        { studentMemberId },
      );
      const names = await this.resolveMemberNames(dtos);
      return dtos.map((dto) => toLeaveRequestEntity(dto, names));
    } catch (err) {
      throw toFailure(err);
    }
  }

  /**
   * `POST /{requestId}/attachments?studentMemberId=` — ONE file per call
   * (core US-249). The caller loops; batching is not offered by the API.
   *
   * `FormData` + an explicit `multipart/form-data` header: the boundary is
   * filled in by the runtime. `File`/`FormData` are Web-standard globals in the
   * Node/edge server runtime, so nothing here is browser-only — the file
   * crosses the client↔server boundary as part of a Server Action's FormData
   * and is uploaded from the server, never from the browser.
   */
  async uploadLeaveAttachment(
    requestId: string,
    studentMemberId: string,
    file: File,
  ): Promise<LeaveAttachmentEntity> {
    try {
      const body = new FormData();
      body.append("file", file);
      const dto = (await this.http.post(
        DISCIPLINE_EP.leaveAttachments(requestId),
        body,
        {
          params: { studentMemberId },
          headers: { "Content-Type": "multipart/form-data" },
        },
      )) as unknown as LeaveRequestAttachmentResponseDto;
      return toLeaveAttachmentEntity(dto);
    } catch (err) {
      throw toFailure(err);
    }
  }

  /** ONE batched directory call for every member id the rows reference
   *  (student + submitter + approver together, never three round-trips). A
   *  failed lookup yields an empty map: the mapper then falls back to the raw
   *  id, so a missing NAME never costs the GVCN the whole inbox. */
  private async resolveMemberNames(
    dtos: StudentLeaveRequestResponseDto[],
  ): Promise<Map<string, string>> {
    if (!this.resolveNames || dtos.length === 0) return new Map();
    const ids = new Set<string>();
    for (const dto of dtos) {
      ids.add(dto.studentMemberId);
      ids.add(dto.submittedByMemberId);
      if (dto.approverMemberId) ids.add(dto.approverMemberId);
    }
    try {
      return await this.resolveNames([...ids]);
    } catch {
      return new Map();
    }
  }

  /** Drain a cursor-paginated conduct list into a single array. */
  private async fetchAllPages<T>(
    url: string,
    query: Record<string, unknown>,
  ): Promise<T[]> {
    const all: T[] = [];
    let cursor: string | undefined;
    do {
      const env = (await this.http.get(url, {
        params: { limit: 100, ...query, ...(cursor ? { cursor } : {}) },
        raw: true,
      })) as unknown as ApiEnvelope<T[]>;
      const { data, pagination } = parseEnvelope(env);
      all.push(...(data ?? []));
      cursor = pagination?.hasMore
        ? (pagination.nextCursor ?? undefined)
        : undefined;
    } while (cursor);
    return all;
  }

  // --- Student / parent self-service (US-E09.2) ---

  async getMyConductSummary(
    _studentId: string,
    _semester?: string,
  ): Promise<ConductSummaryEntity> {
    return this.blocked();
  }

  async getMyViolations(_studentId: string): Promise<ViolationEntity[]> {
    return this.blocked();
  }

  async getMyLeaveRequests(_studentId: string): Promise<LeaveRequestEntity[]> {
    return this.blocked();
  }

  async submitLeaveRequest(
    _input: SubmitLeaveRequestInput,
  ): Promise<LeaveRequestEntity> {
    return this.blocked();
  }

  // --- Parent multi-child view (US-E09.4) ---

  async getChildren(): Promise<ChildEntity[]> {
    return this.blocked();
  }

  async getChildConductSummary(
    _childId: string,
  ): Promise<ConductSummaryEntity> {
    return this.blocked();
  }

  async getChildViolations(_childId: string): Promise<ViolationEntity[]> {
    return this.blocked();
  }

  async getChildLeaveRequests(_childId: string): Promise<LeaveRequestEntity[]> {
    return this.blocked();
  }

  async submitLeaveForChild(
    _childId: string,
    _input: SubmitChildLeaveRequestInput,
  ): Promise<LeaveRequestEntity> {
    return this.blocked();
  }
}
