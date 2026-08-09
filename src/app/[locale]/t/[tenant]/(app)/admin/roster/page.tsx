import { Suspense } from "react";
import { makeRosterRepository } from "@/bootstrap/di/admin-roster.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
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
  // See the principal roster page: core's admin branch returns NOTHING for an
  // unfiltered class list, so the year has to be explicit.
  const classesResult = await repo.getClasses({
    academicYear: await resolveCurrentAcademicYear().catch(() => undefined),
  });
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

  // A FAILED roster read is not an empty class (US-E18.35 review). Since
  // `getClassRoster` became a real HTTP call, `{ ok: false }` is reachable in
  // production — rendering `[]` would show "no students" on a screen whose
  // enroll/transfer controls stay live, and an operator could not tell the two
  // apart. Thread the failure key instead; the screen renders the error card
  // and drops every mutation affordance.
  const roster = rosterResult.ok ? rosterResult.data : [];
  // The candidate pool is DECORATION for the enroll panel, so its failure does
  // not blank a roster that loaded fine. But since US-E18.41 it IS a real
  // two-service read (IAM STUDENT directory MINUS core's enrolled ids), so the
  // failure must be shown IN the panel — an empty pool otherwise reads as "there
  // is nobody left to enroll".
  const searchPool = poolResult.ok ? poolResult.data : [];

  const vm: StudentRosterScreenVm = {
    classes,
    currentClass,
    roster,
    activeCount: roster.filter((s) => s.status === "active").length,
    transferredCount: roster.filter((s) => s.status === "transferred").length,
    searchPool,
    fetchError: rosterResult.ok ? null : rosterResult.error.type,
    poolError: poolResult.ok ? null : poolResult.error.type,
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
