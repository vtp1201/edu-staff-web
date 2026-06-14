"use client";

import { Archive, Pencil, Plus, UserCog } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import { ArchiveClassDialog } from "./archive-class-dialog";
import type { ClassManagementScreenProps } from "./class-management-screen.i-vm";
import { CreateClassSheet } from "./create-class-sheet";
import { HomeroomPickerSheet } from "./homeroom-picker-sheet";
import { RenameClassSheet } from "./rename-class-sheet";

const ALL_GRADES = "all";

function buildGradeOptions(
  gradeRange: { minGrade: number; maxGrade: number } | null,
): number[] {
  const min = gradeRange?.minGrade ?? 1;
  const max = gradeRange?.maxGrade ?? 13;
  const out: number[] = [];
  for (let g = min; g <= max; g++) out.push(g);
  return out;
}

export function ClassManagementScreen({
  vm,
  onCreateClass,
  onRenameClass,
  onArchiveClass,
  onAssignHomeroom,
}: ClassManagementScreenProps) {
  const t = useTranslations("classManagement");

  const [classes, setClasses] = useState<Class[]>(vm.classes);
  const [yearFilter, setYearFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>(ALL_GRADES);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Class | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Class | null>(null);
  const [homeroomTarget, setHomeroomTarget] = useState<Class | null>(null);

  const gradeOptions = useMemo(
    () => buildGradeOptions(vm.gradeRange),
    [vm.gradeRange],
  );

  const visible = useMemo(() => {
    const year = yearFilter.trim().toLowerCase();
    return classes.filter((c) => {
      if (year && !c.academicYear.toLowerCase().includes(year)) return false;
      if (gradeFilter !== ALL_GRADES && c.gradeLevel !== Number(gradeFilter)) {
        return false;
      }
      return true;
    });
  }, [classes, yearFilter, gradeFilter]);

  const handleCreate: ClassManagementScreenProps["onCreateClass"] = async (
    input,
  ) => {
    const result = await onCreateClass(input);
    if (result.ok && result.data) {
      setClasses((prev) => [result.data as Class, ...prev]);
      toast.success(t("toast.createSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey ?? "unknown"}`));
    }
    return result;
  };

  const handleRename: ClassManagementScreenProps["onRenameClass"] = async (
    classId,
    input,
  ) => {
    const result = await onRenameClass(classId, input);
    if (result.ok && result.data) {
      const updated = result.data;
      setClasses((prev) => prev.map((c) => (c.id === classId ? updated : c)));
      toast.success(t("toast.renameSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey ?? "unknown"}`));
    }
    return result;
  };

  const handleArchive: ClassManagementScreenProps["onArchiveClass"] = async (
    classId,
  ) => {
    const result = await onArchiveClass(classId);
    if (result.ok) {
      setClasses((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, status: "ARCHIVED" } : c)),
      );
      toast.success(t("toast.archiveSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey ?? "unknown"}`));
    }
    return result;
  };

  const handleAssign: ClassManagementScreenProps["onAssignHomeroom"] = async (
    classId,
    teacherUserId,
  ) => {
    const result = await onAssignHomeroom(classId, teacherUserId);
    if (result.ok) {
      const teacher = vm.teachers.find((tch) => tch.userId === teacherUserId);
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                homeroomTeacherId: teacherUserId,
                homeroomTeacherName:
                  teacher?.displayName ?? c.homeroomTeacherName,
              }
            : c,
        ),
      );
      toast.success(t("toast.assignHomeroomSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey ?? "unknown"}`));
    }
    return result;
  };

  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            {t("createClass")}
          </Button>
        </header>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("filterByYear")}
            </span>
            <Input
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              placeholder="2025-2026"
              aria-label={t("filterByYear")}
              className="w-48"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("filterByGrade")}
            </span>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-48" aria-label={t("filterByGrade")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_GRADES}>{t("allGrades")}</SelectItem>
                {gradeOptions.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {t("gradeN", { n: g })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.grade")}</TableHead>
                <TableHead>{t("table.homeroom")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-right">
                  {t("table.studentCount")}
                </TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {t("table.noClasses")}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-foreground">
                      {c.name}
                    </TableCell>
                    <TableCell>{t("gradeN", { n: c.gradeLevel })}</TableCell>
                    <TableCell>
                      {c.homeroomTeacherName ?? (
                        <span className="text-muted-foreground">
                          {t("table.unassigned")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={c.status === "ACTIVE" ? "success" : "muted"}
                      >
                        {t(`status.${c.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.studentCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <RowAction
                          label={t("actions.rename")}
                          onClick={() => setRenameTarget(c)}
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </RowAction>
                        <RowAction
                          label={t("actions.assignHomeroom")}
                          onClick={() => setHomeroomTarget(c)}
                        >
                          <UserCog aria-hidden="true" className="size-4" />
                        </RowAction>
                        <RowAction
                          label={t("actions.archive")}
                          onClick={() => setArchiveTarget(c)}
                          disabled={c.status === "ARCHIVED"}
                        >
                          <Archive aria-hidden="true" className="size-4" />
                        </RowAction>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateClassSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        gradeOptions={gradeOptions}
        onSubmit={handleCreate}
      />
      <RenameClassSheet
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        target={renameTarget}
        gradeOptions={gradeOptions}
        onSubmit={handleRename}
      />
      <ArchiveClassDialog
        target={archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onConfirm={handleArchive}
      />
      <HomeroomPickerSheet
        open={homeroomTarget !== null}
        onOpenChange={(open) => {
          if (!open) setHomeroomTarget(null);
        }}
        target={homeroomTarget}
        teachers={vm.teachers}
        onAssign={handleAssign}
      />
    </TooltipProvider>
  );
}

function RowAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
