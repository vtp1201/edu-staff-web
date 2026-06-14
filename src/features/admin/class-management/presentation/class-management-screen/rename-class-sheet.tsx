"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
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
import type {
  Class,
  RenameClassInput,
} from "@/features/admin/class-management/domain/entities/class.entity";
import type { ClassActionResult } from "./class-management-screen.i-vm";

interface RenameClassSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Class | null;
  gradeOptions: number[];
  onSubmit: (
    classId: string,
    input: RenameClassInput,
  ) => Promise<ClassActionResult>;
}

export function RenameClassSheet({
  open,
  onOpenChange,
  target,
  gradeOptions,
  onSubmit,
}: RenameClassSheetProps) {
  const t = useTranslations("classManagement.renameSheet");
  const tGrade = useTranslations("classManagement");
  const tErrors = useTranslations("classManagement.formErrors");
  const nameId = useId();
  const gradeId = useId();
  const nameErrorId = useId();

  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && name.trim().length === 0;

  useEffect(() => {
    if (target) {
      setName(target.name);
      setGradeLevel(target.gradeLevel);
      setSubmitted(false);
    }
  }, [target]);

  const handleSubmit = async () => {
    if (!target) return;
    setSubmitted(true);
    if (name.trim().length === 0) return;
    setSubmitting(true);
    const result = await onSubmit(target.id, { name: name.trim(), gradeLevel });
    setSubmitting(false);
    if (result.ok) onOpenChange(false);
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
