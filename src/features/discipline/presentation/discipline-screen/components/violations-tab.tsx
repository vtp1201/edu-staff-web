"use client";

import { Check, Plus, ShieldOff, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/shared/destructive-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/utils";
import type {
  RecordViolationInput,
  ViolationEntity,
  ViolationSeverity,
  ViolationType,
} from "../../../domain/entities/violation.entity";
import type { DisciplineScreenVM } from "../discipline-screen.i-vm";
import {
  HIGH_SEVERITY_BADGE_CLASS,
  SEVERITY_BAR_CLASS,
  SEVERITY_TONE,
  VIOLATION_STATUS_TONE,
} from "../discipline-tones";
import { DisciplineAvatar } from "./discipline-avatar";

const SEVERITIES: ViolationSeverity[] = ["low", "medium", "high"];
const VIOLATION_TYPES: ViolationType[] = [
  "late",
  "uniform",
  "phone",
  "fight",
  "skip",
  "cheat",
  "disrespect",
  "noise",
  "other",
];
const TYPE_DEFAULT_SEVERITY: Record<ViolationType, ViolationSeverity> = {
  late: "low",
  uniform: "low",
  phone: "medium",
  fight: "high",
  skip: "high",
  cheat: "high",
  disrespect: "medium",
  noise: "low",
  other: "low",
};

type SeverityFilter = ViolationSeverity | "all";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ViolationsTab({
  vm,
  violations,
}: {
  vm: DisciplineScreenVM;
  violations: ViolationEntity[];
}) {
  const t = useTranslations("discipline.violations");
  const tErr = useTranslations("discipline.errors");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const [list, setList] = useState<ViolationEntity[]>(violations);
  const [deleteTarget, setDeleteTarget] = useState<ViolationEntity | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<SeverityFilter>("all");
  const [filterClass, setFilterClass] = useState<string>("all");

  const classes = vm.availableClasses;
  const [form, setForm] = useState({
    studentName: "",
    classId: classes[0] ?? "",
    date: todayIso(),
    type: "late" as ViolationType,
    severity: "low" as ViolationSeverity,
    period: "",
    description: "",
    notifyParent: false,
  });

  const filtered = useMemo(
    () =>
      list.filter((v) => {
        if (filterSeverity !== "all" && v.severity !== filterSeverity)
          return false;
        if (filterClass !== "all" && v.classId !== filterClass) return false;
        return true;
      }),
    [list, filterSeverity, filterClass],
  );

  const stats = useMemo(() => {
    const minor = list.filter((v) => v.severity === "low").length;
    return {
      thisWeek: list.length,
      minor,
      moderateSevere: list.length - minor,
      pendingNotify: list.filter((v) => v.status === "recorded").length,
    };
  }, [list]);

  const isTeacher = vm.viewerRole === "teacher";
  const canSubmit =
    form.studentName.trim() !== "" && form.description.trim() !== "";

  const handleSubmit = () => {
    if (!canSubmit) return;
    const input: RecordViolationInput = {
      studentName: form.studentName,
      classId: form.classId,
      date: form.date,
      type: form.type,
      severity: form.severity,
      period: form.period ? Number(form.period) : null,
      description: form.description,
      notifyParent: form.notifyParent,
    };
    startTransition(async () => {
      const res = await vm.recordViolationAction(input);
      if (res.errorKey) {
        toast.error(tErr(res.errorKey));
        return;
      }
      // Optimistic prepend (mock-first; no real id returned via this contract).
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setList((prev) => [
        {
          id: tempId,
          studentId: tempId,
          studentName: input.studentName,
          initials: input.studentName.slice(0, 2).toUpperCase(),
          avatarTone: "primary",
          classId: input.classId,
          className: input.classId,
          type: input.type,
          date: input.date,
          period: input.period,
          description: input.description,
          severity: input.severity,
          handledBy: "—",
          status: "recorded",
        },
        ...prev,
      ]);
      setShowForm(false);
      setForm((f) => ({ ...f, studentName: "", description: "", period: "" }));
      toast.success(t("success"));
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startDelete(async () => {
      const res = await vm.deleteViolationAction(target.id);
      if (res.errorKey) {
        toast.error(tErr(res.errorKey));
        return;
      }
      setList((prev) => prev.filter((v) => v.id !== target.id));
      setDeleteTarget(null);
      toast.success(t("deleteToast", { studentName: target.studentName }));
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard
          label={t("stats.thisWeek")}
          value={String(stats.thisWeek)}
          icon={X}
          tone="error"
        />
        <StatCard
          label={t("stats.minor")}
          value={String(stats.minor)}
          icon={Check}
          tone="warning"
        />
        <StatCard
          label={t("stats.moderateSevere")}
          value={String(stats.moderateSevere)}
          icon={X}
          tone="error"
        />
        <StatCard
          label={t("stats.pendingNotify")}
          value={String(stats.pendingNotify)}
          icon={Plus}
          tone="purple"
        />
      </div>

      {showForm && isTeacher && (
        <div className="rounded-[var(--edu-radius-card)] border border-border bg-card p-6 shadow-card">
          <h3 className="font-extrabold text-base text-foreground">
            {t("formTitle")}
          </h3>
          <p className="mt-1 mb-5 text-edu-text-muted text-xs">
            {t("formSubtitle")}
          </p>

          <div className="mb-3.5 grid gap-3.5 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-student">{t("form.student")}</Label>
              <Input
                id="v-student"
                value={form.studentName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, studentName: e.target.value }))
                }
                placeholder={t("form.studentPlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-class">{t("form.class")}</Label>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm((f) => ({ ...f, classId: v }))}
              >
                <SelectTrigger id="v-class">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-date">{t("form.date")}</Label>
              <Input
                id="v-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-type">{t("form.type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    type: v as ViolationType,
                    severity: TYPE_DEFAULT_SEVERITY[v as ViolationType],
                  }))
                }
              >
                <SelectTrigger id="v-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIOLATION_TYPES.map((vt) => (
                    <SelectItem key={vt} value={vt}>
                      {t(`types.${vt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="font-bold text-edu-text-secondary text-xs">
                {t("form.severity")}
              </legend>
              <div className="flex gap-1.5">
                {SEVERITIES.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={form.severity === s ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    aria-pressed={form.severity === s}
                    onClick={() => setForm((f) => ({ ...f, severity: s }))}
                  >
                    {t(`severity.${s}`)}
                  </Button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            <Label htmlFor="v-desc">{t("form.description")}</Label>
            <Textarea
              id="v-desc"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("form.descriptionPlaceholder")}
            />
          </div>

          <div className="mb-5 flex items-center gap-2">
            <Switch
              id="v-notify"
              checked={form.notifyParent}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, notifyParent: c }))
              }
            />
            <Label htmlFor="v-notify">{t("form.notifyParent")}</Label>
          </div>

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!canSubmit || isPending}
              onClick={handleSubmit}
            >
              <Check className="size-4" aria-hidden="true" />
              {isPending ? t("saving") : t("record")}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-border border-b px-5 py-3.5">
          <h2 className="flex-1 font-bold text-foreground text-sm">
            {t("title")}
          </h2>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger
              size="sm"
              className="w-auto"
              aria-label={t("allClasses")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allClasses")}</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(["all", ...SEVERITIES] as SeverityFilter[]).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={filterSeverity === s ? "default" : "outline"}
              aria-pressed={filterSeverity === s}
              onClick={() => setFilterSeverity(s)}
            >
              {t(`severity.${s}`)}
            </Button>
          ))}
          {isTeacher && !showForm && (
            <Button type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t("addNew")}
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ShieldOff} title={t("empty")} />
        ) : (
          <ul>
            {filtered.map((v) => (
              <li
                key={v.id}
                className="flex items-start gap-3.5 border-border border-b px-5 py-3.5 last:border-b-0"
              >
                <span
                  className={cn(
                    "w-1 shrink-0 self-stretch rounded-sm",
                    SEVERITY_BAR_CLASS[v.severity],
                  )}
                  aria-hidden="true"
                />
                <DisciplineAvatar
                  initials={v.initials}
                  tone={v.avatarTone}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground text-sm">
                      {v.studentName}
                    </span>
                    <StatusBadge tone="primary">{v.className}</StatusBadge>
                    {v.severity === "high" ? (
                      <StatusBadge className={HIGH_SEVERITY_BADGE_CLASS}>
                        {t("severity.high")}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone={SEVERITY_TONE[v.severity]}>
                        {t(`severity.${v.severity}`)}
                      </StatusBadge>
                    )}
                  </div>
                  <p className="mb-1 text-foreground text-sm">
                    <span className="font-semibold">
                      {t(`types.${v.type}`)}
                    </span>
                    {" — "}
                    {v.description}
                  </p>
                  <p className="text-edu-text-secondary text-xs">
                    {v.date}
                    {v.period ? ` · ${t("period", { period: v.period })}` : ""}{" "}
                    · {t("recordedBy", { handler: v.handledBy })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge tone={VIOLATION_STATUS_TONE[v.status]}>
                    {t(`status.${v.status}`)}
                  </StatusBadge>
                  {isTeacher && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-edu-text-secondary hover:text-destructive"
                      aria-label={t("deleteDialog.confirm")}
                      onClick={() => setDeleteTarget(v)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DestructiveConfirmDialog
        open={deleteTarget !== null}
        title={t("deleteDialog.title")}
        body={
          deleteTarget
            ? t("deleteDialog.body", {
                studentName: deleteTarget.studentName,
                type: t(`types.${deleteTarget.type}`),
              })
            : ""
        }
        confirmLabel={t("deleteDialog.confirm")}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
