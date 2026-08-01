import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  ClassOption,
  InitiateUnsealInput,
  SealAuditEntry,
  SealBatchKey,
  SealBatchResult,
  SealBatchStatus,
  SealedStudentOption,
  SealRollupStatus,
  SealStatusRollup,
  TenantAdminSummary,
  Term,
  UnsealApproveResult,
  UnsealInitiateResult,
  UnsealRequest,
  UnsealRequestStatus,
  UnsealRequestSummary,
} from "../../../domain/entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../../../domain/repositories/i-academic-records-seal.repository";
import {
  MOCK_CLASS_OPTIONS,
  MOCK_SEAL_AUDIT_TRAIL_SEED,
  MOCK_SEAL_BATCHES,
  MOCK_SEALED_STUDENTS,
  MOCK_TENANT_ADMINS,
  MOCK_UNSEAL_REQUESTS,
} from "./seal-fixtures";

const keyOf = (k: { classId: string; term: Term; year: string }): string =>
  `${k.classId}|${k.term}|${k.year}`;

/** Matches the real listing endpoint's documented default page size. */
const DEFAULT_UNSEAL_PAGE_LIMIT = 20;

export interface MockAcademicRecordsSealOptions {
  /** Number of tenant admins to surface — pass `1` to exercise the ADR-0037
   *  single-admin self-approve fallback (AC-8) deterministically. */
  adminCount?: number;
}

/**
 * In-memory US-E14.6 seal/unseal repository (mock-first, decision 0014). Holds
 * per-instance state cloned from `seal-fixtures.ts`; the DI factory builds one
 * per request so mutations never leak across requests.
 */
