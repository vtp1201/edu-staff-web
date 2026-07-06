import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  ClassOption,
  InitiateUnsealInput,
  SealAuditEntry,
  SealBatchKey,
  SealBatchStatus,
  SealedStudentOption,
  TenantAdminSummary,
  Term,
  UnsealRequest,
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

  async getSealStatus(key: SealBatchKey): Promise<SealResult<SealBatchStatus>> {
    await mockDelay(200);
    const match = this.batches.find((b) => keyOf(b) === keyOf(key));
    if (!match) return { ok: false, error: { type: "not-found" } };
    return { ok: true, data: structuredClone(match) };
  }

  async sealBatch(
    key: SealBatchKey,
    actorId: string,
  ): Promise<SealResult<SealBatchStatus>> {
    await mockDelay(300);
    const match = this.batches.find((b) => keyOf(b) === keyOf(key));
    if (!match) return { ok: false, error: { type: "not-found" } };
    if (!match.allLocked) {
      return { ok: false, error: { type: "not-all-locked" } };
    }
    if (match.status === "SEALED") {
      return { ok: false, error: { type: "already-sealed" } };
    }
    const now = new Date().toISOString();
    const actorName = this.adminName(actorId);
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
    return { ok: true, data: structuredClone(match) };
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

  async getPendingUnsealRequests(): Promise<SealResult<UnsealRequest[]>> {
    await mockDelay(200);
    const data = this.requests
      .filter((r) => r.status === "PENDING")
      .map((r) => structuredClone(r));
    return { ok: true, data };
  }

  async initiateUnseal(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealRequest>> {
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
    return { ok: true, data: structuredClone(request) };
  }

  async confirmUnseal(
    requestId: string,
    coSignerId: string | null,
  ): Promise<SealResult<{ request: UnsealRequest; fallback: boolean }>> {
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
      data: { request: structuredClone(request), fallback },
    };
  }

  async listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>> {
    await mockDelay(150);
    return { ok: true, data: [...this.admins] };
  }
}
