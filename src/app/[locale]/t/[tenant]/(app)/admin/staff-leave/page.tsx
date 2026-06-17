import { makeGetStaffLeaveRequestsUseCase } from "@/bootstrap/di/staff-leave.di";
import { StaffLeaveScreen } from "@/features/staff-leave/presentation/staff-leave-screen/staff-leave-screen";
import { approveStaffLeaveAction, rejectStaffLeaveAction } from "./actions";

export default async function StaffLeavePage() {
  const useCase = await makeGetStaffLeaveRequestsUseCase();
  const result = await useCase.execute();

  return (
    <StaffLeaveScreen
      initialRequests={result.ok ? result.value : []}
      loadFailed={!result.ok}
      onApprove={approveStaffLeaveAction}
      onReject={rejectStaffLeaveAction}
    />
  );
}
