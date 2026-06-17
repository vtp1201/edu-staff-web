import {
  makeGetMyConductSummaryUseCase,
  makeGetMyLeaveRequestsUseCase,
  makeGetMyViolationsUseCase,
} from "@/bootstrap/di/discipline.di";
import type { ConductSummaryEntity } from "@/features/discipline/domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ViolationEntity } from "@/features/discipline/domain/entities/violation.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";
import { StudentConductScreen } from "@/features/discipline/presentation/student-conduct-screen/student-conduct-screen";
import { submitLeaveRequestAction } from "./actions";

// Mock student id — in production this comes from the session / JWT (mock-first).
const MOCK_STUDENT_ID = "s-1";

export default async function StudentConductPage() {
  let conductSummary: ConductSummaryEntity | null = null;
  let violations: ViolationEntity[] = [];
  let leaveRequests: LeaveRequestEntity[] = [];
  let loadErrorKey: DisciplineFailure["type"] | undefined;

  try {
    [conductSummary, violations, leaveRequests] = await Promise.all([
      (await makeGetMyConductSummaryUseCase()).execute(MOCK_STUDENT_ID, "HK1"),
      (await makeGetMyViolationsUseCase()).execute(MOCK_STUDENT_ID),
      (await makeGetMyLeaveRequestsUseCase()).execute(MOCK_STUDENT_ID),
    ]);
  } catch (err) {
    loadErrorKey =
      err && typeof err === "object" && "type" in err
        ? (err as DisciplineFailure).type
        : "network-error";
  }

  return (
    <StudentConductScreen
      viewerRole="student"
      conductSummary={conductSummary}
      violations={violations}
      leaveRequests={leaveRequests}
      submitLeaveRequestAction={submitLeaveRequestAction}
      loadErrorKey={loadErrorKey}
    />
  );
}
