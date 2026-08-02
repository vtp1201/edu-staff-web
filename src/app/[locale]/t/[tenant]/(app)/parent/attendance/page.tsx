import { makeGetChildListUseCase } from "@/bootstrap/di/grades.di";
import { makeGetChildAttendanceUseCase } from "@/bootstrap/di/parent-attendance.di";
import type { ChildAttendanceRecord } from "@/features/parent-attendance/domain/entities/child-attendance-record.entity";
import type { ParentAttendanceFailure } from "@/features/parent-attendance/domain/failures/parent-attendance.failure";
import { ParentAttendanceContainer } from "@/features/parent-attendance/presentation/parent-attendance-screen/parent-attendance-container";
import type { ParentAttendanceScreenVM } from "@/features/parent-attendance/presentation/parent-attendance-screen/parent-attendance-screen.i-vm";
import {
  resolveActiveChildId,
  resolveRangeFromParams,
} from "@/features/parent-attendance/presentation/parent-attendance-screen/resolve-range";

type SearchParams = Promise<{
  childId?: string;
  startDate?: string;
  endDate?: string;
}>;

/**
 * Per-child attendance history for a parent (US-E20.5) — closes the previously
 * dead `/parent/attendance` sidebar link. No manual role check:
 * `parent/layout.tsx` already enforces `role === "parent"`.
 *
 * Child + range are URL state. Both reads are REAL as of US-E18.34 (a PARENT
 * may read a LINKED child's attendance — see `bootstrap/di/
 * parent-attendance.di.ts`); the mock stays gated behind `NEXT_PUBLIC_USE_MOCK`
 * so no fabricated present/late/absent row can ever reach a parent in a real
 * environment. A child the parent is not linked to surfaces as
 * `vm.error === "forbidden"` from the BE's own 403, not a client-side guess.
 * Proved by `page.test.ts`.
 */
export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const range = resolveRangeFromParams(
    sp,
    new Date().toISOString().slice(0, 10),
  );

  const childListResult = await (await makeGetChildListUseCase()).execute();
  const childList = childListResult.ok ? childListResult.data : [];
  const activeChildId = resolveActiveChildId(
    childList.map((c) => c.childId),
    sp.childId,
  );

  let records: ChildAttendanceRecord[] = [];
  let error: ParentAttendanceFailure["type"] | null = childListResult.ok
    ? null
    : "unknown";

  if (activeChildId && !error) {
    const result = await (await makeGetChildAttendanceUseCase()).execute(
      activeChildId,
      range,
    );
    if (result.ok) {
      records = result.data;
    } else {
      error = result.error.type;
    }
  }

  const vm: ParentAttendanceScreenVM = {
    childList,
    activeChildId,
    range,
    records,
    error,
  };

  return <ParentAttendanceContainer vm={vm} />;
}
