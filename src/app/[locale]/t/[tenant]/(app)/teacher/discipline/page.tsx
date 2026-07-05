import {
  makeGetConductSummaryUseCase,
  makeGetLeaveRequestsUseCase,
  makeGetViolationsUseCase,
} from "@/bootstrap/di/discipline.di";
import type { ConductSummaryEntity } from "@/features/discipline/domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ViolationEntity } from "@/features/discipline/domain/entities/violation.entity";
import { DisciplineScreen } from "@/features/discipline/presentation/discipline-screen/discipline-screen";
import type { DisciplineTab } from "@/features/discipline/presentation/discipline-screen/discipline-screen.i-vm";
import {
  approveLeaveAction,
  deleteViolationAction,
  overrideConductGradeAction,
  recordViolationAction,
  rejectLeaveAction,
} from "./actions";

type SearchParams = Promise<{ tab?: string; semester?: string }>;

const VALID_TABS: DisciplineTab[] = ["violations", "conduct", "leave"];

export default async function TeacherDisciplinePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const initialTab = VALID_TABS.includes(sp.tab as DisciplineTab)
    ? (sp.tab as DisciplineTab)
    : "violations";
  const semester = sp.semester ?? "HK1";

  let violations: ViolationEntity[] = [];
  let conductSummary: ConductSummaryEntity[] = [];
  let leaveRequests: LeaveRequestEntity[] = [];
  try {
    [violations, conductSummary, leaveRequests] = await Promise.all([
      (await makeGetViolationsUseCase()).execute({ semester }),
      (await makeGetConductSummaryUseCase()).execute({ semester }),
      (await makeGetLeaveRequestsUseCase()).execute({}),
    ]);
  } catch {
    // Soft-fail to empty states; the screen renders empty/error treatments.
  }

  const availableClasses = Array.from(
    new Set([
      ...violations.map((v) => v.classId),
      ...conductSummary.map((c) => c.classId),
      ...leaveRequests.map((l) => l.classId),
    ]),
  ).sort();

  return (
    <DisciplineScreen
      viewerRole="teacher"
      availableClasses={availableClasses}
      initialTab={initialTab}
      initialSemester={semester}
      violations={violations}
      conductSummary={conductSummary}
      leaveRequests={leaveRequests}
      recordViolationAction={recordViolationAction}
      deleteViolationAction={deleteViolationAction}
      approveLeaveAction={approveLeaveAction}
      rejectLeaveAction={rejectLeaveAction}
      overrideConductGradeAction={overrideConductGradeAction}
    />
  );
}
