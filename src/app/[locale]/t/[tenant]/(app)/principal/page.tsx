import { makeClassManagementRepository } from "@/bootstrap/di/class-management.di";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import {
  PrincipalDashboard,
  type PrincipalDashboardVm,
} from "@/features/principal/presentation/principal-dashboard";

/**
 * School overview. The class listing is the one aggregate an admin-tier caller
 * can read today: it carries `studentCount` per class since BE US-173, so the
 * class and student tiles are real. Staff headcount needs the IAM member
 * directory (403 for this role — FE ask #8) and attendance has no rate
 * aggregate at all, so both stay `null` and render a dash rather than a
 * plausible-looking invention.
 */
export default async function PrincipalDashboardPage() {
  const academicYear = await resolveCurrentAcademicYear().catch(
    () => undefined,
  );
  // `academicYear` is mandatory for an admin-tier caller — core answers an
  // unfiltered `GET /classes` with an empty list for this branch.
  const result = await (await makeClassManagementRepository()).listClasses({
    academicYear,
  });

  const classes = result.ok ? result.value.data : null;
  const vm: PrincipalDashboardVm = {
    classCount: classes?.length ?? null,
    studentCount:
      classes?.reduce((total, cls) => total + cls.studentCount, 0) ?? null,
    teacherCount: null,
    attendanceRate: null,
  };

  return <PrincipalDashboard vm={vm} />;
}
