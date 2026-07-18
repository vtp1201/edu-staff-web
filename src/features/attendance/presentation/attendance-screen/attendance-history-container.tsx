"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AttendanceDaySummary } from "../../domain/entities/attendance-day-summary.entity";
import { AttendanceHistoryTab } from "./attendance-history-tab";
import { attendanceKeys } from "./attendance-query-keys";
import type { AttendanceActionResult } from "./attendance-screen.i-vm";

type Props = {
  classId?: string;
  getHistoryAction: (
    classId: string,
    from: string,
    to: string,
  ) => Promise<AttendanceActionResult<AttendanceDaySummary[]>>;
};

const DEFAULT_WINDOW_DAYS = 7;

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (DEFAULT_WINDOW_DAYS - 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

/**
 * Client container for the history tab (US-E13.2, ADR `0058` §5, state
 * architecture §3/§6) — the bounded fan-out is an implementation detail
 * hidden behind ONE cached query per (classId, from, to); the today-tab stays
 * RSC + Server Action (unchanged pattern), only the history tab needs
 * re-triggerable client-side fetching.
 */
export function AttendanceHistoryContainer({
  classId,
  getHistoryAction,
}: Props) {
  const range = useMemo(defaultRange, []);

  const query = useQuery({
    queryKey: attendanceKeys.history(classId ?? "", range.from, range.to),
    enabled: Boolean(classId),
    queryFn: async () => {
      const result = await getHistoryAction(
        classId as string,
        range.from,
        range.to,
      );
      if (!result.ok) throw new Error(result.errorKey);
      return result.data;
    },
  });

  return (
    <AttendanceHistoryTab
      history={query.data ?? []}
      isLoading={query.isPending && Boolean(classId)}
      isError={query.isError}
    />
  );
}
