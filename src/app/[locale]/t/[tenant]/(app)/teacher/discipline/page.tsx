import {
  makeGetConductSummaryUseCase,
  makeGetLeaveRequestsUseCase,
  makeGetViolationsUseCase,
} from "@/bootstrap/di/discipline.di";
import { makeListMyTeacherClassesUseCase } from "@/bootstrap/di/teacher-class.di";
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
  try {
    [violations, conductSummary] = await Promise.all([
      (await makeGetViolationsUseCase()).execute({ semester }),
      (await makeGetConductSummaryUseCase()).execute({ semester }),
    ]);
  } catch {
    // Soft-fail to empty states; the screen renders empty/error treatments.
  }

  const leaveRequests = await loadHomeroomLeaveRequests();

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

/**
 * The GVCN leave inbox, fanned out over the teacher's OWN homeroom classes
 * (backlog #5, US-E24.20).
 *
 * `getLeaveRequests({})` used to be called here, but core's
 * `ListStudentLeaveRequests` requires EXACTLY ONE of `classId` /
 * `studentMemberId` — there is no "all classes" query on the wire — so the real
 * repository refuses a class-less call and this tab silently rendered empty.
 * The homeroom class set is the same read `makeLeaveDecisionAuthContext()`
 * already performs (and the only set core's TEACHER branch authorizes), so it
 * is read here and filtered the same way.
 *
 * `Promise.allSettled` per class: one class's failure must drop only that
 * class's rows, never blank the whole tab. The use-case is built ONCE (its
 * factory does a session refresh + HTTP client construction) and reused.
 */
async function loadHomeroomLeaveRequests(): Promise<LeaveRequestEntity[]> {
  const classesResult = await (
    await makeListMyTeacherClassesUseCase()
  ).execute();
  if (!classesResult.ok) return [];

  const homeroom = classesResult.data.filter((c) =>
    c.roles.includes("homeroom"),
  );
  if (homeroom.length === 0) return [];

  const useCase = await makeGetLeaveRequestsUseCase();
  const settled = await Promise.allSettled(
    homeroom.map((cls) =>
      useCase.execute({ classId: cls.id, className: cls.name }),
    ),
  );

  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
