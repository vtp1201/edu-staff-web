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

const ALERTS = [
  { id: 1, text: "3 lớp chưa điểm danh hôm nay" },
  { id: 2, text: "5 sổ đầu bài chờ duyệt" },
  { id: 3, text: "2 đơn nghỉ phép chờ xử lý" },
];

export async function PrincipalDashboard() {
  const t = await getTranslations("dashboard.principal");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("title")}
        </h1>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard
          label={t("stats.teachers")}
          value="48"
          icon={UserCog}
          tone="success"
        />
        <StatCard
          label={t("stats.students")}
          value="1,240"
          icon={Users}
          tone="primary"
          trend={{ dir: "up", value: "+24" }}
        />
        <StatCard
          label={t("stats.classes")}
          value="32"
          icon={School}
          tone="info"
        />
        <StatCard
          label={t("stats.attendance")}
          value="96.4%"
          icon={GraduationCap}
          tone="warning"
          trend={{ dir: "down", value: "-0.5%" }}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
            <AlertTriangle className="size-4 text-edu-warning" />
            {t("alertsTitle")}
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {ALERTS.map((a) => (
              <li key={a.id} className="px-6 py-3 text-sm text-foreground">
                {a.text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
