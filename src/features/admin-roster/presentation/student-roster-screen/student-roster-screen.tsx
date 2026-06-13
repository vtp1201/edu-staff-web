"use client";

import { Download, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SearchStudent } from "@/features/admin-roster/domain/entities/search-student.entity";
import { AddStudentPanel } from "./components/add-student-panel";
import { ClassInfoCard } from "./components/class-info-card";
import { RosterBreadcrumb } from "./components/roster-breadcrumb";
import { RosterEmptyState } from "./components/roster-empty-state";
import { RosterTable } from "./components/roster-table";
import { TransferConfirmDialog } from "./components/transfer-confirm-dialog";
import { UnenrollConfirmDialog } from "./components/unenroll-confirm-dialog";
import type {
  RosterActionResult,
  StudentRosterScreenProps,
} from "./student-roster-screen.i-vm";

type ConfirmState =
  | { type: "unenroll"; targetIds: string[] }
  | { type: "transfer"; student: SearchStudent }
  | null;

export function StudentRosterScreen({
  vm,
  onEnroll,
  onUnenroll,
  onUnenrollMany,
  onTransfer,
}: StudentRosterScreenProps) {
  const t = useTranslations("adminRoster");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [pending, startTransition] = useTransition();
  const panelSearchRef = useRef<HTMLDivElement>(null);

  const enrolledIds = useMemo(
    () => new Set(vm.roster.map((s) => s.id)),
    [vm.roster],
  );

  const handleClassChange = (classId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("classId", classId);
    router.push(`?${params.toString()}`);
  };

  const runAction = (action: () => Promise<RosterActionResult>) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(t(`errors.${result.errorKey ?? "unknown"}`));
      }
    });
  };

  // Single-student enroll/transfer entry point from the panel.
  const handleRequestEnroll = (student: SearchStudent) => {
    setRecentlyAdded((prev) => new Set(prev).add(student.id));
    if (student.currentClassId) {
      setConfirm({ type: "transfer", student });
      return;
    }
    runAction(() => onEnroll(student.id));
  };

  const confirmTransfer = () => {
    if (confirm?.type !== "transfer") return;
    const { student } = confirm;
    setConfirm(null);
    if (!student.currentClassId) return;
    runAction(() => onTransfer(student.id, student.currentClassId as string));
  };

  const cancelTransfer = () => {
    if (confirm?.type === "transfer") {
      const id = confirm.student.id;
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setConfirm(null);
  };

  const confirmUnenroll = () => {
    if (confirm?.type !== "unenroll") return;
    const ids = confirm.targetIds;
    setConfirm(null);
    runAction(() =>
      ids.length === 1 ? onUnenroll(ids[0]) : onUnenrollMany(ids),
    );
  };

  const focusPanelSearch = () => {
    panelSearchRef.current
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus();
  };

  const isEmpty = vm.roster.length === 0;

  return (
    <main className="flex-1 overflow-y-auto bg-edu-bg px-8 py-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-[18px]">
        {/* Header */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <RosterBreadcrumb
              classList={vm.classes}
              currentClassId={vm.currentClass.id}
              onClassChange={handleClassChange}
            />
            <h1 className="mt-1.5 font-extrabold text-2xl text-edu-text-primary">
              {t("title")}
            </h1>
            <p className="mt-1 text-edu-text-muted text-sm">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" disabled>
              <Upload className="size-4" aria-hidden="true" />
              {t("actions.importCsv")}
            </Button>
            <Button variant="secondary" disabled>
              <Download className="size-4" aria-hidden="true" />
              {t("actions.exportList")}
            </Button>
          </div>
        </div>

        <ClassInfoCard
          cls={vm.currentClass}
          activeCount={vm.activeCount}
          transferredCount={vm.transferredCount}
        />

        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          {isEmpty ? (
            <RosterEmptyState onAddFirstClick={focusPanelSearch} />
          ) : (
            <RosterTable
              roster={vm.roster}
              disabled={pending}
              onRequestUnenrollOne={(id) =>
                setConfirm({ type: "unenroll", targetIds: [id] })
              }
              onRequestUnenrollMany={(ids) =>
                setConfirm({ type: "unenroll", targetIds: ids })
              }
            />
          )}
          <div ref={panelSearchRef}>
            <AddStudentPanel
              searchPool={vm.searchPool}
              enrolledIds={enrolledIds}
              recentlyAdded={recentlyAdded}
              disabled={pending}
              onRequestEnroll={handleRequestEnroll}
            />
          </div>
        </div>
      </div>

      <UnenrollConfirmDialog
        open={confirm?.type === "unenroll"}
        targetIds={confirm?.type === "unenroll" ? confirm.targetIds : []}
        pending={pending}
        onConfirm={confirmUnenroll}
        onCancel={() => setConfirm(null)}
      />
      <TransferConfirmDialog
        open={confirm?.type === "transfer"}
        student={confirm?.type === "transfer" ? confirm.student : null}
        toClassName={vm.currentClass.name}
        pending={pending}
        onConfirm={confirmTransfer}
        onCancel={cancelTransfer}
      />
    </main>
  );
}
