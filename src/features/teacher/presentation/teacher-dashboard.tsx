import {
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/shared/utils";

type PeriodStatus = "done" | "live" | "upcoming";
const SCHEDULE: {
  period: number;
  time: string;
  className: string;
  subject: string;
  status: PeriodStatus;
}[] = [
  {
    period: 1,
    time: "07:15",
    className: "10A1",
    subject: "Toán",
    status: "done",
  },
  {
    period: 2,
    time: "08:05",
    className: "11B2",
    subject: "Toán",
    status: "done",
  },
  {
    period: 3,
    time: "09:10",
    className: "10A1",
    subject: "Toán",
    status: "live",
  },
  {
    period: 4,
    time: "10:00",
    className: "12C1",
    subject: "Toán",
    status: "upcoming",
  },
  {
    period: 5,
    time: "10:55",
    className: "11B2",
    subject: "Toán",
    status: "upcoming",
  },
];

const STATUS_TONE: Record<PeriodStatus, string> = {
  done: "bg-muted text-muted-foreground",
  live: "bg-edu-success/15 text-edu-success",
  upcoming: "bg-edu-warning/15 text-edu-warning-foreground",
};

export async function TeacherDashboard() {
  const t = await getTranslations("dashboard.teacher");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("greeting")}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("stats.classes")}
          value="6"
          icon={BookOpenCheck}
          tone="primary"
        />
        <StatCard
          label={t("stats.students")}
          value="214"
          icon={Users}
          tone="info"
          trend={{ dir: "up", value: "+3" }}
        />
        <StatCard
          label={t("stats.attendance")}
          value="97%"
          icon={ClipboardList}
          tone="success"
          trend={{ dir: "up", value: "+1.2%" }}
        />
        <StatCard
          label={t("stats.pending")}
          value="4"
          icon={CalendarClock}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-[15px] font-bold text-foreground">
            {t("scheduleTitle")}
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {SCHEDULE.map((p) => (
              <li
                key={p.period}
                className={cn(
                  "flex items-center gap-4 px-6 py-3",
                  p.status === "live" && "border-l-[3px] border-edu-success",
                )}
              >
                <span className="w-12 text-sm font-bold text-muted-foreground">
                  {p.time}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {p.className} · {p.subject}
                  </div>
                </div>
                <Badge className={cn("border-0", STATUS_TONE[p.status])}>
                  {t(`status.${p.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
