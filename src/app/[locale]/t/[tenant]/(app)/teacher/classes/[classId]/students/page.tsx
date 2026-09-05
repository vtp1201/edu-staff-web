import { permanentRedirect } from "next/navigation";
import { classHubBase, classHubHref } from "@/shared/class-hub-href";

/**
 * Legacy roster route (US-E13.1) — the roster is now the class hub's students
 * tab (US-E24.8). `permanentRedirect` (308, not 307) because the move is
 * permanent: existing bookmarks and links should be rewritten.
 */
export default async function TeacherClassStudentsPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string; classId: string }>;
}) {
  const { locale, tenant, classId } = await params;
  permanentRedirect(
    classHubHref(classHubBase(locale, tenant), classId, "students"),
  );
}
