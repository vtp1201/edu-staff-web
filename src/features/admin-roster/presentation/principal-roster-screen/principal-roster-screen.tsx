"use client";

import { School, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { ListError } from "@/components/shared/list-error";
import { ClassInfoCard } from "../student-roster-screen/components/class-info-card";
import { RosterBreadcrumb } from "../student-roster-screen/components/roster-breadcrumb";
import { RosterTable } from "../student-roster-screen/components/roster-table";
import type { PrincipalRosterScreenProps } from "./principal-roster-screen.i-vm";

/**
 * Read-only, per-class student roster for the `principal` role (US-E13.10) —
 * closes the previously-404 `/principal/students` sidebar link.
 *
 * Composes the SAME pieces as the admin `StudentRosterScreen`
 * (`RosterBreadcrumb` + `ClassInfoCard` + `RosterTable`) with zero duplicated
 * markup, but has no mutation contract at all: no Server Action props, no
 * confirm dialogs, no AddStudentPanel, and `RosterTable readOnly` omits the
 * bulk-select / remove / export controls from the DOM entirely (decision 0026 —
 * a variant of the existing table, not a fork).
 *
 * RBAC is enforced upstream by `(app)/principal/layout.tsx`; this component
 * renders whatever the RSC page hands it.
 */
export function PrincipalRosterScreen({
  vm,
  onClassChange,
  onRetry,
}: PrincipalRosterScreenProps) {
  const t = useTranslations("principalStudents");
  const tRoster = useTranslations("adminRoster");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClassChange = (classId: string) => {
    if (onClassChange) {
      onClassChange(classId);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("classId", classId);
    router.push(`?${params.toString()}`);
  };

  const handleRetry = () => {
    if (onRetry) onRetry();
    else router.refresh();
  };

  const header = (
    <div className="min-w-[240px] flex-1">
      {vm.currentClass && (
        <RosterBreadcrumb
          classList={vm.classes}
          currentClassId={vm.currentClass.id}
          onClassChange={handleClassChange}
        />
      )}
      <h1 className="mt-1.5 font-extrabold text-2xl text-edu-text-primary">
        {t("title")}
      </h1>
      <p className="mt-1 text-edu-text-secondary text-sm">{t("subtitle")}</p>
    </div>
  );

  // `<section>`, not `<main>`: AppShell already owns the `<main>` landmark
  // (`#app-shell-main`) and its `p-4 sm:p-6` gutter — nesting a second one
  // would duplicate the landmark and the padding.
  const shell = (children: React.ReactNode) => (
    <section className="mx-auto flex max-w-[1280px] flex-col gap-[18px]">
      {header}
      {children}
    </section>
  );

  if (vm.fetchError) {
    // `forbidden`/`unauthorized` can never be fixed by retrying with the same
    // session — omit the control rather than offer a dead one (ADR precedent
    // US-E13.8 AC-1.27, accessibility.md).
    const retryable =
      vm.fetchError !== "forbidden" && vm.fetchError !== "unauthorized";
    return shell(
      <ListError
        shape="bordered-card"
        iconSize={12}
        title={t("error.title")}
        description={tRoster(`errors.${vm.fetchError}`)}
        onRetry={handleRetry}
        retryLabel={tCommon("confirmDialog.retry")}
        retryIcon="refresh"
        showRetry={retryable}
      />,
    );
  }

  if (!vm.currentClass) {
    return shell(
      <div className="rounded-xl border border-edu-border bg-edu-card shadow-card">
        <EmptyState
          icon={School}
          title={t("emptyClasses.title")}
          body={t("emptyClasses.body")}
        />
      </div>,
    );
  }

  return shell(
    <>
      <ClassInfoCard
        cls={vm.currentClass}
        activeCount={vm.activeCount}
        transferredCount={vm.transferredCount}
      />
      {vm.roster.length === 0 ? (
        <div className="rounded-xl border border-edu-border bg-edu-card shadow-card">
          <EmptyState
            icon={Users}
            title={t("empty.title")}
            body={t("empty.body")}
          />
        </div>
      ) : (
        <RosterTable roster={vm.roster} readOnly />
      )}
    </>,
  );
}
