"use client";

import {
  BarChart2,
  CalendarRange,
  Check,
  CheckSquare,
  ChevronRight,
  Info,
  type LucideIcon,
  Send,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import { cn } from "@/shared/utils";
import { SwitchConfirmDialog } from "./switch-confirm-dialog";

interface AdminSettingsScreenProps {
  initialMode: GradePublishMode | null;
  loading?: boolean;
  isReadOnly?: boolean;
  onUpdateMode: (
    mode: GradePublishMode,
  ) => Promise<{ ok: boolean; errorKey?: string }>;
}

const MODE_OPTIONS: ReadonlyArray<{
  id: GradePublishMode;
  icon: LucideIcon;
  labelKey: "selfPublish" | "adminApproval";
  descKey: "selfPublishDesc" | "adminApprovalDesc";
}> = [
  {
    id: "SELF_PUBLISH",
    icon: Send,
    labelKey: "selfPublish",
    descKey: "selfPublishDesc",
  },
  {
    id: "ADMIN_APPROVAL",
    icon: CheckSquare,
    labelKey: "adminApproval",
    descKey: "adminApprovalDesc",
  },
];

const SHORTCUTS: ReadonlyArray<{
  href: string;
  icon: LucideIcon;
  titleKey: "calendar" | "assessment";
  descKey: "calendarDesc" | "assessmentDesc";
}> = [
  {
    href: "/admin/calendar",
    icon: CalendarRange,
    titleKey: "calendar",
    descKey: "calendarDesc",
  },
  {
    href: "/admin/assessment",
    icon: BarChart2,
    titleKey: "assessment",
    descKey: "assessmentDesc",
  },
];

export function AdminSettingsScreen({
  initialMode,
  loading = false,
  isReadOnly = false,
  onUpdateMode,
}: AdminSettingsScreenProps) {
  const t = useTranslations("adminSettings");
  const tMode = useTranslations("adminSettings.publishMode");
  const tShortcuts = useTranslations("adminSettings.shortcuts");
  const tToast = useTranslations("adminSettings.toast");

  const [savedMode, setSavedMode] = useState<GradePublishMode | null>(
    initialMode,
  );
  const [draftMode, setDraftMode] = useState<GradePublishMode>(
    initialMode ?? "ADMIN_APPROVAL",
  );
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<GradePublishMode | null>(null);

  const isDirty = draftMode !== savedMode;
  const canSave = isDirty && !saving && !isReadOnly;

  async function commit(mode: GradePublishMode) {
    setSaving(true);
    const result = await onUpdateMode(mode);
    setSaving(false);
    if (result.ok) {
      setSavedMode(mode);
      setDraftMode(mode);
      toast.success(tToast("saveSuccess"));
    } else {
      toast.error(tToast("saveError"));
    }
  }

  function handleSave() {
    if (!canSave) return;
    // Confirm before relaxing approval gating (ADMIN_APPROVAL → SELF_PUBLISH).
    if (savedMode === "ADMIN_APPROVAL" && draftMode === "SELF_PUBLISH") {
      setPendingMode(draftMode);
      setShowConfirmDialog(true);
      return;
    }
    void commit(draftMode);
  }

  function handleConfirm() {
    setShowConfirmDialog(false);
    if (pendingMode) void commit(pendingMode);
    setPendingMode(null);
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-7 lg:px-8">
        <div className="mx-auto flex max-w-[900px] flex-col gap-5">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-7 lg:px-8">
      <div className="mx-auto max-w-[900px]">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-edu-primary/10">
            <Settings2
              size={22}
              className="text-edu-primary"
              strokeWidth={1.8}
              aria-hidden
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-edu-text-primary">
              {t("title")}
            </h1>
            <p className="mt-0.5 text-sm text-edu-text-secondary">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* SECTION 1 — Grade Publish Mode */}
          <section
            className="rounded-xl border border-border bg-card p-5 shadow-card"
            aria-labelledby="publish-mode-heading"
          >
            <div className="mb-5 flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-edu-primary/10">
                <CheckSquare
                  size={20}
                  className="text-edu-primary"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="publish-mode-heading"
                  className="text-base font-extrabold text-edu-text-primary"
                >
                  {tMode("title")}
                </h2>
                <p className="mt-0.5 text-[12.5px] leading-[1.55] text-edu-text-secondary">
                  {tMode("subtitle")}
                </p>
              </div>
            </div>

            <fieldset className="mb-4" disabled={isReadOnly}>
              <legend className="sr-only">{tMode("legendSr")}</legend>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {MODE_OPTIONS.map((opt) => {
                  const active = draftMode === opt.id;
                  const OptIcon = opt.icon;
                  return (
                    <label
                      key={opt.id}
                      className={cn(
                        "relative flex rounded-xl border-[1.5px] p-[18px] text-left transition-all focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                        isReadOnly
                          ? "cursor-not-allowed opacity-70"
                          : "cursor-pointer",
                        active
                          ? "border-edu-primary bg-edu-primary/12"
                          : "border-border bg-card hover:border-edu-primary/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="gradePublishMode"
                        value={opt.id}
                        checked={active}
                        disabled={isReadOnly}
                        onChange={() => setDraftMode(opt.id)}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-card",
                            active ? "border-edu-primary" : "border-border",
                          )}
                        >
                          {active && (
                            <div className="size-2.5 rounded-full bg-edu-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-sm font-extrabold text-edu-text-primary">
                            <OptIcon
                              size={15}
                              className="text-edu-primary"
                              strokeWidth={2}
                              aria-hidden
                            />
                            {tMode(opt.labelKey)}
                          </p>
                          <p className="mt-1 text-[12.5px] leading-[1.55] text-edu-text-secondary">
                            {tMode(opt.descKey)}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* Warning note */}
            <div
              className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-edu-warning/40 bg-edu-warning/10 px-3.5 py-3"
              role="note"
            >
              <Info
                size={16}
                className="mt-0.5 shrink-0 text-edu-warning"
                aria-hidden
              />
              <p className="text-[12.5px] leading-[1.6] text-edu-text-secondary">
                <strong className="font-bold text-edu-warning-foreground">
                  {tMode("warningNoteLabel")}
                </strong>{" "}
                {tMode("warningNote")}
              </p>
            </div>

            {isReadOnly && (
              <p className="mb-3 text-[12.5px] text-edu-text-secondary">
                {tMode("readOnlyHint")}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                aria-disabled={!canSave}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-edu-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={15} strokeWidth={2.4} aria-hidden />
                {saving ? tMode("saving") : tMode("save")}
              </button>
            </div>
          </section>

          {/* SECTION 2 — Config shortcuts */}
          <section
            className="rounded-xl border border-border bg-card p-5 shadow-card"
            aria-labelledby="shortcuts-heading"
          >
            <div className="mb-4">
              <h2
                id="shortcuts-heading"
                className="text-base font-extrabold text-edu-text-primary"
              >
                {tShortcuts("title")}
              </h2>
              <p className="mt-0.5 text-[12.5px] leading-[1.55] text-edu-text-secondary">
                {tShortcuts("subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {SHORTCUTS.map((sc) => {
                const ScIcon = sc.icon;
                return (
                  <Link
                    key={sc.href}
                    href={sc.href}
                    className="group flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 transition-all hover:border-edu-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-edu-primary/10">
                      <ScIcon
                        size={20}
                        className="text-edu-primary"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-edu-text-primary">
                        {tShortcuts(sc.titleKey)}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-[1.5] text-edu-text-secondary">
                        {tShortcuts(sc.descKey)}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-edu-text-secondary transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <SwitchConfirmDialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          setShowConfirmDialog(open);
          if (!open) setPendingMode(null);
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
