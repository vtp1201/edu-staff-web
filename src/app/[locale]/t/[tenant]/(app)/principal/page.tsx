import { makeClassManagementRepository } from "@/bootstrap/di/class-management.di";
import { makeSearchMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeTenantId } from "@/bootstrap/lib/jwt";
import { resolveCurrentAcademicYear } from "@/bootstrap/lib/resolve-current-term";
import {
  PrincipalDashboard,
  type PrincipalDashboardVm,
} from "@/features/principal/presentation/principal-dashboard";

/** Staff headcount — readable again since BE fixed the tenant-members gate
 *  (reply 2026-08-09 ask #8: a group middleware was leaking onto nested
 *  routes). `null` on any failure, which renders a dash, never a guess. */
async function countTeachers(): Promise<number | null> {
  const tenantId = decodeTenantId((await getAccessToken()) ?? "");
  if (!tenantId) return null;
  const result = await (await makeSearchMembersUseCase())
    .execute({ tenantId, role: "TEACHER" })
    .catch(() => null);
  return result?.ok ? result.value.length : null;
}

/**
 * School overview. Classes + students come from the class listing (it carries
 * `studentCount` per class since BE US-173); teachers from the IAM directory.
 * Attendance still has no rollup endpoint — BE's own advice (ask #10) is to
 * keep the dash rather than fan out one call per class for a single figure.
 */
export default async function PrincipalDashboardPage() {
  const academicYear = await resolveCurrentAcademicYear().catch(
    () => undefined,
  );
  const [classesResult, teacherCount] = await Promise.all([
    (await makeClassManagementRepository()).listClasses({ academicYear }),
    countTeachers(),
  ]);

  const classes = classesResult.ok ? classesResult.value.data : null;
  const vm: PrincipalDashboardVm = {
    classCount: classes?.length ?? null,
    studentCount:
      classes?.reduce((total, cls) => total + cls.studentCount, 0) ?? null,
    teacherCount,
    attendanceRate: null,
  };

  return <PrincipalDashboard vm={vm} />;
}
