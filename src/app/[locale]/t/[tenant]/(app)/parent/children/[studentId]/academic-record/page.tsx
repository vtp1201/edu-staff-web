import { makeGetChildListUseCase } from "@/bootstrap/di/grades.di";
import { tenantUrl } from "@/bootstrap/tenant";
import { AcademicRecordContainer } from "@/features/academic-records/presentation/academic-record-screen/academic-record-container";
import { buildAcademicRecordVM } from "@/features/academic-records/presentation/academic-record-screen/build-academic-record-vm";
import { buildChildSwitcherVM } from "@/features/academic-records/presentation/academic-record-screen/build-child-switcher-vm";

type Params = Promise<{ tenant: string; studentId: string }>;
type SearchParams = Promise<{ year?: string }>;

/**
 * A parent's view of one child's academic record, with the child selector
 * (US-E24.16). No manual role check: `parent/layout.tsx` already enforces
 * `role === "parent"` for every `/parent/*` route.
 *
 * Two reads, settled side by side: the RECORD is primary (its own failure is
 * already modelled as `vm.error` by `buildAcademicRecordVM`, including the 403
 * -> `forbidden` a foreign `studentId` earns from the BE), the linked-children
 * ROSTER is secondary and purely navigational. `allSettled` - not `all` - so a
 * roster failure costs the selector and NOTHING else; it is never surfaced as
 * an error, because telling a parent "something went wrong" while their child's
 * record renders correctly below would be a lie. The factory call sits inside
 * the settled promise on purpose: `makeGetChildListUseCase()` itself does
 * session/cookie work that can throw, and that throw must fail soft too.
 *
 * Proved by `page.test.ts`.
 */
export default async function ParentAcademicRecordPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { tenant, studentId } = await params;
  const { year } = await searchParams;

  const [recordResult, childListResult] = await Promise.allSettled([
    buildAcademicRecordVM({ role: "parent", studentId, year }),
    makeGetChildListUseCase().then((useCase) => useCase.execute()),
  ]);

  // The primary read has no fail-soft story: it already returns a VM for every
  // modelled failure, so a rejection here is a genuine defect and belongs on
  // the error boundary rather than behind a half-rendered screen.
  if (recordResult.status === "rejected") throw recordResult.reason;

  const childList =
    childListResult.status === "fulfilled" && childListResult.value.ok
      ? childListResult.value.data
      : [];

  return (
    <AcademicRecordContainer
      vm={{
        ...recordResult.value,
        // `undefined` for < 2 children and for a failed roster read alike.
        childSwitcher: buildChildSwitcherVM(childList, studentId),
      }}
      basePath={tenantUrl(tenant, "/parent/children")}
    />
  );
}
