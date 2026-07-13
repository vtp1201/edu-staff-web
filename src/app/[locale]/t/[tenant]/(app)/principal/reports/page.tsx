import type { Term } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import { ReportsScreen } from "@/features/principal/presentation/reports/reports-screen";
import {
  generateReportAction,
  getAttendanceTrendAction,
  getPeriodicReportsAction,
  getReportsSummaryAction,
  getSubjectAveragesAction,
} from "./actions";

type SearchParams = Promise<{ termId?: string }>;

const VALID_TERMS: Term[] = ["HK1", "HK2", "FULL_YEAR"];

/**
 * Thin async RSC (state-design.md §9): resolves `initialTerm` from
 * `searchParams` (default/clamp to "HK2") and wires the 5 Server Action refs.
 * NO `bootstrap/di` call, NO data fetch here — all 4 regions fetch client-side
 * for independent per-region loading/error/empty/success. `(app)/layout.tsx`
 * already provides `ReactQueryProvider`; the sibling `layout.tsx` guards the
 * principal-only role gate.
 */
export default async function PrincipalReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { termId } = await searchParams;
  const initialTerm: Term = VALID_TERMS.includes(termId as Term)
    ? (termId as Term)
    : "HK2";

  return (
    <ReportsScreen
      initialTerm={initialTerm}
      getReportsSummaryAction={getReportsSummaryAction}
      getSubjectAveragesAction={getSubjectAveragesAction}
      getAttendanceTrendAction={getAttendanceTrendAction}
      getPeriodicReportsAction={getPeriodicReportsAction}
      generateReportAction={generateReportAction}
    />
  );
}
