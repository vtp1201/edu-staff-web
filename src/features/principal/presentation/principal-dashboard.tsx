import {
  AlertTriangle,
  GraduationCap,
  School,
  UserCog,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** What the school overview can say about itself right now. */
export interface PrincipalDashboardVm {
  /** Classes in the current academic year. */
  classCount: number | null;
  /** Enrolled students across those classes. */
  studentCount: number | null;
  /** Staff count — `null` until the caller can read the member directory. */
  teacherCount: number | null;
  /** Today's attendance rate (0–100) — `null` while no aggregate exists. */
  attendanceRate: number | null;
}

/** Em dash for a figure this deployment cannot compute — never a made-up one. */
const UNKNOWN = "—";

/**
 * School overview. Every tile used to be a hardcoded number (48 teachers, 1,240
 * students, 96.4% attendance) with three invented Vietnamese alert strings — a
 * demo mock that read as real data. Now it shows what the BE can actually
 * answer and an honest dash for what it cannot; the alert feed has no source at
 * all yet, so it says so instead of inventing three items.
 */
export async function PrincipalDashboard({ vm }: { vm: PrincipalDashboardVm }) {
  const t = await getTranslations("dashboard.principal");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard
          label={t("stats.teachers")}
          value={vm.teacherCount === null ? UNKNOWN : String(vm.teacherCount)}
          icon={UserCog}
          tone="success"
        />
        <StatCard
          label={t("stats.students")}
          value={vm.studentCount === null ? UNKNOWN : String(vm.studentCount)}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label={t("stats.classes")}
          value={vm.classCount === null ? UNKNOWN : String(vm.classCount)}
          icon={School}
          tone="info"
        />
        <StatCard
          label={t("stats.attendance")}
          value={
            vm.attendanceRate === null
              ? UNKNOWN
              : `${vm.attendanceRate.toFixed(1)}%`
          }
          icon={GraduationCap}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="flex items-center gap-2 font-bold text-[15px] text-foreground">
            <AlertTriangle className="size-4 text-edu-warning" />
            {t("alertsTitle")}
          </h2>
        </CardHeader>
        <CardContent>
          <p
            role="status"
            className="py-6 text-center text-muted-foreground text-sm"
          >
            {t("alertsEmpty")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
