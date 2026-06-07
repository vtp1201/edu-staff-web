import {
  makeGetRosterUseCase,
  makeListAttendanceHistoryUseCase,
  makeListMyClassesUseCase,
} from "@/bootstrap/di/attendance.di";
import { AttendanceScreen } from "@/features/attendance/presentation/attendance-screen/attendance-screen";
import { saveAttendanceAction } from "./actions";

type SearchParams = Promise<{
  class?: string;
  date?: string;
  period?: string;
}>;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const classId = sp.class;
  const date = sp.date;
  const periodStr = sp.period;

  const classes = await (await makeListMyClassesUseCase()).execute();

  const roster =
    classId && date && periodStr
      ? await (await makeGetRosterUseCase()).execute(
          classId,
          date,
          Number(periodStr),
        )
      : null;

  const history = classId
    ? await (await makeListAttendanceHistoryUseCase()).execute(classId, "", "")
    : [];

  return (
    <AttendanceScreen
      classes={classes}
      roster={roster}
      history={history}
      filters={{ classId, date, period: periodStr }}
      saveAction={saveAttendanceAction}
    />
  );
}
