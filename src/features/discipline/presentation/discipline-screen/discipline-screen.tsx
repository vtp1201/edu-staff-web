"use client";

import { Award, CalendarDays, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/utils";
import { ConductTab } from "./components/conduct-tab";
import { LeaveTab } from "./components/leave-tab";
import { ViolationsTab } from "./components/violations-tab";
import type {
  DisciplineScreenVM,
  DisciplineTab,
} from "./discipline-screen.i-vm";

export function DisciplineScreen(vm: DisciplineScreenVM) {
  const t = useTranslations("discipline");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<DisciplineTab>(vm.initialTab);

  const pendingLeave = vm.leaveRequests.filter(
    (r) => r.status === "pending",
  ).length;

  const handleTabChange = (value: string) => {
    const next = value as DisciplineTab;
    setTab(next);
    if (vm.onTabChange) {
      vm.onTabChange(next);
      return;
    }
    const params = new URLSearchParams(searchParams?.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs: { id: DisciplineTab; icon: typeof X; badge?: number }[] = [
    { id: "violations", icon: X, badge: vm.violations.length },
    { id: "conduct", icon: Award },
    { id: "leave", icon: CalendarDays, badge: pendingLeave },
  ];

  const header = (
    <header>
      <h1 className="font-extrabold text-2xl text-foreground">{t("title")}</h1>
      <p className="mt-1 text-edu-text-secondary text-sm">{t("subtitle")}</p>
    </header>
  );

  if (vm.isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        {header}
        <div
          className="grid grid-cols-2 gap-3.5 lg:grid-cols-4"
          aria-busy="true"
        >
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton
              key={k}
              className="h-20 rounded-[var(--edu-radius-card)]"
            />
          ))}
        </div>
        <Skeleton className="h-64 rounded-[var(--edu-radius-card)]" />
      </div>
    );
  }

  if (vm.loadErrorKey) {
    return (
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        {header}
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-[var(--edu-radius-card)] border border-edu-error/30 bg-edu-error/10 px-5 py-4 text-edu-error-text text-sm"
        >
          <p>{t(`errors.${vm.loadErrorKey}`)}</p>
          {vm.onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={vm.onRetry}
            >
              {t("retry")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8">
      {header}

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          {tabs.map(({ id, icon: Icon, badge }) => (
            <TabsTrigger key={id} value={id}>
              <Icon className="size-4" aria-hidden="true" />
              {t(`tabs.${id}`)}
              {badge && badge > 0 ? (
                <span
                  className={cn(
                    "ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 font-extrabold text-[10px]",
                    tab === id
                      ? "bg-primary/15 text-edu-text-primary"
                      : "bg-edu-error-dark-light text-edu-error-dark",
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="violations">
          <ViolationsTab vm={vm} violations={vm.violations} />
        </TabsContent>
        <TabsContent value="conduct">
          <ConductTab vm={vm} conductSummary={vm.conductSummary} />
        </TabsContent>
        <TabsContent value="leave">
          <LeaveTab vm={vm} leaveRequests={vm.leaveRequests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
