import { CalendarCheck, ShieldCheck, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ChildIdentityHeader } from "@/components/shared/child-identity-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";

/** One child on the overview. Metrics are `null` while nothing can supply them. */
export interface ParentDashboardChildVm {
  studentId: string;
  fullName: string;
  className?: string;
  /** Year average across subjects. */
  avgScore: string | null;
  /** Attendance rate, pre-formatted. */
  attendance: string | null;
  /** Conduct grade label. */
  conduct: string | null;
}

export interface ParentDashboardVm {
  children: ParentDashboardChildVm[];
}

/** Em dash for a figure this deployment cannot compute — never a made-up one. */
const UNKNOWN = "—";

/**
 * Parent overview. The two children on this screen used to be hardcoded — names,
 * classes, 8.6 / 99% / "Tốt" — which read as a real family's data. It now lists
 * the parent's REAL linked children; the three per-child metrics have no source
 * a parent may call yet (conduct is still mock-first, and there is no
 * attendance-rate or year-average aggregate), so they render a dash instead of
 * an invention.
 */
export async function ParentDashboard({ vm }: { vm: ParentDashboardVm }) {
  const t = await getTranslations("dashboard.parent");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("title")}
        </h1>
      </header>

      <section className="space-y-4">
        <h2 className="font-bold text-[15px] text-foreground">
          {t("childrenTitle")}
        </h2>

        {vm.children.length === 0 ? (
          <Card>
            <CardContent className="p-5">
              <p role="status" className="text-muted-foreground text-sm">
                {t("noChildren")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {vm.children.map((c) => (
              <Card key={c.studentId}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <ChildIdentityHeader
                    fullName={c.fullName}
                    subtitle={c.className}
                    tone="purple"
                    size="lg"
                    initials="single"
                  />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <StatCard
                      variant="mini"
                      icon={
                        // text-edu-success-text (#007A6E) = 5.4:1 on muted/50 bg — A11Y-004 / Decision 0027.
                        <Trophy className="size-4 text-edu-success-text" />
                      }
                      label={t("stats.avgScore")}
                      value={c.avgScore ?? UNKNOWN}
                    />
                    <StatCard
                      variant="mini"
                      icon={
                        // text-primary (#4570EA) = 4.56:1 on muted/50 bg — A11Y-005 / Decision 0027.
                        <CalendarCheck className="size-4 text-primary" />
                      }
                      label={t("stats.attendance")}
                      value={c.attendance ?? UNKNOWN}
                    />
                    <StatCard
                      variant="mini"
                      icon={<ShieldCheck className="size-4 text-edu-purple" />}
                      label={t("stats.conduct")}
                      value={c.conduct ?? UNKNOWN}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
