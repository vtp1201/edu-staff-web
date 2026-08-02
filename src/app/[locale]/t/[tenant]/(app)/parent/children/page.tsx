import { tenantUrl } from "@/bootstrap/tenant";
import { ChildrenOverviewScreen } from "@/features/parent/presentation/children-overview-screen/children-overview-screen";
import { fetchParentChildrenAction } from "./actions";

/**
 * "My children" index (US-E20.4) — the sidebar's `/parent/children` target,
 * which previously had no page (only the `[studentId]/academic-record` deep
 * link existed). No manual role check: `parent/layout.tsx` already enforces
 * `role === "parent"` for every `/parent/*` route.
 *
 * The RSC does NOT await the query (mirrors `ParentConsentSection`, NFR-005) —
 * it only supplies the tenant-scoped base path + the Server Action ref.
 */
export default async function ParentChildrenPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { tenant } = await params;

  return (
    <ChildrenOverviewScreen
      basePath={tenantUrl(tenant, "/parent/children")}
      onFetch={fetchParentChildrenAction}
    />
  );
}
