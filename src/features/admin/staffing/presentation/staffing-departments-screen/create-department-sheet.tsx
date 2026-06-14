"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Department } from "../../domain/entities/department.entity";
import type { DepartmentActionResult } from "./staffing-departments-screen.i-vm";

const MAX_NAME = 100;

interface CreateDepartmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the sheet is in edit mode. */
  target?: Department | null;
  onSubmit: (name: string) => Promise<DepartmentActionResult>;
}

export function CreateDepartmentSheet({
  open,
  onOpenChange,
  target,
  onSubmit,
}: CreateDepartmentSheetProps) {
  const t = useTranslations("staffing.departments.createSheet");
  const tErrors = useTranslations("staffing.departments.formErrors");
  const nameId = useId();
  const nameErrorId = useId();

  const isEdit = Boolean(target);
  const [name, setName] = useState(target?.name ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync the field when the edit target changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on target identity change
  useEffect(() => {
    setName(target?.name ?? "");
    setSubmitted(false);
  }, [target?.id, open]);

  const trimmed = name.trim();
  const emptyError = submitted && trimmed.length === 0;
  const tooLongError = submitted && trimmed.length > MAX_NAME;
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!valid) return;
    setSubmitting(true);
    const result = await onSubmit(trimmed);
    setSubmitting(false);
    if (result.ok) {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle>{isEdit ? t("editTitle") : t("title")}</SheetTitle>
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
              maxLength={MAX_NAME + 1}
              aria-invalid={emptyError || tooLongError || undefined}
              aria-describedby={
                emptyError || tooLongError ? nameErrorId : undefined
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
            {(emptyError || tooLongError) && (
              <p
                id={nameErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {emptyError ? tErrors("nameRequired") : tErrors("nameTooLong")}
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
