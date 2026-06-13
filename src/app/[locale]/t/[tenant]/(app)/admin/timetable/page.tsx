import { makeGetTimetableUseCase } from "@/bootstrap/di/timetable.di";
import { buildTimetableVM } from "@/features/admin/timetable/presentation/timetable-screen/build-timetable-vm";
import { TimetableScreen } from "@/features/admin/timetable/presentation/timetable-screen/timetable-screen";
import {
  TT_CLASSES,
  TT_YEARS,
} from "@/features/admin/timetable/presentation/timetable-screen/timetable-static";
import { clearSlotAction, updateSlotAction } from "./actions";

const DEFAULT_CLASS_ID = TT_CLASSES[0]?.id ?? "cls-10a1";
const DEFAULT_YEAR_ID = TT_YEARS[TT_YEARS.length - 1]?.id ?? "2025-2026";

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

  const data = await (await makeGetTimetableUseCase()).execute(classId, yearId);
  const vm = buildTimetableVM(data, classId, yearId);

  return (
    <TimetableScreen vm={vm} actions={{ updateSlotAction, clearSlotAction }} />
  );
}
