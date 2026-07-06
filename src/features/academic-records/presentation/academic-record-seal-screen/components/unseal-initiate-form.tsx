"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { SealedStudentOption } from "../../../domain/entities/seal-batch.entity";
import { MIN_UNSEAL_REASON_LENGTH } from "../../../domain/use-cases/initiate-unseal.use-case";
import type { InitiateUnsealInput } from "../academic-record-seal-screen.i-vm";

export interface UnsealInitiateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentOptions: SealedStudentOption[];
  isStudentOptionsLoading: boolean;
  isPending: boolean;
  onSubmit: (input: InitiateUnsealInput) => void;
}

/** AC-7 — slide-over unseal-initiate form. Reason has a live char count vs the
 * binding 20-char minimum; submit is disabled until a student + valid reason. */
export function UnsealInitiateForm({
  open,
  onOpenChange,
  studentOptions,
  isStudentOptionsLoading,
  isPending,
  onSubmit,
}: UnsealInitiateFormProps) {
  const t = useTranslations("academicRecordSeal.unseal.initiateForm");
  const tReason = useTranslations("academicRecordSeal.unseal");
  const format = useFormatter();
  const studentId = useId();
  const reasonId = useId();
  const errId = useId();

  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);

  const trimmedLen = reason.trim().length;
  const reasonValid = trimmedLen >= MIN_UNSEAL_REASON_LENGTH;
  const student = studentOptions.find((s) => s.studentId === selectedId);
  const canSubmit = Boolean(student) && reasonValid && !isPending;

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSelectedId("");
      setReason("");
      setShowError(false);
    }
    onOpenChange(o);
  };

  const handleSubmit = () => {
    if (!student || !reasonValid) {
      setShowError(true);
      return;
    }
    onSubmit({
      studentId: student.studentId,
      classId: student.classId,
      term: student.term,
      year: student.year,
      reason: reason.trim(),
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 sm:max-w-md"
        closeLabel={t("closeSheet")}
      >
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-auto px-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={studentId}>{t("studentLabel")}</Label>
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={isStudentOptionsLoading}
            >
              <SelectTrigger id={studentId} className="w-full">
                <SelectValue placeholder={t("studentPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {studentOptions.map((s) => (
                  <SelectItem key={s.studentId} value={s.studentId}>
                    {s.studentName} · {s.classId} · {s.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {student && (
              <p className="text-muted-foreground text-xs tabular-nums">
                {t("sealedHint", {
                  date: format.dateTime(new Date(student.sealedAt), {
                    dateStyle: "short",
                  }),
                })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>{t("reasonLabel")}</Label>
            <Textarea
              id={reasonId}
              rows={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              aria-invalid={showError && !reasonValid}
              aria-describedby={showError && !reasonValid ? errId : undefined}
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  reasonValid
                    ? "text-edu-success-text"
                    : "text-muted-foreground"
                }
              >
                {t("minChars", { min: MIN_UNSEAL_REASON_LENGTH })}
              </span>
              <span className="font-bold tabular-nums text-muted-foreground">
                {t("charCount", {
                  count: trimmedLen,
                  min: MIN_UNSEAL_REASON_LENGTH,
                })}
              </span>
            </div>
            {showError && !reasonValid && (
              <p id={errId} className="text-edu-error-text text-xs">
                {tReason("reasonMinLengthError", {
                  min: MIN_UNSEAL_REASON_LENGTH,
                })}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-edu-warning/30 bg-edu-warning/10 p-3 text-muted-foreground text-sm">
            <strong className="font-bold text-edu-warning-foreground">
              {t("noteLabel")}
            </strong>{" "}
            {t("note")}
          </div>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {t("submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
