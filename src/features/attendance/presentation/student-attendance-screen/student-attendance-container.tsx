"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StudentAttendanceScreen } from "./student-attendance-screen";
import type { StudentAttendanceScreenVM } from "./student-attendance-screen.i-vm";

/**
 * Client wrapper for `/student/attendance` — the screen has no URL state to
 * drive (the range is resolved server-side), so the only interaction is a retry,
 * which re-runs the RSC. `useTransition` keeps the retry from firing twice while
 * the refresh is in flight.
 */
export function StudentAttendanceContainer({
  vm,
}: {
  vm: StudentAttendanceScreenVM;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <StudentAttendanceScreen
      vm={vm}
      onRetry={() => startTransition(() => router.refresh())}
    />
  );
}
