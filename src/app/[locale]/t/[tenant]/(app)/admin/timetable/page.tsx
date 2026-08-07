import { Suspense } from "react";
import {
  makeGetTimetableConflictsUseCase,
  makeGetTimetableUseCase,
} from "@/bootstrap/di/timetable.di";
import { buildTimetableVM } from "@/features/admin/timetable/presentation/timetable-screen/build-timetable-vm";
import { TimetableScreen } from "@/features/admin/timetable/presentation/timetable-screen/timetable-screen";
import {
  TT_CLASSES,
  TT_YEARS,
} from "@/features/admin/timetable/presentation/timetable-screen/timetable-static";
import { clearSlotAction, updateSlotAction } from "./actions";
import { TimetableSkeleton } from "./timetable-skeleton";

const DEFAULT_CLASS_ID = TT_CLASSES[0]?.id ?? "cls-10a1";
const DEFAULT_YEAR_ID = TT_YEARS[TT_YEARS.length - 1]?.id ?? "2025-2026";

/**
 * Route is ADMIN-ONLY: `(app)/admin/layout.tsx` runs `evaluateAdminAccess`,
 * a STRICT-EQUALITY `role === "admin"` guard, before any `/admin/*` page
 * renders. A `principal` (the appRole every BE `MANAGER` **and** `ADMIN` enum
 * collapses onto, `role-meta.ts`) is redirected away — which is what keeps this
 * ADMIN/SUPER_ADMIN-only scan (BE US-188) off every principal-facing surface.
 */
async function TimetableContent({
  classId,
  yearId,
}: {
  classId: string;
  yearId: string;
}) {
  // Parallel, not serial: the whole-school scan is an independent tenant-wide
  // read, so it must not add its latency on top of the class timetable's.
  const [getTimetable, getConflicts] = await Promise.all([
    makeGetTimetableUseCase(),
    makeGetTimetableConflictsUseCase(),
  ]);
  const [data, scanResult] = await Promise.all([
    getTimetable.execute(classId, yearId),
    // The scan returns a Result — a failed scan degrades inside the conflicts
    // panel and must never blank the grid the admin came here to edit.
    getConflicts.execute(),
  ]);

  const vm = buildTimetableVM(data, classId, yearId, scanResult);

  return (
    <TimetableScreen vm={vm} actions={{ updateSlotAction, clearSlotAction }} />
  );
}

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; yearId?: string }>;
}) {
  const sp = await searchParams;
  const classId =
    sp.classId && TT_CLASSES.some((c) => c.id === sp.classId)
      ? sp.classId
      : DEFAULT_CLASS_ID;
  const yearId =
    sp.yearId && TT_YEARS.some((y) => y.id === sp.yearId)
      ? sp.yearId
      : DEFAULT_YEAR_ID;

  return (
    <Suspense fallback={<TimetableSkeleton />}>
      <TimetableContent classId={classId} yearId={yearId} />
    </Suspense>
  );
}
