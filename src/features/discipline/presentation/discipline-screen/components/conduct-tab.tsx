"use client";

import { Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/utils";
import type {
  ConductGrade,
  ConductSummaryEntity,
} from "../../../domain/entities/conduct-summary.entity";
import type { DisciplineScreenVM } from "../discipline-screen.i-vm";
import { CONDUCT_GRADE_TONE, pointsColorClass } from "../discipline-tones";
import { DisciplineAvatar } from "./discipline-avatar";

const GRADES: ConductGrade[] = ["excellent", "good", "average", "poor"];

export function ConductTab({
  vm,
  conductSummary,
}: {
  vm: DisciplineScreenVM;
  conductSummary: ConductSummaryEntity[];
}) {
  const t = useTranslations("discipline.conduct");
  const tErr = useTranslations("discipline.errors");
  const [isPending, startTransition] = useTransition();

  const [list, setList] = useState<ConductSummaryEntity[]>(conductSummary);
  const [filterClass, setFilterClass] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const classes = vm.availableClasses;
  const filtered = useMemo(
    () =>
      list.filter((s) => filterClass === "all" || s.classId === filterClass),
    [list, filterClass],
  );

  const summary = useMemo(
    () => ({
      excellent: list.filter((s) => s.grade === "excellent").length,
      good: list.filter((s) => s.grade === "good").length,
      average: list.filter((s) => s.grade === "average").length,
      poor: list.filter((s) => s.grade === "poor").length,
    }),
    [list],
  );

  const handleOverride = (studentId: string, grade: ConductGrade) => {
    startTransition(async () => {
      const res = await vm.overrideConductGradeAction(
        studentId,
        grade,
        note || "—",
      );
      if (res.errorKey) {
        toast.error(tErr(res.errorKey));
        return;
      }
      setList((prev) =>
        prev.map((s) =>
          s.studentId === studentId
            ? { ...s, grade, isOverridden: true, overrideNote: note || "—" }
            : s,
        ),
      );
      setEditingId(null);
      setNote("");
      toast.success(t("saved"));
    });
  };

  if (conductSummary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-10 text-center shadow-card">
        <Users className="size-9 text-edu-text-muted" aria-hidden="true" />
        <p className="font-semibold text-edu-text-secondary text-sm">
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          variant="compact"
          tone="success"
          label={t("grade.excellent")}
          value={String(summary.excellent)}
        />
        <StatCard
          variant="compact"
          tone="primary"
          label={t("grade.good")}
          value={String(summary.good)}
        />
        <StatCard
          variant="compact"
          tone="warning"
          label={t("grade.average")}
          value={String(summary.average)}
        />
        <StatCard
          variant="compact"
          tone="error"
          label={t("grade.poor")}
          value={String(summary.poor)}
        />
      </div>

      <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-border border-b px-5 py-3.5">
          <h2 className="flex-1 font-bold text-foreground text-sm">
            {t("tableTitle", { semester: vm.initialSemester })}
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
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("columns.student")}</TableHead>
              <TableHead scope="col">{t("columns.class")}</TableHead>
              <TableHead scope="col">{t("columns.violations")}</TableHead>
              <TableHead scope="col">{t("columns.absences")}</TableHead>
              <TableHead scope="col">{t("columns.points")}</TableHead>
              <TableHead scope="col">{t("columns.conduct")}</TableHead>
              <TableHead scope="col">{t("columns.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const isEditing = editingId === s.studentId;
              return (
                <TableRow key={s.studentId}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <DisciplineAvatar
                        initials={s.initials}
                        tone={s.avatarTone}
                      />
                      <span className="font-bold text-foreground text-sm">
                        {s.studentName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone="primary">{s.className}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-bold text-sm",
                        s.violationCount > 0
                          ? "text-edu-error-text"
                          : "text-edu-text-muted",
                      )}
                    >
                      {s.violationCount}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-bold text-sm",
                        s.unexcusedAbsences > 3
                          ? "text-edu-error-text"
                          : s.unexcusedAbsences > 0
                            ? "text-edu-warning-foreground"
                            : "text-edu-text-muted",
                      )}
                    >
                      {s.unexcusedAbsences}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={s.points}
                        className="w-15"
                        indicatorClassName={pointsColorClass(s.points)}
                        aria-label={t("pointsProgress", {
                          student: s.studentName,
                          points: s.points,
                        })}
                      />
                      <span className="min-w-6 font-bold text-foreground text-sm tabular-nums">
                        {s.points}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex flex-wrap gap-1.5">
                        {GRADES.map((g) => (
                          <Button
                            key={g}
                            type="button"
                            size="sm"
                            variant={s.grade === g ? "default" : "outline"}
                            aria-pressed={s.grade === g}
                            disabled={isPending}
                            onClick={() => handleOverride(s.studentId, g)}
                          >
                            {t(`grade.${g}`)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <StatusBadge tone={CONDUCT_GRADE_TONE[s.grade]}>
                        {t(`grade.${s.grade}`)}
                      </StatusBadge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`note-${s.studentId}`}
                          className="sr-only"
                        >
                          {t("overrideNoteLabel")}
                        </Label>
                        <Input
                          id={`note-${s.studentId}`}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder={t("overrideNote")}
                          className="h-8 w-32"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("cancelEdit")}
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={t("editLabel", { student: s.studentName })}
                        onClick={() => {
                          setEditingId(s.studentId);
                          setNote(s.overrideNote ?? "");
                        }}
                      >
                        {t("edit")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
