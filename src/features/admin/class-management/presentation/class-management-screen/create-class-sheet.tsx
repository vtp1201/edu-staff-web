"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CreateClassInput } from "@/features/admin/class-management/domain/entities/class.entity";
import type { ClassActionResult } from "./class-management-screen.i-vm";

interface CreateClassSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeOptions: number[];
  onSubmit: (input: CreateClassInput) => Promise<ClassActionResult>;
}

export function CreateClassSheet({
  open,
  onOpenChange,
  gradeOptions,
  onSubmit,
}: CreateClassSheetProps) {
  const t = useTranslations("classManagement.createSheet");
  const tGrade = useTranslations("classManagement");
  const nameId = useId();
  const gradeId = useId();
  const yearId = useId();

  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number>(gradeOptions[0] ?? 1);
  const [academicYear, setAcademicYear] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setGradeLevel(gradeOptions[0] ?? 1);
    setAcademicYear("");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await onSubmit({
      name: name.trim(),
      gradeLevel,
      academicYear: academicYear.trim(),
    });
    setSubmitting(false);
    if (result.ok) {
      reset();
      onOpenChange(false);
    }
  };

  const valid = name.trim().length > 0 && academicYear.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={nameId}>{t("nameLabel")}</Label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={gradeId}>{t("gradeLabel")}</Label>
            <Select
              value={String(gradeLevel)}
              onValueChange={(v) => setGradeLevel(Number(v))}
            >
              <SelectTrigger id={gradeId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((g) => (
                  <SelectItem key={g} value={String(g)}>
                    {tGrade("gradeN", { n: g })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={yearId}>{t("yearLabel")}</Label>
            <Input
              id={yearId}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder={t("yearPlaceholder")}
            />
          </div>
        </div>

        <SheetFooter>
          <Button onClick={handleSubmit} disabled={!valid || submitting}>
            {t("submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
