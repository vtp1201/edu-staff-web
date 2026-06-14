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
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import type { AssignmentActionResult } from "./staffing-assignments-screen.i-vm";

interface AssignPositionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionTitles: PositionTitle[];
  onSubmit: (input: {
    memberId: string;
    positionTitleId: string;
    scopeEntityId: string | null;
    academicYearId: string;
  }) => Promise<AssignmentActionResult>;
}

export function AssignPositionSheet({
  open,
  onOpenChange,
  positionTitles,
  onSubmit,
}: AssignPositionSheetProps) {
  const t = useTranslations("staffing.assignments.assignSheet");
  const tErrors = useTranslations("staffing.assignments.formErrors");
  const memberIdField = useId();
  const memberErrorId = useId();
  const titleField = useId();
  const titleErrorId = useId();
  const scopeField = useId();
  const yearField = useId();
  const yearErrorId = useId();

  const [memberId, setMemberId] = useState("");
  const [positionTitleId, setPositionTitleId] = useState("");
  const [scopeEntityId, setScopeEntityId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on open change
  useEffect(() => {
    setMemberId("");
    setPositionTitleId("");
    setScopeEntityId("");
    setAcademicYearId("");
    setSubmitted(false);
  }, [open]);

  const memberError = submitted && memberId.trim().length === 0;
  const titleError = submitted && positionTitleId.length === 0;
  const yearError = submitted && academicYearId.trim().length === 0;
  const valid =
    memberId.trim().length > 0 &&
    positionTitleId.length > 0 &&
    academicYearId.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!valid) return;
    setSubmitting(true);
    const result = await onSubmit({
      memberId: memberId.trim(),
      positionTitleId,
      scopeEntityId: scopeEntityId.trim() || null,
      academicYearId: academicYearId.trim(),
    });
    setSubmitting(false);
    if (result.ok) onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription className="sr-only">
            {t("description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={memberIdField}>{t("memberIdLabel")}</Label>
            <Input
              id={memberIdField}
              required
              aria-required="true"
              aria-invalid={memberError || undefined}
              aria-describedby={memberError ? memberErrorId : undefined}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder={t("memberIdPlaceholder")}
            />
            {memberError && (
              <p
                id={memberErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {tErrors("memberIdRequired")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={titleField}>{t("positionTitleLabel")}</Label>
            <Select value={positionTitleId} onValueChange={setPositionTitleId}>
              <SelectTrigger
                id={titleField}
                aria-invalid={titleError || undefined}
                aria-describedby={titleError ? titleErrorId : undefined}
              >
                <SelectValue placeholder={t("positionTitlePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {positionTitles.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {titleError && (
              <p
                id={titleErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {tErrors("positionTitleRequired")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={scopeField}>{t("scopeEntityLabel")}</Label>
            <Input
              id={scopeField}
              value={scopeEntityId}
              onChange={(e) => setScopeEntityId(e.target.value)}
              placeholder={t("scopeEntityPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={yearField}>{t("academicYearLabel")}</Label>
            <Input
              id={yearField}
              required
              aria-required="true"
              aria-invalid={yearError || undefined}
              aria-describedby={yearError ? yearErrorId : undefined}
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              placeholder={t("academicYearPlaceholder")}
            />
            {yearError && (
              <p
                id={yearErrorId}
                role="alert"
                className="text-xs text-edu-error-text"
              >
                {tErrors("academicYearRequired")}
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
