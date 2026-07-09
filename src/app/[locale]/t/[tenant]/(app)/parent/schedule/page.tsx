import { TimetableView } from "@/features/timetable/presentation/timetable-view/timetable-view";
import { toDataState } from "@/features/timetable/presentation/timetable-view/timetable-view.derive";
import type { TimetableDataState } from "@/features/timetable/presentation/timetable-view/timetable-view.i-vm";
import { getChildListAction, getChildTimetableAction } from "./actions";

export default async function ParentSchedulePage() {
  const childRes = await getChildListAction();
  const childList = childRes.ok ? childRes.data : [];
  const firstChildId = childList[0]?.childId;

  let initialState: TimetableDataState;
  if (!firstChildId) {
    initialState = childRes.ok
      ? { status: "empty" }
      : { status: "error", errorKey: childRes.errorKey };
  } else {
    initialState = toDataState(await getChildTimetableAction(firstChildId));
  }

  return (
    <TimetableView
      viewerRole="parent"
      initialState={initialState}
      childList={childList}
      initialChildId={firstChildId}
      fetchChildTimetable={getChildTimetableAction}
    />
  );
}
