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
import type { CopyAssignmentsResult } from "../../domain/entities/position-assignment.entity";
import type { CopyActionResult } from "./staffing-assignments-screen.i-vm";

interface CopyAssignmentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    sourceAcademicYearId: string;
    targetAcademicYearId: string;
  }) => Promise<CopyActionResult>;
}

export function CopyAssignmentsSheet({
  open,
  onOpenChange,
  onSubmit,
}: CopyAssignmentsSheetProps) {
  const t = useTranslations("staffing.assignments.copySheet");
  const tErrors = useTranslations("staffing.assignments.formErrors");
  const sourceField = useId();
  const sourceErrorId = useId();
  const targetField = useId();
  const targetErrorId = useId();

  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CopyAssignmentsResult | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on open change
  useEffect(() => {
    setSource("");
    setTarget("");
    setSubmitted(false);
    setResult(null);
  }, [open]);

  const sourceError = submitted && source.trim().length === 0;
  const targetError = submitted && target.trim().length === 0;
  const valid = source.trim().length > 0 && target.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!valid) return;
    setSubmitting(true);
    const res = await onSubmit({
      sourceAcademicYearId: source.trim(),
      targetAcademicYearId: target.trim(),
    });
    setSubmitting(false);
    if (res.ok) setResult(res.result);
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
            <Label htmlFor={sourceField}>{t("sourceYearLabel")}</Label>
            <Input
              id={sourceField}
              required
              aria-required="true"
              aria-invalid={sourceError || undefined}
              aria-describedby={sourceError ? sourceErrorId : undefined}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t("sourceYearPlaceholder")}
            />
            {sourceError && (
              <p
                id={sourceErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {tErrors("sourceYearRequired")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={targetField}>{t("targetYearLabel")}</Label>
            <Input
              id={targetField}
              required
              aria-required="true"
              aria-invalid={targetError || undefined}
              aria-describedby={targetError ? targetErrorId : undefined}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={t("targetYearPlaceholder")}
            />
            {targetError && (
              <p
                id={targetErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {tErrors("targetYearRequired")}
              </p>
            )}
          </div>

          <div role="status" aria-live="polite">
            {result && (
              <div className="flex flex-col gap-1 rounded-[var(--edu-radius-card)] bg-edu-success/15 p-3 text-sm text-edu-success-text">
                <span>{t("resultCopied", { count: result.copiedCount })}</span>
                <span>
                  {t("resultSkipped", { count: result.skippedCount })}
                </span>
              </div>
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
