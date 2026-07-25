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
  SD_TERMS,
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
 * `/principal/staff-discipline` (ADR 0062). Reuses the existing route-group
 * auth/tenant gate — no new guard is added by this story.
 *
 * Both lists are fetched INDEPENDENTLY and each soft-fails to its OWN
 * `initial*ErrorKey` (never a thrown 500, never silently coerced to an empty
 * list) so the two tabs never share error state, even on the first paint
 * (AC-010.3). The staff roster + term picklist are static (FR-009/FR-013).
 */
export default async function PrincipalStaffDisciplinePage() {
  const authCtx = await makeStaffDisciplineAuthContext("principal");

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
      viewerRole="principal"
      viewerMemberId={authCtx.memberId}
      initialViolations={initialViolations}
      initialViolationsErrorKey={initialViolationsErrorKey}
      initialConductNotes={initialConductNotes}
      initialConductNotesErrorKey={initialConductNotesErrorKey}
      initialTermId={SD_DEFAULT_TERM_ID}
      staffRoster={[...SD_STAFF_ROSTER]}
      violationCategories={[...SD_CATEGORIES]}
      termOptions={SD_TERMS.map((term) => ({
        id: term.id,
        label: term.label,
      }))}
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
