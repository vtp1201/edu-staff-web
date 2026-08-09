import { makeGetLinkedStudentsUseCase } from "@/bootstrap/di/parent-consent.di";
import {
  ParentDashboard,
  type ParentDashboardVm,
} from "@/features/parent/presentation/parent-dashboard";

/**
 * Parent overview. The children come from the parent's own linked-students read
 * (server-scoped to the token's memberId). The three per-child metrics stay
 * `null` — conduct is still mock-first and neither an attendance rate nor a
 * year average exists as an aggregate a parent may call — so the card shows a
 * dash rather than the invented 8.6 / 99% / "Tốt" it used to hardcode.
 */
export default async function ParentDashboardPage() {
  const result = await (await makeGetLinkedStudentsUseCase()).execute();

  const vm: ParentDashboardVm = {
    children: result.ok
      ? result.value.map((child) => ({
          studentId: child.studentId,
          fullName: child.fullName,
          className: child.className,
          avgScore: null,
          attendance: null,
          conduct: null,
        }))
      : [],
  };

  return <ParentDashboard vm={vm} />;
}
