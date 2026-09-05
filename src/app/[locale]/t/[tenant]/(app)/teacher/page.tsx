import { TeacherDashboard } from "@/features/teacher/presentation/teacher-dashboard";

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ locale: string; tenant: string }>;
}) {
  const { locale, tenant } = await params;
  return <TeacherDashboard locale={locale} tenant={tenant} />;
}
