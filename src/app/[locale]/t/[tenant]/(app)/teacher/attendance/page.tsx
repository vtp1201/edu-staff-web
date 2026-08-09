import {
  makeGetClassAttendanceUseCase,
  makeListMyHomeroomClassesUseCase,
} from "@/bootstrap/di/attendance.di";
import { AttendanceScreen } from "@/features/attendance/presentation/attendance-screen/attendance-screen";
import { getAttendanceHistoryAction, saveAttendanceAction } from "./actions";

type SearchParams = Promise<{
  class?: string;
  date?: string;
}>;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const classes = await (await makeListMyHomeroomClassesUseCase()).execute();

  // Land on something useful: a teacher with one homeroom class had to pick it
  // (and today's date) by hand before any roster appeared. The URL still wins,
  // so switching class/date keeps working exactly as before.
  const classId = sp.class ?? classes[0]?.id;
  const date = sp.date ?? new Date().toISOString().slice(0, 10);

  const roster = classId
    ? await (await makeGetClassAttendanceUseCase()).execute(classId, date)
    : null;

  return (
    <AttendanceScreen
      classes={classes}
      roster={roster}
      filters={{ classId, date }}
      saveAction={saveAttendanceAction}
      getHistoryAction={getAttendanceHistoryAction}
    />
  );
}
