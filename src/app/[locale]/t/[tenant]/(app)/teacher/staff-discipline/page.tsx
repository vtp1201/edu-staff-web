import {
  makeListStaffConductNotesUseCase,
  makeListStaffViolationsUseCase,
  makeStaffDisciplineAuthContext,
} from "@/bootstrap/di/staff-discipline.di";
import type { StaffConductNoteEntity } from "@/features/staff-discipline/domain/entities/staff-conduct-note.entity";
import type { StaffViolationEntity } from "@/features/staff-discipline/domain/entities/staff-violation.entity";
import { toStaffDisciplineFailureType } from "@/features/staff-discipline/domain/failures/staff-discipline.failure";
import {
  SD_CATEGORIES,
  SD_DEFAULT_TERM_ID,
  SD_STAFF_ROSTER,
} from "@/features/staff-discipline/infrastructure/repositories/mocks/fixtures";
import { StaffDisciplineScreen } from "@/features/staff-discipline/presentation/staff-discipline-screen/staff-discipline-screen";
import type { StaffDisciplineErrorKey } from "@/features/staff-discipline/presentation/staff-discipline-screen/staff-discipline-screen.i-vm";
import {
  approveConductNoteAction,
  approveViolationAction,
  createViolationAction,
  listConductNotesAction,
  listViolationsAction,
  rejectConductNoteAction,
  rejectViolationAction,
  setConductNoteAction,
  submitConductNoteAction,
  submitViolationAction,
} from "./actions";

/**
 * `/teacher/staff-discipline` (ADR 0062) — the staff member's strictly read-only
 * self-view, served by the SAME `StaffDisciplineScreen` component as the
 * principal route (the `discipline-screen` one-component-multi-role pattern).
 * Reuses the existing route-group auth/tenant gate — no new guard here.
 *
 * The lists are scoped SERVER-side to the caller's own `staffMemberId`
 * (NFR-008 pt.3): the repository forces the scope from `authCtx` and ignores any
 * client-supplied param, so this page passes NO staff filter of its own.
 * `termOptions` is intentionally empty — the teacher sees no term selector
 * (design-spec `termSelector.visibleFor: "principal only"`, AC-006.3) and is
 * scoped to the active term.
 */
export default async function TeacherStaffDisciplinePage() {
  const authCtx = await makeStaffDisciplineAuthContext("teacher");

  let initialViolations: StaffViolationEntity[] = [];
  let initialViolationsErrorKey: StaffDisciplineErrorKey | undefined;
  try {
    initialViolations = await (await makeListStaffViolationsUseCase()).execute(
      {},
      authCtx,
    );
  } catch (err) {
    initialViolationsErrorKey = toStaffDisciplineFailureType(err);
  }

  let initialConductNotes: StaffConductNoteEntity[] = [];
  let initialConductNotesErrorKey: StaffDisciplineErrorKey | undefined;
  try {
    initialConductNotes = await (
      await makeListStaffConductNotesUseCase()
    ).execute({ termId: SD_DEFAULT_TERM_ID }, authCtx);
  } catch (err) {
    initialConductNotesErrorKey = toStaffDisciplineFailureType(err);
  }

  return (
    <StaffDisciplineScreen
      viewerRole="teacher"
      viewerMemberId={authCtx.memberId}
      viewerStaffMemberId={authCtx.staffMemberId}
      initialViolations={initialViolations}
      initialViolationsErrorKey={initialViolationsErrorKey}
      initialConductNotes={initialConductNotes}
      initialConductNotesErrorKey={initialConductNotesErrorKey}
      initialTermId={SD_DEFAULT_TERM_ID}
      staffRoster={[...SD_STAFF_ROSTER]}
      violationCategories={[...SD_CATEGORIES]}
      termOptions={[]}
      listViolationsAction={listViolationsAction}
      createViolationAction={createViolationAction}
      submitViolationAction={submitViolationAction}
      approveViolationAction={approveViolationAction}
      rejectViolationAction={rejectViolationAction}
      listConductNotesAction={listConductNotesAction}
      setConductNoteAction={setConductNoteAction}
      submitConductNoteAction={submitConductNoteAction}
      approveConductNoteAction={approveConductNoteAction}
      rejectConductNoteAction={rejectConductNoteAction}
    />
  );
}
