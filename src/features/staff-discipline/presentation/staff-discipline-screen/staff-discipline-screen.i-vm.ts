import type {
  SetStaffConductNoteInput,
  StaffConductNoteEntity,
} from "../../domain/entities/staff-conduct-note.entity";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type {
  CreateStaffViolationInput,
  RejectStaffViolationInput,
  StaffViolationEntity,
} from "../../domain/entities/staff-violation.entity";
import type {
  StaffDisciplineFailure,
  StaffDisciplineFieldError,
} from "../../domain/failures/staff-discipline.failure";

export type StaffDisciplineRole = "principal" | "teacher";
export type StaffDisciplineErrorKey = StaffDisciplineFailure["type"];

export type StaffDisciplineActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: StaffDisciplineErrorKey;
      fields?: StaffDisciplineFieldError[];
      retryable?: boolean;
    };

export interface StaffDisciplineTermOption {
  id: string;
  /** Term display label — BE/mock DATA, not i18n copy. */
  label: string;
}

/**
 * Screen-level ViewModel — the server↔client contract (component-architecture.md
 * §3.1). The RSC page seeds BOTH lists from independent fetches, hence TWO
 * initial error keys (AC-010.3 forbids the tabs sharing error state even on the
 * first paint). Error is never silently coerced into an empty list.
 */
export interface StaffDisciplineScreenVM {
  viewerRole: StaffDisciplineRole;
  /** Caller's member id — gates the own-authored submit affordance (AC-003.2). */
  viewerMemberId: string;
  /**
   * Only meaningful for `teacher`. Display/empty-copy use only: the server has
   * ALREADY scoped both lists to this id (NFR-008 pt.3) and the client never
   * re-filters with it.
   */
  viewerStaffMemberId?: string;

  initialViolations: StaffViolationEntity[];
  initialViolationsErrorKey?: StaffDisciplineErrorKey;

  initialConductNotes: StaffConductNoteEntity[];
  initialConductNotesErrorKey?: StaffDisciplineErrorKey;
  /** Term the conduct-notes list was seeded with (teacher: the active term). */
  initialTermId: string;

  /** Static, passed once, NEVER refetched (AC-002.2 — zero network calls). */
  staffRoster: StaffRosterEntry[];
  /**
   * Static violation-category picklist (`SD_CATEGORIES`, design-spec
   * `violationsTab.createForm.fields[2]`). Stored WIRE VALUES, i.e. DATA — not
   * i18n copy. Threaded exactly like `staffRoster`: passed once, never fetched.
   */
  violationCategories: string[];
  /** Static term picklist (principal only renders the selector). */
  termOptions: StaffDisciplineTermOption[];

  // Violations — Server Action refs.
  listViolationsAction: (params: {
    staffMemberId?: string;
  }) => Promise<StaffDisciplineActionResult<StaffViolationEntity[]>>;
  createViolationAction: (
    input: CreateStaffViolationInput,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;
  submitViolationAction: (
    recordId: string,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;
  approveViolationAction: (
    recordId: string,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;
  rejectViolationAction: (
    input: RejectStaffViolationInput,
  ) => Promise<StaffDisciplineActionResult<StaffViolationEntity>>;

  // Conduct notes — Server Action refs.
  listConductNotesAction: (params: {
    staffMemberId?: string;
    termId?: string;
  }) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity[]>>;
  setConductNoteAction: (
    input: SetStaffConductNoteInput,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
  submitConductNoteAction: (
    staffMemberId: string,
    termId: string,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
  approveConductNoteAction: (
    staffMemberId: string,
    termId: string,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
  rejectConductNoteAction: (
    staffMemberId: string,
    termId: string,
    rejectionReason: string,
  ) => Promise<StaffDisciplineActionResult<StaffConductNoteEntity>>;
}

/** Inline error surfaced on a dialog/panel — the leaf translates the key. */
export interface StaffDisciplineSubmitError {
  errorKey: StaffDisciplineErrorKey;
  fields?: StaffDisciplineFieldError[];
}
