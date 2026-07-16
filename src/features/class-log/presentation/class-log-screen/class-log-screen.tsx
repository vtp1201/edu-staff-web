"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { HomeroomEntry } from "../../domain/entities/homeroom-entry.entity";
import type { HomeroomEntryStatus } from "../../domain/entities/homeroom-entry-status.entity";
import type { ClassLogScreenVM } from "./class-log-screen.i-vm";
import { ClassLogEntryDetail } from "./components/class-log-entry-detail";
import {
  ClassLogEntryForm,
  type ClassLogFormValues,
} from "./components/class-log-entry-form";
import { ClassLogEntryList } from "./components/class-log-entry-list";
import { ClassLogStatsRow } from "./components/class-log-stats-row";

type View = "list" | "new" | "detail";

export function ClassLogScreen(props: ClassLogScreenVM) {
  const {
    classId,
    className,
    entries,
    isPrincipal,
    filterStatus: initialFilter,
    createEntryAction,
    submitEntryAction,
    reviseEntryAction,
    approveEntryAction,
    rejectEntryAction,
  } = props;
  const t = useTranslations("classLog");

  const [view, setView] = useState<View>("list");
  const [localEntries, setLocalEntries] = useState<HomeroomEntry[]>(entries);
  const [selected, setSelected] = useState<HomeroomEntry | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    HomeroomEntryStatus | undefined
  >(initialFilter);
  const [isPending, startTransition] = useTransition();

  const upsert = (entry: HomeroomEntry) => {
    setLocalEntries((prev) => {
      const idx = prev.findIndex((e) => e.entryId === entry.entryId);
      if (idx === -1) return [entry, ...prev];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
  };

  const handleCreate = (values: ClassLogFormValues, asDraft: boolean) => {
    startTransition(async () => {
      const res = await createEntryAction(
        classId,
        values.entryDate,
        values.summary,
        values.notableEvents || undefined,
      );
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      let entry = res.entry;
      if (!asDraft) {
        const sub = await submitEntryAction(classId, entry.entryId);
        if (!sub.ok) {
          upsert(entry);
          toast.error(t(`errors.${sub.errorKey}`));
          setView("list");
          return;
        }
        entry = sub.entry;
      }
      upsert(entry);
      toast.success(t("form.saved"));
      setView("list");
    });
  };

  const handleSubmit = (entry: HomeroomEntry) => {
    startTransition(async () => {
      const res = await submitEntryAction(classId, entry.entryId);
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      upsert(res.entry);
      setSelected(res.entry);
      toast.success(t("form.saved"));
    });
  };

  const handleRevise = (entry: HomeroomEntry) => {
    startTransition(async () => {
      const res = await reviseEntryAction(classId, entry.entryId);
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      upsert(res.entry);
      setSelected(res.entry);
      toast.success(t("form.saved"));
    });
  };

  const handleApprove = (entry: HomeroomEntry) => {
    startTransition(async () => {
      const res = await approveEntryAction(classId, entry.entryId);
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      upsert(res.entry);
      setSelected(res.entry);
      toast.success(t("detail.approvedLabel"));
    });
  };

  const handleReject = (entry: HomeroomEntry, reason: string) => {
    startTransition(async () => {
      const res = await rejectEntryAction(
        classId,
        entry.entryId,
        reason || undefined,
      );
      if (!res.ok) {
        toast.error(t(`errors.${res.errorKey}`));
        return;
      }
      upsert(res.entry);
      setView("list");
      toast.success(t("detail.rejectedLabel"));
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8">
      {view === "list" && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-extrabold text-2xl text-foreground">
                {t("pageTitle")}
                {className ? (
                  <span className="ml-2 font-semibold text-base text-edu-text-secondary">
                    · {className}
                  </span>
                ) : null}
              </h1>
              <p className="mt-1 text-edu-text-secondary text-sm">
                {isPrincipal ? t("principalSubtitle") : t("teacherSubtitle")}
              </p>
            </div>
            {!isPrincipal && (
              <Button type="button" onClick={() => setView("new")}>
                <Plus className="size-4" aria-hidden="true" />
                {t("newEntry")}
              </Button>
            )}
          </header>

          <ClassLogStatsRow entries={localEntries} isPrincipal={isPrincipal} />

          <ClassLogEntryList
            entries={localEntries}
            filterStatus={filterStatus}
            onFilterChange={setFilterStatus}
            onSelect={(entry) => {
              setSelected(entry);
              setView("detail");
            }}
          />
        </>
      )}

      {view === "new" && (
        <ClassLogEntryForm
          isPending={isPending}
          onBack={() => setView("list")}
          onSave={handleCreate}
        />
      )}

      {view === "detail" && selected && (
        <ClassLogEntryDetail
          entry={
            localEntries.find((e) => e.entryId === selected.entryId) ?? selected
          }
          isPrincipal={isPrincipal}
          isPending={isPending}
          onBack={() => setView("list")}
          onSubmit={handleSubmit}
          onRevise={handleRevise}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
