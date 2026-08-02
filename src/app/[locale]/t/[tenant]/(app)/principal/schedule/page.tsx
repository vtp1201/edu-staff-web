import { TimetableView } from "@/features/timetable/presentation/timetable-view/timetable-view";
import { toDataState } from "@/features/timetable/presentation/timetable-view/timetable-view.derive";
import type { TimetableDataState } from "@/features/timetable/presentation/timetable-view/timetable-view.i-vm";
import {
  getMemberTimetableAction,
  getPrincipalTeacherListAction,
} from "./actions";

/**
 * Principal schedule (US-E15.3) — closes the dead `/principal/schedule` sidebar
 * link. Mirrors `parent/schedule/page.tsx`: RSC-seed the first roster member's
 * week, hand the picker + the re-fetch action to the client component. The
 * `/principal/*` layout already enforces the role gate; the actions re-check it
 * (Server Actions carry no route protection of their own).
 */
export default async function PrincipalSchedulePage() {
  const teacherRes = await getPrincipalTeacherListAction();
  const teacherList = teacherRes.ok ? teacherRes.data : [];
  const firstTeacherId = teacherList[0]?.teacherId;

  let initialState: TimetableDataState;
  if (!firstTeacherId) {
    initialState = teacherRes.ok
      ? { status: "empty" }
      : { status: "error", errorKey: teacherRes.errorKey };
  } else {
    initialState = toDataState(await getMemberTimetableAction(firstTeacherId));
  }

  return (
    <TimetableView
      viewerRole="principal"
      initialState={initialState}
      teacherList={teacherList}
      initialTeacherId={firstTeacherId}
      fetchMemberTimetable={getMemberTimetableAction}
    />
  );
}
