import { CalendarCheck, ShieldCheck, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
                  <ChildStat
                    icon={<Trophy className="size-4 text-edu-success" />}
                    label={t("stats.avgScore")}
                    value={c.avgScore}
                  />
                  <ChildStat
                    icon={<CalendarCheck className="size-4 text-edu-info" />}
                    label={t("stats.attendance")}
                    value={c.attendance}
                  />
                  <ChildStat
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

function ChildStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--edu-radius-btn)] bg-muted/50 p-2">
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
