import { TeacherScheduleScreen } from "@/features/timetable/presentation/teacher-schedule/teacher-schedule";
import { toDataState } from "@/features/timetable/presentation/timetable-view/timetable-view.derive";
import { getMyTeachingScheduleAction } from "./actions";

export default async function TeacherSchedulePage() {
  const result = await getMyTeachingScheduleAction();
  return <TeacherScheduleScreen initialState={toDataState(result)} />;
}
