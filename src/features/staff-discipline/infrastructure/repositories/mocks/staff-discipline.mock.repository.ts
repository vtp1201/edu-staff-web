import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import {
  type SetStaffConductNoteInput,
  STAFF_CONDUCT_RATINGS,
  type StaffConductNoteEntity,
} from "../../../domain/entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../../../domain/entities/staff-discipline-auth-context.entity";
import type { StaffRosterEntry } from "../../../domain/entities/staff-roster.entity";
import {
  type CreateStaffViolationInput,
  type RejectStaffViolationInput,
  STAFF_VIOLATION_SEVERITIES,
  type StaffViolationEntity,
} from "../../../domain/entities/staff-violation.entity";
import type { StaffDisciplineFailure } from "../../../domain/failures/staff-discipline.failure";
import type { IStaffDisciplineRepository } from "../../../domain/repositories/i-staff-discipline.repository";
import type { StaffConductNoteResponseDto } from "../../dtos/staff-conduct-note-response.dto";
import type { StaffViolationResponseDto } from "../../dtos/staff-violation-response.dto";
import {
  toStaffConductNoteEntity,
  toStaffViolationEntity,
} from "../../mappers/staff-discipline.mapper";
import {
  SD_STAFF_ROSTER,
  SD_TERM_IDS,
  seedStaffConductNotes,
  seedStaffViolations,
} from "./fixtures";

/**
 * In-memory `IStaffDisciplineRepository` (US-E09.5) — and, while this feature is
 * permanently mock-first (roster-UUID gap), **the authorization boundary itself**
 * (spec.md §"High-Risk-Grade Security Enforcement" pt. 6).
 *
 * Hard rules implemented here, each with a dedicated test in
 * `staff-discipline.mock.repository.security.test.ts`:
 *  - NFR-008: every mutating method checks `authCtx.role === "principal"` FIRST
 *    and throws `{ type: "forbidden" }` BEFORE touching (or even reading) state —
 *    so a forged role can neither write nor learn whether a record exists.
 *  - NFR-008 pt.3: `teacher` list calls are FORCED to the caller's own
 *    `staffMemberId`, ignoring any client-supplied param (never client-filtered);
 *    roles that own neither view are denied outright.
 *  - NFR-009 / ADR 0074: `setStaffConductNote` on an APPROVED record throws
 *    `{ type: "locked" }` (409) regardless of the client pre-check.
 *
 * State is per-instance (fresh on each `new`) and deterministic — no random ids,
 * no `Date.now()` in any asserted field except `updatedAt`.
 */
