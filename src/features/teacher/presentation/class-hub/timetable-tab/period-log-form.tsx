"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_ABSENT_COUNT,
  MAX_LESSON_TITLE_LENGTH,
  MAX_REMARK_LENGTH,
  MIN_ABSENT_COUNT,
  PERIOD_GRADES,
  type PeriodGrade,
  type PeriodLog,
} from "@/features/period-log/domain/entities/period-log.entity";
import type { PeriodLogFailure } from "@/features/period-log/domain/failures/period-log.failure";
import { cn } from "@/shared/utils";
import type { TimetableTabActions } from "./timetable-tab.i-vm";

interface PeriodLogFormValues {
  lessonTitle: string;
  remark: string;
  grade: PeriodGrade;
  absentCount: number;
}

export interface PeriodLogFormProps {
  classId: string;
  date: string;
  periodNumber: number;
  assignedTeacherMemberId: string;
  /** Present → editing an existing entry (fields pre-filled, delete offered). */
  initial?: PeriodLog;
  saveAction: TimetableTabActions["savePeriodLog"];
  deleteAction: TimetableTabActions["deletePeriodLog"];
  onSaved: (log: PeriodLog) => void;
  onDeleted: () => void;
  onCancel: () => void;
}

/**
 * Sổ đầu bài tiết. RHF + zod, bounds imported from the entity (never
 * re-declared), submit through the Server Action ref passed down as a prop.
 *
 * On success the SAVED entity is handed up (`onSaved`) so the tab body's shared
 * maps — read by both the day grid and the aside chips — update from one place;
 * on failure nothing changes and the banner explains why. `slot-forbidden-or-
 * missing` deliberately reads the same for a 403 and a 422 (VULN-233-001).
 */
