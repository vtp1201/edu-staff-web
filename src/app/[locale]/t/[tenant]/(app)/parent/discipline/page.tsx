import { redirect } from "next/navigation";
import {
  makeGetChildConductSummaryUseCase,
  makeGetChildLeaveRequestsUseCase,
  makeGetChildrenUseCase,
  makeGetChildViolationsUseCase,
} from "@/bootstrap/di/discipline.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { tenantUrl } from "@/bootstrap/tenant";
import { DEFAULT_ROUTE } from "@/components/layout/app-shell/sidebar/nav-config";
import type { ChildEntity } from "@/features/discipline/domain/entities/child.entity";
import type { ConductSummaryEntity } from "@/features/discipline/domain/entities/conduct-summary.entity";
import type { LeaveRequestEntity } from "@/features/discipline/domain/entities/leave-request.entity";
import type { ViolationEntity } from "@/features/discipline/domain/entities/violation.entity";
import type { DisciplineFailure } from "@/features/discipline/domain/failures/discipline.failure";
import { ParentDisciplineScreen } from "@/features/discipline/presentation/parent-discipline/ParentDisciplineScreen";
import {
  getChildConductAction,
  getChildLeaveRequestsAction,
  getChildViolationsAction,
  submitChildLeaveRequestAction,
} from "./actions";

/**
 * Parent multi-child discipline & leave view (US-E09.4). RBAC gate (TR-010):
 * role must be `parent` — fires before any data fetch. The tenant app-shell
 * layout already enforces auth + tenant membership; this adds the role check.
 */
export default async function ParentDisciplinePage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  const token = await getAccessToken();
  const role = decodeRoleClaim(token ?? "");

  if (role === null) {
    redirect(`/${locale}/select-tenant`);
  }
  if (role !== "parent") {
    redirect(`/${locale}${tenantUrl(tenant, DEFAULT_ROUTE[role])}`);
  }

  let children: ChildEntity[] = [];
  let initialConduct: ConductSummaryEntity | null = null;
  let initialViolations: ViolationEntity[] = [];
  let initialLeaveRequests: LeaveRequestEntity[] = [];
  let loadErrorKey: DisciplineFailure["type"] | undefined;
  let initialChildId = "";

  try {
    children = await (await makeGetChildrenUseCase()).execute();
    const first = children[0];
    if (first) {
      initialChildId = first.childId;
      [initialConduct, initialViolations, initialLeaveRequests] =
        await Promise.all([
          (await makeGetChildConductSummaryUseCase()).execute(first.childId),
          (await makeGetChildViolationsUseCase()).execute(first.childId),
          (await makeGetChildLeaveRequestsUseCase()).execute(first.childId),
        ]);
    }
  } catch (err) {
    loadErrorKey =
      err && typeof err === "object" && "type" in err
        ? (err as DisciplineFailure).type
        : "network-error";
  }

  return (
    <ParentDisciplineScreen
      childList={children}
      initialChildId={initialChildId}
      initialConduct={initialConduct}
      initialViolations={initialViolations}
      initialLeaveRequests={initialLeaveRequests}
      loadErrorKey={loadErrorKey}
      submitChildLeaveRequestAction={submitChildLeaveRequestAction}
      getChildConductAction={getChildConductAction}
      getChildViolationsAction={getChildViolationsAction}
      getChildLeaveRequestsAction={getChildLeaveRequestsAction}
    />
  );
}