export class MockAcademicRecordsSealRepository
  implements IAcademicRecordsSealRepository
{
  private batches: SealBatchStatus[];
  private requests: UnsealRequest[];
  private audit: SealAuditEntry[];
  private readonly admins: TenantAdminSummary[];

  constructor(options: MockAcademicRecordsSealOptions = {}) {
    this.batches = structuredClone(MOCK_SEAL_BATCHES);
    this.requests = structuredClone(MOCK_UNSEAL_REQUESTS);
    this.audit = structuredClone(MOCK_SEAL_AUDIT_TRAIL_SEED);
    const count = options.adminCount ?? MOCK_TENANT_ADMINS.length;
    this.admins = MOCK_TENANT_ADMINS.slice(0, Math.max(1, count));
  }

  private adminName(id: string): string {
    return this.admins.find((a) => a.id === id)?.name ?? id;
  }

  async listAvailableClasses(filter: {
    term: Term;
    year: string;
  }): Promise<SealResult<ClassOption[]>> {
    await mockDelay(150);
    const classIds = new Set(
      this.batches
        .filter((b) => b.term === filter.term && b.year === filter.year)
        .map((b) => b.classId),
    );
    const data = MOCK_CLASS_OPTIONS.filter((c) => classIds.has(c.classId));
    return { ok: true, data };
  }

  /**
   * US-E18.24 — maps the mock's INTERNAL, decorative `SealBatchStatus` onto the
   * boundary-narrow {@link SealStatusRollup} the real BE actually returns
   * ("internal-rich, boundary-narrow"). The rollup `status` is DERIVED via the
   * contract's truth table — never copied from the per-record `TermStatus`
   * (which has an `UNSEALED` member the rollup enum does not).
   *
   * Documented simplification: the mock tracks a single `sealedAt` timestamp
   * per batch, so `lastSealedAt` is that value; the real BE reports the max
   * `sealedAt` across rows INCLUDING unsealed ones. Both keep a non-null
   * timestamp after an unseal, which is the property the UI depends on to tell
   * "never sealed" apart from "sealed then fully unsealed".
   */
  async getSealStatus(
    key: SealBatchKey,
  ): Promise<SealResult<SealStatusRollup>> {
    await mockDelay(200);
    const match = this.batches.find((b) => keyOf(b) === keyOf(key));
    if (!match) return { ok: false, error: { type: "not-found" } };

    const sealedCount = match.status === "SEALED" ? match.totalStudents : 0;
    const unsealedCount = match.totalStudents - sealedCount;
    const status: SealRollupStatus =
      match.totalStudents === 0 || sealedCount === 0
        ? "PENDING"
        : sealedCount === match.totalStudents
          ? "SEALED"
          : "PARTIAL";

    return {
      ok: true,
      data: {
        classId: match.classId,
        term: match.term,
        year: match.year,
        totalStudents: match.totalStudents,
        sealedCount,
        unsealedCount,
        status,
        lastSealedAt: match.sealedAt,
        resealCount: match.resealCount ?? 0,
      },
    };
  }

  /**
   * US-E18.13 (ADR 0055) — models the REAL, reactive, idempotent seal contract:
   *  - no `already-sealed` block — reseal is allowed (idempotent);
   *  - `!allLocked` → reactive `unlocked-grades-exist` (the server-side check);
   *  - `resealCount` cap at 5 → `too-many-reseals`;
   *  - returns a `SealBatchResult` (`{sealedCount, failedCount, errors}`), and
   *    still updates status/sealedAt/sealedBy/audit so the decorative
   *    `getSealStatus` hint stays coherent for the mock/demo experience.
   */
  async sealBatch(
    key: SealBatchKey,
    actorId: string,
  ): Promise<SealResult<SealBatchResult>> {
    await mockDelay(300);
    const match = this.batches.find((b) => keyOf(b) === keyOf(key));
    if (!match) return { ok: false, error: { type: "not-found" } };
    if (!match.allLocked) {
      return { ok: false, error: { type: "unlocked-grades-exist" } };
    }
    const resealCount = match.resealCount ?? 0;
    if (resealCount >= 5) {
      return { ok: false, error: { type: "too-many-reseals" } };
    }
    const now = new Date().toISOString();
    const actorName = this.adminName(actorId);
    match.resealCount = resealCount + 1;
    match.status = "SEALED";
    match.sealedAt = now;
    match.sealedBy = actorName;
    this.audit.push({
      id: `au-${Date.now()}`,
      classId: match.classId,
      term: match.term,
      year: match.year,
      actorName,
      action: "SEAL",
      occurredAt: now,
    });
    return {
      ok: true,
      data: {
        sealedCount: match.totalStudents,
        failedCount: 0,
        errors: [],
      },
    };
  }

  async getSealAuditTrail(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealAuditEntry[]>> {
    await mockDelay(150);
    let data = [...this.audit];
    if (filter?.classId)
      data = data.filter((e) => e.classId === filter.classId);
    if (filter?.term) data = data.filter((e) => e.term === filter.term);
    if (filter?.year) data = data.filter((e) => e.year === filter.year);
    // reverse-chronological (newest first)
    data.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return { ok: true, data };
  }

  async listSealedStudents(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealedStudentOption[]>> {
    await mockDelay(150);
    let data = [...MOCK_SEALED_STUDENTS];
    if (filter?.classId)
      data = data.filter((s) => s.classId === filter.classId);
    if (filter?.term) data = data.filter((s) => s.term === filter.term);
    if (filter?.year) data = data.filter((s) => s.year === filter.year);
    return { ok: true, data };
  }

  /**
   * US-E18.24 — class+term-scoped, status-filtered, cursor-paginated, matching
   * the real listing contract. `term` doubles as the termId path segment (the
   * selector is mock-sourced; see the real repo's term/termId caveat). The
   * cursor is a plain array index encoded as a string — opaque to callers,
   * exactly like the real opaque cursor.
   *
   * No name resolver is needed here: the mock's internal `UnsealRequest`
   * fixtures already carry inline display names (the real branch resolves them
   * via the injected IAM batch lookup instead).
   */
  async getPendingUnsealRequests(
    classId: string,
    termId: string,
    opts?: {
      status?: UnsealRequestStatus;
      cursor?: string | null;
      limit?: number;
    },
  ): Promise<
    SealResult<{
      items: UnsealRequestSummary[];
      nextCursor: string | null;
      hasMore: boolean;
    }>
  > {
    await mockDelay(200);
    const status = opts?.status ?? "PENDING";
    const limit = opts?.limit ?? DEFAULT_UNSEAL_PAGE_LIMIT;
    const offset = Number.parseInt(opts?.cursor ?? "0", 10) || 0;

    const matching = this.requests.filter(
      (r) => r.classId === classId && r.term === termId && r.status === status,
    );
    const page = matching.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const hasMore = nextOffset < matching.length;

    return {
      ok: true,
      data: {
        items: page.map(
          (r): UnsealRequestSummary => ({
            requestId: r.id,
            classId: r.classId,
            termId: r.term,
            studentMemberId: r.studentId,
            studentName: r.studentName,
            requestedBy: r.requestedById,
            requestedByName: r.requestedByName,
            reason: r.reason,
            status: r.status,
            createdAt: r.requestedAt,
          }),
        ),
        nextCursor: hasMore ? String(nextOffset) : null,
        hasMore,
      },
    };
  }

  /** Internal state stays rich; the RETURN is the narrow wire shape. */
  async initiateUnseal(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealInitiateResult>> {
    await mockDelay(300);
    const batch = this.batches.find(
      (b) =>
        keyOf(b) ===
        keyOf({ classId: input.classId, term: input.term, year: input.year }),
    );
    // Target must have been sealed at least once (SEALED or UNSEALED).
    if (!batch || batch.status === "PENDING") {
      return { ok: false, error: { type: "not-sealed" } };
    }
    const student = MOCK_SEALED_STUDENTS.find(
      (s) => s.studentId === input.studentId,
    );
    const now = new Date().toISOString();
    const request: UnsealRequest = {
      id: `ur-${Date.now()}`,
      studentId: input.studentId,
      studentName: student?.studentName ?? input.studentId,
      classId: input.classId,
      term: input.term,
      year: input.year,
      reason: input.reason.trim(),
      requestedById: input.initiatorId,
      requestedByName: this.adminName(input.initiatorId),
      requestedAt: now,
      status: "PENDING",
      coSignerId: null,
      coSignerName: null,
      confirmedAt: null,
      selfApproved: false,
    };
    this.requests.unshift(request);
    return {
      ok: true,
      data: {
        requestId: request.id,
        status: "PENDING",
        createdAt: request.requestedAt,
      },
    };
  }

  /**
   * `classId`/`termId` are accepted to satisfy the interface but are NOT needed
   * for the mock's own lookup — it scans its internal `requests` by id, exactly
   * as the real approve endpoint addresses the request by path param alone.
   */
  async confirmUnseal(
    requestId: string,
    coSignerId: string | null,
    _classId: string,
    _termId: string,
  ): Promise<SealResult<UnsealApproveResult>> {
    await mockDelay(300);
    const request = this.requests.find(
      (r) => r.id === requestId && r.status === "PENDING",
    );
    if (!request) return { ok: false, error: { type: "no-pending-request" } };

    const fallback = coSignerId === null;
    const now = new Date().toISOString();
    request.status = "APPROVED";
    request.confirmedAt = now;
    request.selfApproved = fallback;
    request.coSignerId = coSignerId;
    request.coSignerName = coSignerId ? this.adminName(coSignerId) : null;

    // Flip the underlying batch back to UNSEALED so the seal badge reflects it.
    const batch = this.batches.find(
      (b) =>
        keyOf(b) ===
        keyOf({
          classId: request.classId,
          term: request.term,
          year: request.year,
        }),
    );
    if (batch) batch.status = "UNSEALED";

    this.audit.push({
      id: `au-${Date.now()}`,
      classId: request.classId,
      term: request.term,
      year: request.year,
      actorName: fallback
        ? request.requestedByName
        : (request.coSignerName ?? request.requestedByName),
      action: "UNSEAL",
      occurredAt: now,
    });

    return {
      ok: true,
      data: {
        classId: request.classId,
        termId: request.term,
        studentMemberId: request.studentId,
        status: "UNSEALED",
        selfApproved: fallback,
        unsealedAt: now,
      },
    };
  }

  async listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>> {
    await mockDelay(150);
    return { ok: true, data: [...this.admins] };
  }
}
