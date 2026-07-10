import { TimetableView } from "@/features/timetable/presentation/timetable-view/timetable-view";
import { toDataState } from "@/features/timetable/presentation/timetable-view/timetable-view.derive";
import { getMyTimetableAction } from "./actions";

export default async function StudentSchedulePage() {
  const result = await getMyTimetableAction();
  return (
    <TimetableView viewerRole="student" initialState={toDataState(result)} />
  );
}
