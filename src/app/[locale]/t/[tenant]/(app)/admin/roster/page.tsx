import { Suspense } from "react";
import { makeRosterRepository } from "@/bootstrap/di/admin-roster.di";
import { StudentRosterScreen } from "@/features/admin-roster/presentation/student-roster-screen/student-roster-screen";
import type { StudentRosterScreenVm } from "@/features/admin-roster/presentation/student-roster-screen/student-roster-screen.i-vm";
import {
  enrollAction,
  transferAction,
  unenrollAction,
  unenrollManyAction,
} from "./actions";
import { RosterSkeleton } from "./roster-skeleton";

async function RosterContent({ classId }: { classId?: string }) {
  const repo = await makeRosterRepository();
  const classesResult = await repo.getClasses({});
  const classes = classesResult.ok ? classesResult.data : [];

  if (classes.length === 0) {
    // No classes configured — render the screen with an empty class shell.
    return null;
  }

  const currentClass = classes.find((c) => c.id === classId) ?? classes[0];

  const [rosterResult, poolResult] = await Promise.all([
    repo.getClassRoster(currentClass.id),
    repo.getSearchPool(currentClass.id),
  ]);

  const roster = rosterResult.ok ? rosterResult.data : [];
  const searchPool = poolResult.ok ? poolResult.data : [];

  const vm: StudentRosterScreenVm = {
    classes,
    currentClass,
    roster,
    activeCount: roster.filter((s) => s.status === "active").length,
    transferredCount: roster.filter((s) => s.status === "transferred").length,
    searchPool,
  };

  // Bind the active class to the screen's action contract (server actions).
  async function onEnroll(studentId: string) {
    "use server";
    return enrollAction(currentClass.id, studentId);
  }
  async function onUnenroll(studentId: string) {
    "use server";
    return unenrollAction(currentClass.id, studentId);
  }
  async function onUnenrollMany(studentIds: string[]) {
    "use server";
    return unenrollManyAction(currentClass.id, studentIds);
  }
  async function onTransfer(studentId: string, fromClassId: string) {
    "use server";
    return transferAction(studentId, fromClassId, currentClass.id);
  }

  return (
    <StudentRosterScreen
      key={currentClass.id}
      vm={vm}
      onEnroll={onEnroll}
      onUnenroll={onUnenroll}
      onUnenrollMany={onUnenrollMany}
      onTransfer={onTransfer}
    />
  );
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  return (
    <Suspense fallback={<RosterSkeleton />}>
      <RosterContent classId={classId} />
    </Suspense>
  );
}
