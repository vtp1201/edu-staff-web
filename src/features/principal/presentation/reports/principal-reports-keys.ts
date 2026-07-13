import type { Term } from "@/features/principal/domain/reports/entities/reports-summary.entity";

/**
 * Query-key hierarchy for the 4 region queries (state-design.md §4). Pure TS —
 * safe to import client-side. `termId` is embedded in every key so distinct
 * terms are distinct cache entries; that alone discards stale-term responses on
 * a rapid term switch (AC-01.4), no hand-rolled race guard needed.
 */
export const principalReportsKeys = {
  all: () => ["principal", "reports"] as const,
  summary: (termId: Term) =>
    ["principal", "reports", "summary", termId] as const,
  subjectAverages: (termId: Term) =>
    ["principal", "reports", "subject-averages", termId] as const,
  attendanceTrend: (termId: Term) =>
    ["principal", "reports", "attendance-trend", termId] as const,
  list: (termId: Term) => ["principal", "reports", "list", termId] as const,
} as const;
