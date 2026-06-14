import { makeStaffingRepository } from "@/bootstrap/di/staffing.di";
import { StaffingScreen } from "@/features/admin/staffing/presentation/staffing-screen/staffing-screen";
import {
  archiveDepartmentAction,
  archivePositionTitleAction,
  assignPositionAction,
  copyAssignmentsAction,
  createDepartmentAction,
  createPositionTitleAction,
  patchDepartmentAction,
  patchPositionTitleAction,
  revokeAssignmentAction,
} from "./actions";

export default async function StaffingPage() {
  const repo = await makeStaffingRepository();
  const [departments, positionTitles, assignments] = await Promise.all([
    repo.listDepartments(),
    repo.listPositionTitles(),
    repo.listAssignments(),
  ]);

  return (
    <StaffingScreen
      initialDepartments={departments.ok ? departments.value : []}
      initialPositionTitles={positionTitles.ok ? positionTitles.value : []}
      initialAssignments={assignments.ok ? assignments.value : []}
      // The /admin/* layout already enforces role === "admin" server-side
      // (US-E12.8), so anyone reaching this route is an admin.
      isAdmin={true}
      onCreateDepartment={createDepartmentAction}
      onPatchDepartment={patchDepartmentAction}
      onArchiveDepartment={archiveDepartmentAction}
      onCreatePositionTitle={createPositionTitleAction}
      onPatchPositionTitle={patchPositionTitleAction}
      onArchivePositionTitle={archivePositionTitleAction}
      onAssignPosition={assignPositionAction}
      onRevokeAssignment={revokeAssignmentAction}
      onCopyAssignments={copyAssignmentsAction}
    />
  );
}
