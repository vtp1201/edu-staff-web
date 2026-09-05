import { permanentRedirect } from "next/navigation";
import { tenantUrl } from "@/bootstrap/tenant";

/**
 * Legacy `/student/assignments` (US-E24.1) — the class's assignments are now
 * the cross-subject view of the courses screen (US-E24.4), which shows every
 * course's assignments in one deadline-ordered list instead of a parallel
 * screen fed by a second endpoint.
 *
 * `permanentRedirect` (308, not 307) because the move is permanent: the
 * sidebar entry is gone and existing bookmarks should be rewritten.
 */
export default async function StudentAssignmentsPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  permanentRedirect(
    `/${locale}${tenantUrl(tenant, "/student/courses")}?view=assignment`,
  );
}
