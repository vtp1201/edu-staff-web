"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_NOTE_LENGTH,
  type PeriodPrep,
} from "@/features/period-log/domain/entities/period-prep.entity";
import type { PeriodLogFailure } from "@/features/period-log/domain/failures/period-log.failure";
import { MaterialsFieldArray } from "./materials-field-array";
import {
  type PeriodPrepFormValues,
  periodPrepSchema,
} from "./period-prep-form.schema";
import type {
  LessonPlanOptionVm,
  TimetableTabActions,
} from "./timetable-tab.i-vm";

/** `<Select>` has no null value; this sentinel means "no plan referenced". */
const NO_PLAN = "__none__";

export interface PeriodPrepFormProps {
  classId: string;
  date: string;
  periodNumber: number;
  assignedTeacherMemberId: string;
  initial?: PeriodPrep;
  lessonPlans: LessonPlanOptionVm[];
  saveAction: TimetableTabActions["savePeriodPrep"];
  deleteAction: TimetableTabActions["deletePeriodPrep"];
  onSaved: (prep: PeriodPrep) => void;
  onDeleted: () => void;
  onCancel: () => void;
}

/**
 * Chuẩn bị tiết: note + one of MY lesson plans + ≤20 material links.
 * The write is a FULL REPLACE (the PUT's own semantics), so the form always
 * submits the complete materials list, never a delta.
 */
export function PeriodPrepForm({
  classId,
  date,
  periodNumber,
  assignedTeacherMemberId,
  initial,
  lessonPlans,
  saveAction,
  deleteAction,
  onSaved,
  onDeleted,
  onCancel,
}: PeriodPrepFormProps) {
  const t = useTranslations("teacherClasses.hub.timetable.periodPrep");
  const tv = useTranslations("teacherClasses.hub.timetable.validation");
  const tErr = useTranslations("teacherClasses.hub.timetable.errors");
  const noteId = useId();
  const planId = useId();
  const [serverErrorKey, setServerErrorKey] = useState<
    PeriodLogFailure["type"] | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PeriodPrepFormValues>({
    resolver: zodResolver(
      periodPrepSchema({
        noteTooLong: tv("noteTooLong", { max: MAX_NOTE_LENGTH }),
        materialTitleRequired: tv("materialTitleRequired"),
        materialUrlInvalid: tv("materialUrlInvalid"),
      }),
    ),
    defaultValues: {
      note: initial?.note ?? "",
      lessonPlanId: initial?.lessonPlanId ?? "",
      materials: initial?.materials.map((m) => ({ ...m })) ?? [],
    },
  });

  const selectedPlan = form.watch("lessonPlanId");

  const onSubmit = (values: PeriodPrepFormValues) => {
    setServerErrorKey(null);
    startTransition(async () => {
      const res = await saveAction(
        classId,
        date,
        periodNumber,
        assignedTeacherMemberId,
        {
          note: values.note,
          // Omitted, never null — the request schema types it as an optional uuid.
          lessonPlanId: values.lessonPlanId || undefined,
          materials: values.materials.map((m) => ({
            title: m.title.trim(),
            url: m.url.trim(),
          })),
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
          role="alert"
          className="rounded-[8px] bg-edu-error/15 px-3 py-2 text-edu-error-text text-xs"
        >
          {tErr(serverErrorKey)}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={planId}>{t("lessonPlan")}</Label>
        <Select
          value={selectedPlan === "" ? NO_PLAN : selectedPlan}
          disabled={isPending}
          onValueChange={(value) =>
            form.setValue("lessonPlanId", value === NO_PLAN ? "" : value)
          }
        >
          <SelectTrigger id={planId} className="w-full">
            <SelectValue placeholder={t("lessonPlanNone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PLAN}>{t("lessonPlanNone")}</SelectItem>
            {lessonPlans.map((plan) => (
              <SelectItem key={plan.planId} value={plan.planId}>
                {plan.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={noteId}>{t("note")}</Label>
        <Textarea
          id={noteId}
          rows={2}
          maxLength={MAX_NOTE_LENGTH}
          placeholder={t("notePlaceholder")}
          aria-invalid={!!form.formState.errors.note}
          disabled={isPending}
          {...form.register("note")}
        />
        {form.formState.errors.note?.message && (
          <p className="text-edu-error-text text-xs">
            {form.formState.errors.note.message}
          </p>
        )}
      </div>

      <MaterialsFieldArray form={form} disabled={isPending} />

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
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
