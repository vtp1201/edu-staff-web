import { TeacherScheduleScreen } from "@/features/timetable/presentation/teacher-schedule/teacher-schedule";
import { toDataState } from "@/features/timetable/presentation/timetable-view/timetable-view.derive";
import { classHubBase } from "@/shared/class-hub-href";
import { getMyTeachingScheduleAction } from "./actions";

export default async function TeacherSchedulePage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const [{ locale, tenant }, result] = await Promise.all([
    params,
    getMyTeachingScheduleAction(),
  ]);

  return (
    <TeacherScheduleScreen
      initialState={toDataState(result)}
      // Absolute base for the per-cell class-hub deep link (US-E24.8).
      classHrefBase={classHubBase(locale, tenant)}
    />
  );
}
