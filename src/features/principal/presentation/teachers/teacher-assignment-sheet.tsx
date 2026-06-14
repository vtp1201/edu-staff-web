"use client";

import { PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PrincipalClassSubject } from "@/features/principal/domain/teachers/entities/class-subject.entity";
import type {
  AssignResult,
  TeacherAssignmentSheetVM,
} from "./principal-teachers-screen.i-vm";

interface SubjectRow {
  key: string;
  classId: string;
  subjectId: string;
  hasConflict: boolean;
}

let rowSeq = 0;
function newRowKey(): string {
  rowSeq += 1;
  return `row-${rowSeq}`;
}

export function TeacherAssignmentSheet({
  teacher,
  classes,
  onAssignHomeroom,
  onAssignSubjectTeacher,
  onGetClassSubjects,
  onClose,
}: TeacherAssignmentSheetVM) {
  const t = useTranslations("principalTeachers");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [homeroomClassId, setHomeroomClassId] = useState<string>(
    teacher.homeroomClassId ?? "",
  );
  const [rows, setRows] = useState<SubjectRow[]>(() =>
    teacher.subjectAssignments.map((a) => ({
      key: newRowKey(),
      classId: a.classId,
      subjectId: a.subjectId,
      hasConflict: a.hasConflict,
    })),
  );
  // Per-row class-subject options, keyed by row key. Populated when a class is
  // selected in that row (driven by the onGetClassSubjects server action).
  const [rowSubjects, setRowSubjects] = useState<
    Record<string, PrincipalClassSubject[]>
  >({});

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: newRowKey(), classId: "", subjectId: "", hasConflict: false },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setRowSubjects((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function updateRow(key: string, patch: Partial<SubjectRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  async function handleClassChange(key: string, classId: string) {
    // Changing the class resets the chosen subject and loads the class-subjects.
    updateRow(key, { classId, subjectId: "" });
    const subjects = await onGetClassSubjects(classId);
    setRowSubjects((prev) => ({ ...prev, [key]: subjects }));
  }

  function handleSave() {
    startTransition(async () => {
      const ops: Promise<AssignResult>[] = [];
      if (homeroomClassId && homeroomClassId !== teacher.homeroomClassId) {
        ops.push(onAssignHomeroom(homeroomClassId, teacher.teacherId));
      }
      for (const row of rows) {
        if (row.classId && row.subjectId) {
          ops.push(
            onAssignSubjectTeacher(
              row.classId,
              row.subjectId,
              teacher.teacherId,
            ),
          );
        }
      }
      const results = await Promise.all(ops);
      const failed = results.find((r) => r.errorKey);
      if (failed?.errorKey) {
        toast.error(t(`errors.${failed.errorKey}`));
        return;
      }
      toast.success(t("sheet.saveSuccess"));
      router.refresh();
      onClose();
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {t("sheet.title", { name: teacher.displayName })}
          </SheetTitle>
          <SheetDescription>{teacher.email}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          {/* GVCN */}
          <fieldset className="space-y-2">
            <legend className="font-bold text-muted-foreground text-xs uppercase tracking-wide">
              {t("sheet.gvcnSection")}
            </legend>
            <div className="space-y-1.5">
              <Label htmlFor="homeroom-class">{t("sheet.classPicker")}</Label>
              <Select
                value={homeroomClassId}
                onValueChange={setHomeroomClassId}
              >
                <SelectTrigger id="homeroom-class" className="w-full">
                  <SelectValue placeholder={t("sheet.gvcnPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          {/* GVBM */}
          <fieldset className="space-y-3">
            <legend className="font-bold text-muted-foreground text-xs uppercase tracking-wide">
              {t("sheet.gvbmSection")}
            </legend>
            <div className="space-y-3">
              {rows.map((row, idx) => {
                const subjects = rowSubjects[row.key] ?? [];
                return (
                  <div key={row.key} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label
                        htmlFor={`${row.key}-class`}
                        className={idx === 0 ? undefined : "sr-only"}
                      >
                        {t("sheet.classPicker")}
                      </Label>
                      <Select
                        value={row.classId}
                        onValueChange={(v) => handleClassChange(row.key, v)}
                      >
                        <SelectTrigger
                          id={`${row.key}-class`}
                          className="w-full"
                        >
                          <SelectValue placeholder={t("sheet.classPicker")} />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label
                        htmlFor={`${row.key}-subject`}
                        className={idx === 0 ? undefined : "sr-only"}
                      >
                        {t("sheet.subjectPicker")}
                      </Label>
                      <Select
                        value={row.subjectId}
                        onValueChange={(v) =>
                          updateRow(row.key, { subjectId: v })
                        }
                        disabled={!row.classId}
                      >
                        <SelectTrigger
                          id={`${row.key}-subject`}
                          className="w-full"
                        >
                          <SelectValue placeholder={t("sheet.subjectPicker")} />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem
                              key={s.id}
                              value={s.subjectId}
                              // AC-9: a subject already held by another teacher
                              // cannot be reassigned from here.
                              disabled={
                                s.teacherId !== null &&
                                s.teacherId !== teacher.teacherId
                              }
                            >
                              {s.subjectName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {row.hasConflict && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              role="img"
                              // A11Y-006: make the conflict indicator keyboard-focusable so
                              // sighted keyboard users can surface the tooltip explanation.
                              // biome-ignore lint/a11y/noNoninteractiveTabindex: intentional focusable tooltip trigger (A11Y-006)
                              tabIndex={0}
                              className="flex h-9 items-center rounded-sm text-edu-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              aria-label={t("sheet.conflictWarning")}
                            >
                              <TriangleAlertIcon
                                className="size-4"
                                aria-hidden="true"
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("sheet.conflictWarning")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("sheet.deleteRow")}
                      onClick={() => removeRow(row.key)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <PlusIcon className="size-4" />
              {t("sheet.addRow")}
            </Button>
          </fieldset>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("sheet.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? t("sheet.saving") : t("sheet.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
