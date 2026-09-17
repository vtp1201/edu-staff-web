import {
  makeGetConductSummaryUseCase,
  makeGetLeaveRequestsUseCase,
  makeGetViolationsUseCase,
} from "@/bootstrap/di/discipline.di";
import { makePrincipalClassesRepository } from "@/bootstrap/di/principal-classes.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
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

export default async function PrincipalDisciplinePage({
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
    // Soft-fail to empty states.
  }

  const leaveRequests = await loadTenantLeaveRequests();

  // Backlog #17: same id-space mixing bug as the teacher page — see the
  // sibling comment in `teacher/discipline/page.tsx` for the full rationale.
  // `leaveRequests` classIds are core's real class UUIDs; `violations`/
  // `conductSummary` are still force-mocked (#4, BE-blocked) and live in a
  // disjoint mock id space. `availableClasses`'s only two consumers
  // (`violations-tab.tsx`, `conduct-tab.tsx`) both operate in the mock id
  // space only — `leave-tab.tsx` never reads `availableClasses`.
  const availableClasses = Array.from(
    new Set([
      ...violations.map((v) => v.classId),
      ...conductSummary.map((c) => c.classId),
    ]),
  ).sort();

  return (
    <DisciplineScreen
      viewerRole="principal"
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

const CLASS_PAGE_SIZE = 100;

/**
 * The BGH oversight leave list, fanned out over every class in the tenant
 * (backlog #5, US-E24.20).
 *
 * `getLeaveRequests({})` used to be called here, but core requires EXACTLY ONE
 * of `classId` / `studentMemberId` — there is no tenant-wide query on the wire
 * — so the real repository refused the call and this tab silently rendered
 * empty. Core's BGH branch (`ListByClass`) has no homeroom restriction and
 * returns every state, so the fan-out set is the whole class list, read from
 * the already-wired principal class repository (US-E13.8/US-E18.30) and
 * drained across its cursor pages.
 *
 * Accepted cost (documented in the story packet, not silently shipped): one
 * round-trip per class. No bulk `classIds=` endpoint exists to do better.
 *
 * Every failure degrades to an empty list rather than crashing the route: no
 * active academic year (same precedent as `(app)/principal/classes`), a failed
 * class list, or a single class's leave read failing (settled per class).
 */
async function loadTenantLeaveRequests(): Promise<LeaveRequestEntity[]> {
  let academicYear: string;
  try {
    academicYear = await resolveCurrentAcademicYear();
  } catch {
    return [];
  }

  const repo = await makePrincipalClassesRepository();
  const classes: { id: string; name: string }[] = [];
  let cursor: string | undefined;
  do {
    const result = await repo.listClasses({
      academicYear,
      limit: CLASS_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
    });
    if (!result.ok) return [];
    classes.push(...result.value.data);
    cursor = result.value.hasMore
      ? (result.value.nextCursor ?? undefined)
      : undefined;
  } while (cursor);

  if (classes.length === 0) return [];

  const useCase = await makeGetLeaveRequestsUseCase();
  const settled = await Promise.allSettled(
    classes.map((cls) =>
      useCase.execute({ classId: cls.id, className: cls.name }),
    ),
  );

  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
