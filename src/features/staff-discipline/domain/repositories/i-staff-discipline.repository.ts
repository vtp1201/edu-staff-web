import type {
  SetStaffConductNoteInput,
  StaffConductNoteEntity,
} from "../entities/staff-conduct-note.entity";
import type { StaffDisciplineAuthContext } from "../entities/staff-discipline-auth-context.entity";
import type {
  CreateStaffViolationInput,
  RejectStaffViolationInput,
  StaffViolationEntity,
} from "../entities/staff-violation.entity";

/**
 * Staff-discipline repository contract (US-E09.5) — ONE interface covering both
 * sub-resources' 10 operations (component-architecture.md §1, mirrors
 * `IDisciplineRepository`'s 3-sub-resource precedent).
 *
 * Convention: `Promise<T>`-returning; implementations THROW a
 * `StaffDisciplineFailure` on error (same convention as `IDisciplineRepository`,
 * not a `Result` wrapper).
 *
 * **Every method takes an explicit `authCtx`** (deviation from plan.md §2's
 * signature sketch, justified): NFR-008 requires denial to be reproducible by
 * invoking the method directly with a forged non-`principal` role, and the
 * `teacher` list scope must be forced SERVER-side (never client-filtered).
 * The implementation is the authorization boundary while the feature is
 * mock-first (spec §"High-Risk-Grade Security Enforcement" pt. 6).
 */
export interface IStaffDisciplineRepository {
  // --- Violations (INT-001..INT-004) ---

  /** `teacher` callers are FORCED to their own `staffMemberId`, ignoring params. */
  listStaffViolations(
    params: { staffMemberId?: string },
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity[]>;

  createStaffViolation(
    input: CreateStaffViolationInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity>;

  submitStaffViolation(
    recordId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity>;

  approveStaffViolation(
    recordId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity>;

  rejectStaffViolation(
    input: RejectStaffViolationInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffViolationEntity>;

  // --- Conduct notes (INT-005..INT-008) ---

  /** `teacher` callers are FORCED to their own `staffMemberId`, ignoring params. */
  listStaffConductNotes(
    params: { staffMemberId?: string; termId?: string },
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity[]>;

  /** Throws `{ type: "locked" }` (409) when the target record is APPROVED (ADR 0074). */
  setStaffConductNote(
    input: SetStaffConductNoteInput,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity>;

  submitStaffConductNote(
    staffMemberId: string,
    termId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity>;

  approveStaffConductNote(
    staffMemberId: string,
    termId: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity>;

  rejectStaffConductNote(
    staffMemberId: string,
    termId: string,
    rejectionReason: string,
    authCtx: StaffDisciplineAuthContext,
  ): Promise<StaffConductNoteEntity>;
}
