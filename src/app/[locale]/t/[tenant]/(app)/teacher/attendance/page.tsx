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
  const classId = sp.class;
  const date = sp.date;

  const classes = await (await makeListMyHomeroomClassesUseCase()).execute();

  const roster =
    classId && date
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
