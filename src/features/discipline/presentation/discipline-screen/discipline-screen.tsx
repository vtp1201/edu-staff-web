"use client";

import { Award, CalendarDays, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { StatCardSkeletonGrid } from "@/components/shared/stat-card-skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/utils";
import { ConductTab } from "./components/conduct-tab";
import { LeaveTab } from "./components/leave-tab";
import { TableRowSkeleton } from "./components/table-row-skeleton";
import { ViolationsTab } from "./components/violations-tab";
import type {
  DisciplineScreenVM,
  DisciplineTab,
} from "./discipline-screen.i-vm";

export function DisciplineScreen(vm: DisciplineScreenVM) {
  const t = useTranslations("discipline");
  const tCommon = useTranslations("Common");
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
        {/* One status region for the whole loading block: screen readers
            announce the single logical loading event once, not once per
            skeleton block (A11Y-001 / WCAG 4.1.3). The nested stat grid opts
            out of its own live region via announce={false}. */}
        <div role="status" aria-busy="true" className="flex flex-col gap-6">
          <span className="sr-only">
            {tCommon("skeleton.loadingAriaLabel")}
          </span>
          {/* count=4: both violations-tab and conduct-tab render exactly 4
              StatCards, and violations is the default tab — 4 matches the real
              content shown, satisfying NFR-002 (zero CLS). */}
          <StatCardSkeletonGrid
            count={4}
            srLabel={tCommon("skeleton.loadingAriaLabel")}
            announce={false}
          />
          <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
            {["r1", "r2", "r3", "r4", "r5"].map((k) => (
              <TableRowSkeleton key={k} />
            ))}
          </div>
        </div>
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