export class MockStaffDisciplineRepository
  implements IStaffDisciplineRepository
{
  private violations: StaffViolationResponseDto[] = seedStaffViolations();
  private conductNotes: StaffConductNoteResponseDto[] = seedStaffConductNotes();
  private createdCount = 0;
  private readonly roster: readonly StaffRosterEntry[] = SD_STAFF_ROSTER;

  // --- Authorization helpers (the NFR-008 boundary) -------------------------

  /** Mutating gate: only `principal` may write. Throws before any state read. */
  private assertCanMutate(authCtx: StaffDisciplineAuthContext): void {
    if (authCtx.role !== "principal") throw failure({ type: "forbidden" });
  }

  /**
   * Read gate + server-forced scope. `principal` sees everything (optionally
   * filtered); `teacher` is pinned to their own `staffMemberId` whatever the
   * client asked for; any other role is denied.
   */
  private resolveReadScope(
    requested: string | undefined,
    authCtx: StaffDisciplineAuthContext,
  ): string | undefined {
    if (authCtx.role === "principal") return requested;
    if (authCtx.role === "teacher") return authCtx.staffMemberId;
    throw failure({ type: "forbidden" });
  }

  // --- Violations -----------------------------------------------------------

  async listStaffViolations(
    params: { staffMemberId?: string },
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity[]> {
    const scope = this.resolveReadScope(params.staffMemberId, authCtx);
    await mockDelay();
    return this.violations
      .filter((v) => (scope ? v.staffMemberId === scope : true))
      .map((v) => toStaffViolationEntity(v, this.roster));
  }

  async createStaffViolation(
    input: CreateStaffViolationInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    this.assertCanMutate(authCtx);
    if (!STAFF_VIOLATION_SEVERITIES.includes(input.severity)) {
      throw failure({ type: "invalid-severity" });
    }
    if (!this.roster.some((r) => r.staffMemberId === input.staffMemberId)) {
      // VIOLATION_INVALID_ID — unknown staff member (E3).
      throw failure({ type: "not-found" });
    }
    if (input.description.trim().length === 0) {
      throw failure({
        type: "validation",
        fields: [{ field: "description", reason: "required" }],
      });
    }

    this.createdCount += 1;
    const now = nowIso();
    const dto: StaffViolationResponseDto = {
      recordId: `sv-new-${this.createdCount}`,
      staffMemberId: input.staffMemberId,
      category: input.category,
      description: input.description,
      severity: input.severity,
      occurredAt: input.occurredAt,
      state: "DRAFT",
      authorMemberId: authCtx.memberId,
      createdAt: now,
      updatedAt: now,
    };
    this.violations = [dto, ...this.violations];
    return toStaffViolationEntity(dto, this.roster);
  }

  async submitStaffViolation(
    recordId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    this.assertCanMutate(authCtx);
    const dto = this.findViolation(recordId);
    // Own-authored only (AC-003.2 server backstop).
    if (dto.authorMemberId !== authCtx.memberId) {
      throw failure({ type: "forbidden" });
    }
    if (dto.state !== "DRAFT") throw failure({ type: "invalid-transition" });

    dto.state = "SUBMITTED";
    dto.updatedAt = nowIso();
    return toStaffViolationEntity(dto, this.roster);
  }

  async approveStaffViolation(
    recordId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    this.assertCanMutate(authCtx);
    const dto = this.findViolation(recordId);
    if (dto.state !== "SUBMITTED") throw failure({ type: "already-processed" });

    dto.state = "APPROVED";
    dto.approverMemberId = authCtx.memberId;
    dto.updatedAt = nowIso();
    return toStaffViolationEntity(dto, this.roster);
  }

  async rejectStaffViolation(
    input: RejectStaffViolationInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity> {
    this.assertCanMutate(authCtx);
    const dto = this.findViolation(input.recordId);
    if (dto.state !== "SUBMITTED") throw failure({ type: "already-processed" });
    // Layer 2: the server only requires a NON-EMPTY reason (the ≥10-char rule
    // is the client's UX guard, a separate layer).
    if (input.rejectionReason.trim().length === 0) {
      throw failure({ type: "missing-reject-reason" });
    }

    dto.state = "REJECTED";
    dto.approverMemberId = authCtx.memberId;
    dto.rejectionReason = input.rejectionReason;
    dto.updatedAt = nowIso();
    return toStaffViolationEntity(dto, this.roster);
  }

  // --- Conduct notes --------------------------------------------------------

  async listStaffConductNotes(
    params: { staffMemberId?: string; termId?: string },
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity[]> {
    const scope = this.resolveReadScope(params.staffMemberId, authCtx);
    await mockDelay();
    return this.conductNotes
      .filter((n) => (scope ? n.staffMemberId === scope : true))
      .filter((n) => (params.termId ? n.termId === params.termId : true))
      .map((n) => toStaffConductNoteEntity(n, this.roster));
  }

  async setStaffConductNote(
    input: SetStaffConductNoteInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    this.assertCanMutate(authCtx);
    if (!STAFF_CONDUCT_RATINGS.includes(input.rating)) {
      throw failure({ type: "invalid-rating" });
    }
    if (!SD_TERM_IDS.includes(input.termId)) {
      throw failure({ type: "term-not-found" });
    }
    if (!this.roster.some((r) => r.staffMemberId === input.staffMemberId)) {
      throw failure({ type: "not-found" });
    }
    if (input.note.trim().length === 0) {
      throw failure({
        type: "validation",
        fields: [{ field: "note", reason: "required" }],
      });
    }

    const existing = this.conductNotes.find(
      (n) =>
        n.termId === input.termId && n.staffMemberId === input.staffMemberId,
    );

    // ADR 0074 — permanent immutability once APPROVED (409 backstop, NFR-009).
    if (existing?.state === "APPROVED") throw failure({ type: "locked" });

    if (existing) {
      // Overwrite in place. Original author/createdAt are PRESERVED (the
      // audit-honest default; flagged as a mock-only assumption, spec §8 OQ5).
      existing.rating = input.rating;
      existing.note = input.note;
      existing.state = "DRAFT";
      existing.approverMemberId = undefined;
      existing.rejectionReason = undefined;
      existing.updatedAt = nowIso();
      return toStaffConductNoteEntity(existing, this.roster);
    }

    const now = nowIso();
    const dto: StaffConductNoteResponseDto = {
      termId: input.termId,
      staffMemberId: input.staffMemberId,
      rating: input.rating,
      note: input.note,
      state: "DRAFT",
      authorMemberId: authCtx.memberId,
      createdAt: now,
      updatedAt: now,
    };
    this.conductNotes = [dto, ...this.conductNotes];
    return toStaffConductNoteEntity(dto, this.roster);
  }

  async submitStaffConductNote(
    staffMemberId: string,
    termId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    this.assertCanMutate(authCtx);
    const dto = this.findConductNote(staffMemberId, termId);
    if (dto.authorMemberId !== authCtx.memberId) {
      throw failure({ type: "forbidden" });
    }
    if (dto.state !== "DRAFT" && dto.state !== "REJECTED") {
      throw failure({ type: "invalid-transition" });
    }

    dto.state = "SUBMITTED";
    dto.updatedAt = nowIso();
    return toStaffConductNoteEntity(dto, this.roster);
  }

  async approveStaffConductNote(
    staffMemberId: string,
    termId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    this.assertCanMutate(authCtx);
    const dto = this.findConductNote(staffMemberId, termId);
    if (dto.state !== "SUBMITTED") throw failure({ type: "already-processed" });

    dto.state = "APPROVED";
    dto.approverMemberId = authCtx.memberId;
    dto.updatedAt = nowIso();
    return toStaffConductNoteEntity(dto, this.roster);
  }

  async rejectStaffConductNote(
    staffMemberId: string,
    termId: string,
    rejectionReason: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity> {
    this.assertCanMutate(authCtx);
    const dto = this.findConductNote(staffMemberId, termId);
    if (dto.state !== "SUBMITTED") throw failure({ type: "already-processed" });
    if (rejectionReason.trim().length === 0) {
      throw failure({ type: "missing-reject-reason" });
    }

    dto.state = "REJECTED";
    dto.approverMemberId = authCtx.memberId;
    dto.rejectionReason = rejectionReason;
    dto.updatedAt = nowIso();
    return toStaffConductNoteEntity(dto, this.roster);
  }

  // --- Lookups --------------------------------------------------------------

  private findViolation(recordId: string): StaffViolationResponseDto {
    const dto = this.violations.find((v) => v.recordId === recordId);
    if (!dto) throw failure({ type: "not-found" });
    return dto;
  }

  private findConductNote(
    staffMemberId: string,
    termId: string,
  ): StaffConductNoteResponseDto {
    const dto = this.conductNotes.find(
      (n) => n.termId === termId && n.staffMemberId === staffMemberId,
    );
    if (!dto) throw failure({ type: "not-found" });
    return dto;
  }
}

/** Identity helper so every throw site is typed against the failure union. */
function failure(f: StaffDisciplineFailure): StaffDisciplineFailure {
  return f;
}

function nowIso(): string {
  return new Date().toISOString();
}
