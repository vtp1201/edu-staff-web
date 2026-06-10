import { BookOpen, CalendarCheck, ClipboardList, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const COURSES = [
  { id: 1, name: "Toán 10", progress: 72, tone: "bg-edu-info" },
  { id: 2, name: "Vật lý 10", progress: 45, tone: "bg-edu-purple" },
  { id: 3, name: "Ngữ văn 10", progress: 88, tone: "bg-edu-success" },
  { id: 4, name: "Tiếng Anh 10", progress: 30, tone: "bg-edu-warning" },
];

export async function StudentDashboard() {
  const t = await getTranslations("dashboard.student");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("title")}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("stats.courses")}
          value="8"
          icon={BookOpen}
          tone="primary"
        />
        <StatCard
          label={t("stats.assignments")}
          value="3"
          icon={ClipboardList}
          tone="warning"
        />
        <StatCard
          label={t("stats.avgScore")}
          value="8.4"
          icon={Trophy}
          tone="success"
          trend={{ dir: "up", value: "+0.3" }}
        />
        <StatCard
          label={t("stats.attendance")}
          value="98%"
          icon={CalendarCheck}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-[15px] font-bold text-foreground">
            {t("coursesTitle")}
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {COURSES.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-muted-foreground">{c.progress}%</span>
              </div>
              <Progress
                value={c.progress}
                className="h-1.5"
                indicatorClassName={c.tone}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
