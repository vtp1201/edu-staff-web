import { permanentRedirect } from "next/navigation";
import { tenantUrl } from "@/bootstrap/tenant";

/**
 * Legacy `/student/exams` — the exam list is now the cross-subject exam view
 * of `/student/courses` (US-E24.4), sourced from the real `lms` course
 * timelines instead of the mock-era `MOCK_STUDENT_ID` exam read this page used
 * to do.
 *
 * The DETAIL route `/student/exams/[examId]` is deliberately untouched: it is
 * where an open exam's CTA lands, and it still resolves the exam through
 * `makeListExamsUseCase` (core has no single-exam GET).
 */
export default async function StudentExamsPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  permanentRedirect(
    `/${locale}${tenantUrl(tenant, "/student/courses")}?view=exam`,
  );
}
