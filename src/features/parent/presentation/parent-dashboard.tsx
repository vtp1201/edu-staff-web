import { CalendarCheck, ShieldCheck, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StatCard } from "@/components/shared/stat-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const CHILDREN = [
  {
    id: 1,
    name: "Nguyễn Minh An",
    className: "10A1",
    avgScore: "8.6",
    attendance: "99%",
    conduct: "Tốt",
  },
  {
    id: 2,
    name: "Nguyễn Bảo Châu",
    className: "7B3",
    avgScore: "7.9",
    attendance: "97%",
    conduct: "Tốt",
  },
];

export async function ParentDashboard() {
  const t = await getTranslations("dashboard.parent");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-foreground">
          {t("title")}
        </h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-[15px] font-bold text-foreground">
          {t("childrenTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {CHILDREN.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-edu-purple/15 font-semibold text-edu-purple">
                      {c.name.split(" ").at(-1)?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.className}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatCard
                    variant="mini"
                    icon={<Trophy className="size-4 text-edu-success" />}
                    label={t("stats.avgScore")}
                    value={c.avgScore}
                  />
                  <StatCard
                    variant="mini"
                    icon={<CalendarCheck className="size-4 text-edu-info" />}
                    label={t("stats.attendance")}
                    value={c.attendance}
                  />
                  <StatCard
                    variant="mini"
                    icon={<ShieldCheck className="size-4 text-edu-purple" />}
                    label={t("stats.conduct")}
                    value={c.conduct}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
