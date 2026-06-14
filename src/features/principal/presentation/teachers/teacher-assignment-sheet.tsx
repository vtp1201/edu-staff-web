"use client";

import { PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
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
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type {
  AssignResult,
  TeacherAssignmentSheetVM,
} from "./principal-teachers-screen.i-vm";

// Mock class options for the pickers (mock-first: the core class list endpoint is
// not yet consumed here; the sheet falls back to this bundled list, decision 0014).
const FALLBACK_CLASSES: Class[] = [
  {
    id: "c-10a1",
    name: "10A1",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 32,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
  {
    id: "c-10a2",
    name: "10A2",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 28,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
  {
    id: "c-11b1",
    name: "11B1",
    gradeLevel: 11,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 30,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
  {
    id: "c-12c2",
    name: "12C2",
    gradeLevel: 12,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 29,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  },
];

// Mock subject options (subject catalogue endpoint is mock-first).
const MOCK_SUBJECTS_FOR_PICKER = [
  { id: "s-toan", name: "Toán" },
  { id: "s-ly", name: "Vật lý" },
  { id: "s-hoa", name: "Hóa học" },
  { id: "s-van", name: "Ngữ văn" },
  { id: "s-su", name: "Lịch sử" },
  { id: "s-dia", name: "Địa lý" },
  { id: "s-anh", name: "Tiếng Anh" },
] as const;

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
  classes = FALLBACK_CLASSES,
  onAssignHomeroom,
  onAssignSubjectTeacher,
  onClose,
}: TeacherAssignmentSheetVM) {
  const t = useTranslations("principalTeachers");
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

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: newRowKey(), classId: "", subjectId: "", hasConflict: false },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function updateRow(key: string, patch: Partial<SubjectRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
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
      onClose();
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent
        className="w-full gap-0 sm:max-w-lg"
        aria-describedby={undefined}
      >
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
              {rows.map((row, idx) => (
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
                      onValueChange={(v) => updateRow(row.key, { classId: v })}
                    >
                      <SelectTrigger id={`${row.key}-class`} className="w-full">
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
                    >
                      <SelectTrigger
                        id={`${row.key}-subject`}
                        className="w-full"
                      >
                        <SelectValue placeholder={t("sheet.subjectPicker")} />
                      </SelectTrigger>
                      <SelectContent>
                        {MOCK_SUBJECTS_FOR_PICKER.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
                            className="flex h-9 items-center text-edu-error"
                            aria-label={t("sheet.conflictWarning")}
                          >
                            <TriangleAlertIcon className="size-4" />
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
              ))}
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
