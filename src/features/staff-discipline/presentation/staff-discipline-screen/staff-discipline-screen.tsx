"use client";

import { ClipboardList, FileWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SDConductNotesTab } from "./sd-conduct-notes-tab";
import { SDViolationsTab } from "./sd-violations-tab";
import type { StaffDisciplineScreenVM } from "./staff-discipline-screen.i-vm";

/**
 * Staff-discipline screen — ONE role-conditional component serving BOTH
 * `/principal/staff-discipline` and `/teacher/staff-discipline` (ADR 0062, the
 * `discipline-screen` pattern).
 *
 * Thin orchestrator: it owns ONLY the active tab (client-only, no navigation —
 * FR-008). Each tab is its own container with its own query/mutations, so the two
 * tabs never share loading/error state (AC-010.3). ARIA tablist/tab/aria-selected
 * and arrow-key navigation come from the Radix-backed `Tabs` primitive
 * (AC-010.2) — no hand-rolled tab button.
 */
export type StaffDisciplineTab = "violations" | "conductNotes";

export interface StaffDisciplineScreenProps extends StaffDisciplineScreenVM {
  /** Storybook/deep-link convenience; defaults to the violations tab. */
  initialTab?: StaffDisciplineTab;
}

export function StaffDisciplineScreen({
  initialTab = "violations",
  ...vm
}: StaffDisciplineScreenProps) {
  const t = useTranslations("staffDiscipline");
  const tConduct = useTranslations("staffDiscipline.conductNotes");
  const [tab, setTab] = useState<StaffDisciplineTab>(initialTab);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-5 sm:px-8 sm:py-7">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("title")}
          </h1>
          {vm.viewerRole === "teacher" && (
            <StatusBadge tone="muted">{tConduct("readOnlyLabel")}</StatusBadge>
          )}
        </div>
        <p className="mt-1 text-edu-text-secondary text-sm">{t("subtitle")}</p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StaffDisciplineTab)}>
        <TabsList>
          <TabsTrigger value="violations" className="min-h-11">
            <FileWarning className="size-4" aria-hidden="true" />
            {t("tabs.violations")}
          </TabsTrigger>
          <TabsTrigger value="conductNotes" className="min-h-11">
            <ClipboardList className="size-4" aria-hidden="true" />
            {t("tabs.conductNotes")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="mt-4">
          <SDViolationsTab
            viewerRole={vm.viewerRole}
            viewerMemberId={vm.viewerMemberId}
            viewerStaffMemberId={vm.viewerStaffMemberId}
            initialViolations={vm.initialViolations}
            initialViolationsErrorKey={vm.initialViolationsErrorKey}
            staffRoster={vm.staffRoster}
            violationCategories={vm.violationCategories}
            listViolationsAction={vm.listViolationsAction}
            createViolationAction={vm.createViolationAction}
            submitViolationAction={vm.submitViolationAction}
            approveViolationAction={vm.approveViolationAction}
            rejectViolationAction={vm.rejectViolationAction}
          />
        </TabsContent>

        <TabsContent value="conductNotes" className="mt-4">
          <SDConductNotesTab
            viewerRole={vm.viewerRole}
            viewerMemberId={vm.viewerMemberId}
            viewerStaffMemberId={vm.viewerStaffMemberId}
            initialConductNotes={vm.initialConductNotes}
            initialConductNotesErrorKey={vm.initialConductNotesErrorKey}
            initialTermId={vm.initialTermId}
            staffRoster={vm.staffRoster}
            termOptions={vm.termOptions}
            listConductNotesAction={vm.listConductNotesAction}
            setConductNoteAction={vm.setConductNoteAction}
            submitConductNoteAction={vm.submitConductNoteAction}
            approveConductNoteAction={vm.approveConductNoteAction}
            rejectConductNoteAction={vm.rejectConductNoteAction}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