export function PeriodLogForm({
  classId,
  date,
  periodNumber,
  assignedTeacherMemberId,
  initial,
  saveAction,
  deleteAction,
  onSaved,
  onDeleted,
  onCancel,
}: PeriodLogFormProps) {
  const t = useTranslations("teacherClasses.hub.timetable.periodLog");
  const tv = useTranslations("teacherClasses.hub.timetable.validation");
  const tErr = useTranslations("teacherClasses.hub.timetable.errors");
  const titleId = useId();
  const remarkId = useId();
  const absentId = useId();
  const absentHintId = useId();
  const errorId = useId();
  const [serverErrorKey, setServerErrorKey] = useState<
    PeriodLogFailure["type"] | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const schema = z.object({
    lessonTitle: z
      .string()
      .trim()
      .min(1, { message: tv("lessonTitleRequired") })
      .max(MAX_LESSON_TITLE_LENGTH, {
        message: tv("lessonTitleTooLong", { max: MAX_LESSON_TITLE_LENGTH }),
      }),
    remark: z.string().max(MAX_REMARK_LENGTH, {
      message: tv("remarkTooLong", { max: MAX_REMARK_LENGTH }),
    }),
    grade: z.enum(["A", "B", "C", "D"]),
    absentCount: z
      .number()
      .int()
      .min(MIN_ABSENT_COUNT, {
        message: tv("absentRange", {
          min: MIN_ABSENT_COUNT,
          max: MAX_ABSENT_COUNT,
        }),
      })
      .max(MAX_ABSENT_COUNT, {
        message: tv("absentRange", {
          min: MIN_ABSENT_COUNT,
          max: MAX_ABSENT_COUNT,
        }),
      }),
  });

  const form = useForm<PeriodLogFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lessonTitle: initial?.lessonTitle ?? "",
      remark: initial?.remark ?? "",
      grade: initial?.grade ?? "A",
      absentCount: initial?.absentCount ?? 0,
    },
  });

  const grade = form.watch("grade");
  const lessonTitle = form.watch("lessonTitle") ?? "";
  const remark = form.watch("remark") ?? "";
  const errors = form.formState.errors;

  const onSubmit = (values: PeriodLogFormValues) => {
    setServerErrorKey(null);
    startTransition(async () => {
      const res = await saveAction(
        classId,
        date,
        periodNumber,
        assignedTeacherMemberId,
        {
          lessonTitle: values.lessonTitle.trim(),
          remark: values.remark,
          grade: values.grade,
          absentCount: values.absentCount,
        },
      );
      if (!res.ok) {
        setServerErrorKey(res.errorKey);
        return;
      }
      onSaved(res.data);
    });
  };

  const onDelete = () => {
    if (!globalThis.confirm(t("deleteConfirm"))) return;
    setServerErrorKey(null);
    startTransition(async () => {
      const res = await deleteAction(
        classId,
        date,
        periodNumber,
        assignedTeacherMemberId,
      );
      if (!res.ok) {
        setServerErrorKey(res.errorKey);
        return;
      }
      onDeleted();
    });
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      {serverErrorKey && (
        <p
          id={errorId}
          role="alert"
          className="rounded-[8px] bg-edu-error/15 px-3 py-2 text-edu-error-text text-xs"
        >
          {tErr(serverErrorKey)}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label htmlFor={titleId}>
            {t("lessonTitle")}{" "}
            <span aria-hidden="true" className="text-edu-error-text">
              *
            </span>
          </Label>
          <span className="text-edu-text-secondary text-xs tabular-nums">
            {t("counter", {
              current: lessonTitle.length,
              max: MAX_LESSON_TITLE_LENGTH,
            })}
          </span>
        </div>
        <Input
          id={titleId}
          maxLength={MAX_LESSON_TITLE_LENGTH}
          placeholder={t("lessonTitlePlaceholder")}
          aria-required="true"
          aria-invalid={!!errors.lessonTitle}
          aria-describedby={errors.lessonTitle ? `${titleId}-err` : undefined}
          disabled={isPending}
          {...form.register("lessonTitle")}
        />
        {errors.lessonTitle?.message && (
          <p id={`${titleId}-err`} className="text-edu-error-text text-xs">
            {errors.lessonTitle.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label htmlFor={remarkId}>{t("remark")}</Label>
          <span className="text-edu-text-secondary text-xs tabular-nums">
            {t("counter", { current: remark.length, max: MAX_REMARK_LENGTH })}
          </span>
        </div>
        <Textarea
          id={remarkId}
          rows={2}
          maxLength={MAX_REMARK_LENGTH}
          placeholder={t("remarkPlaceholder")}
          aria-invalid={!!errors.remark}
          aria-describedby={errors.remark ? `${remarkId}-err` : undefined}
          disabled={isPending}
          {...form.register("remark")}
        />
        {/* `aria-invalid` alone is a state with no explanation — the reason has
            to be readable text, linked to the field that owns it. */}
        {errors.remark?.message && (
          <p id={`${remarkId}-err`} className="text-edu-error-text text-xs">
            {errors.remark.message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Segmented A–D: a real radiogroup (arrow-key navigable), never four
            unrelated buttons — each option keeps a text label. */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 font-extrabold text-edu-text-secondary text-[11px] uppercase tracking-[0.06em]">
            {t("grade")}
          </legend>
          <div
            className="flex gap-1.5"
            role="radiogroup"
            aria-label={t("grade")}
          >
            {PERIOD_GRADES.map((option) => (
              <label
                key={option}
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-[8px] border-2 font-extrabold text-sm transition-colors",
                  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  grade === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-edu-text-secondary",
                )}
              >
                <input
                  type="radio"
                  value={option}
                  className="sr-only"
                  disabled={isPending}
                  {...form.register("grade")}
                />
                <span aria-hidden="true">{option}</span>
                <span className="sr-only">
                  {t("gradeOption", { grade: option })}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex w-28 flex-col gap-1.5">
          <Label htmlFor={absentId}>{t("absentCount")}</Label>
          <Input
            id={absentId}
            type="number"
            inputMode="numeric"
            min={MIN_ABSENT_COUNT}
            max={MAX_ABSENT_COUNT}
            aria-describedby={
              errors.absentCount
                ? `${absentHintId} ${absentId}-err`
                : absentHintId
            }
            aria-invalid={!!errors.absentCount}
            disabled={isPending}
            {...form.register("absentCount", { valueAsNumber: true })}
          />
        </div>
        <p id={absentHintId} className="pb-2 text-edu-text-secondary text-xs">
          {t("absentHint")}
        </p>
      </div>
      {errors.absentCount?.message && (
        <p id={`${absentId}-err`} className="text-edu-error-text text-xs">
          {errors.absentCount.message}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {initial && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto text-edu-error-text"
            disabled={isPending}
            onClick={onDelete}
          >
            {t("delete")}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          // Ties the server-error banner to the control that produced it, so a
          // screen-reader user re-focusing "Lưu" hears WHY the last save failed
          // (the banner's own role="alert" only fires once, on insertion).
          aria-describedby={serverErrorKey ? errorId : undefined}
        >
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
