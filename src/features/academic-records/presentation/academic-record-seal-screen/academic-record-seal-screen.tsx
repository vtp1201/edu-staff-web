"use client";

import { AlertTriangle, Award, ChevronRight, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AcademicRecordSealScreenVM,
  SealTabId,
} from "./academic-record-seal-screen.i-vm";
import { AcademicRecordSealSkeleton } from "./academic-record-seal-skeleton";
import { SealTab } from "./components/seal-tab";
import { UnsealTab } from "./components/unseal-tab";

export interface AcademicRecordSealScreenProps {
  vm: AcademicRecordSealScreenVM;
  /** NOT-OK gate link → grade-approval (E14.4). Router-driven; stories omit. */
  onGoToApproval?: () => void;
}

/** Presentational shell — breadcrumb/title + tabs (Seal | Unseal). AC-1 skeleton
 * while the initial fetch is in flight; AC-11 all copy via `academicRecordSeal`. */
export function AcademicRecordSealScreen({
  vm,
  onGoToApproval,
}: AcademicRecordSealScreenProps) {
  const t = useTranslations("academicRecordSeal");

  const header = (
    <div className="space-y-3">
      <nav
        aria-label={t("breadcrumb.record")}
        className="flex items-center gap-1.5 text-muted-foreground text-xs"
      >
        <Home aria-hidden className="size-3" />
        <span>{t("breadcrumb.home")}</span>
        <ChevronRight aria-hidden className="size-3" />
        <span className="font-bold text-foreground">
          {t("breadcrumb.record")}
        </span>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Award aria-hidden className="size-6 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {t("subtitle")}
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
          <span className="text-muted-foreground text-xs">
            {t("signedInAs")}
          </span>
          <span className="font-bold text-foreground text-sm">
            {vm.currentAdminName}
          </span>
          <span className="rounded bg-edu-error/15 px-1.5 py-0.5 font-extrabold text-edu-error-text text-xs tracking-wide">
            {t("roleAdmin")}
          </span>
        </span>
      </div>
    </div>
  );

  if (vm.isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <AcademicRecordSealSkeleton />
      </div>
    );
  }

  if (vm.error) {
    return (
      <div className="space-y-6">
        {header}
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-edu-error/30 bg-edu-error/10 p-8 text-center"
        >
          <AlertTriangle aria-hidden className="size-6 text-edu-error-text" />
          <p className="text-foreground text-sm">{t(`errors.${vm.error}`)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <Tabs
        value={vm.activeTab}
        onValueChange={(v) => vm.onTabChange(v as SealTabId)}
      >
        <TabsList>
          <TabsTrigger value="seal">{t("tabs.seal")}</TabsTrigger>
          <TabsTrigger
            value="unseal"
            aria-label={
              vm.pendingUnsealCount > 0
                ? t("tabs.unsealWithCount", { count: vm.pendingUnsealCount })
                : undefined
            }
          >
            {t("tabs.unseal")}
            {vm.pendingUnsealCount > 0 && (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-edu-warning/20 px-1.5 font-bold text-edu-warning-foreground text-xs tabular-nums">
                {vm.pendingUnsealCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="seal" className="mt-4">
          <SealTab vm={vm.seal} onGoToApproval={onGoToApproval ?? (() => {})} />
        </TabsContent>
        <TabsContent value="unseal" className="mt-4">
          <UnsealTab vm={vm.unseal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
