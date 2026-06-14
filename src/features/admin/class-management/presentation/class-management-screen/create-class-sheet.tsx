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
  SheetDescription,
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
  const tErrors = useTranslations("classManagement.formErrors");
  const nameId = useId();
  const gradeId = useId();
  const yearId = useId();
  const nameErrorId = useId();
  const yearErrorId = useId();

  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number>(gradeOptions[0] ?? 1);
  const [academicYear, setAcademicYear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && name.trim().length === 0;
  const yearError = submitted && academicYear.trim().length === 0;
  const valid = name.trim().length > 0 && academicYear.trim().length > 0;

  const reset = () => {
    setName("");
    setGradeLevel(gradeOptions[0] ?? 1);
    setAcademicYear("");
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!valid) return;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={nameId}>{t("nameLabel")}</Label>
            <Input
              id={nameId}
              required
              aria-required="true"
              aria-invalid={nameError || undefined}
              aria-describedby={nameError ? nameErrorId : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
            {nameError && (
              <p
                id={nameErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {tErrors("nameRequired")}
              </p>
            )}
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
              required
              aria-required="true"
              aria-invalid={yearError || undefined}
              aria-describedby={yearError ? yearErrorId : undefined}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder={t("yearPlaceholder")}
            />
            {yearError && (
              <p
                id={yearErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {tErrors("yearRequired")}
              </p>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {t("submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
