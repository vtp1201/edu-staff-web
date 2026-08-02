"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ParentAttendanceScreen } from "./parent-attendance-screen";
import type { ParentAttendanceScreenVM } from "./parent-attendance-screen.i-vm";

/**
 * Client wrapper: child + date range are URL state, so switching either is a
 * navigation that makes the RSC re-fetch (same pattern as
 * `GradeBookContainer`). `useTransition` surfaces the in-flight state to the
 * switcher so a second tab can't be clicked mid-fetch.
 */
export function ParentAttendanceContainer({
  vm,
}: {
  vm: ParentAttendanceScreenVM;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function navigate(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) params.set(key, value);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  return (
    <ParentAttendanceScreen
      vm={vm}
      isLoading={isPending}
      onChildSwitch={(childId) => navigate({ childId })}
      onRangeChange={(next) => {
        const patch: Record<string, string> = {};
        if (next.startDate !== undefined) patch.startDate = next.startDate;
        if (next.endDate !== undefined) patch.endDate = next.endDate;
        if (Object.keys(patch).length > 0) navigate(patch);
      }}
      onRetry={() => startTransition(() => router.refresh())}
    />
  );
}
