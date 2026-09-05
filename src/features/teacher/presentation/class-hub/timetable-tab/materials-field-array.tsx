"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { type UseFormReturn, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_MATERIAL_TITLE_LENGTH,
  MAX_MATERIALS,
} from "@/features/period-log/domain/entities/period-prep.entity";
import type { PeriodPrepFormValues } from "./period-prep-form.schema";

export interface MaterialsFieldArrayProps {
  /** The PARENT form — this component registers into it rather than owning a
   *  parallel array, so one submit validates everything. */
  form: UseFormReturn<PeriodPrepFormValues>;
  disabled?: boolean;
}

/**
 * Tài liệu = a list of {title, url} links, capped at 20 (BE `maxItems`).
 *
 * Participates in the PARENT form's `useFieldArray` (it is handed the
 * `control`, not a raw array), so validation and submit stay in one place and
 * the cap can never drift from `MAX_MATERIALS`.
 *
 * a11y: the "Thêm" button is DISABLED (not hidden) at the cap, with a visible
 * `role="status"` explanation, so a screen-reader user learns WHY the action
 * stopped; each remove button is icon-only and therefore carries a Vietnamese
 * `aria-label` naming the row it removes.
 */
export function MaterialsFieldArray({
  form,
  disabled,
}: MaterialsFieldArrayProps) {
  const t = useTranslations("teacherClasses.hub.timetable.periodPrep");
  const groupId = useId();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "materials",
  });
  const errors = form.formState.errors.materials;
  const atCap = fields.length >= MAX_MATERIALS;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-extrabold text-edu-text-secondary text-[11px] uppercase tracking-[0.06em]">
        {t("materials", { count: fields.length, max: MAX_MATERIALS })}
      </legend>

      <ul className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <li
            key={field.id}
            className="flex flex-wrap items-start gap-2 rounded-[8px] border border-border bg-background p-2"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor={`${groupId}-title-${index}`} className="sr-only">
                {t("materialTitle")}
              </Label>
              <Input
                id={`${groupId}-title-${index}`}
                placeholder={t("materialTitle")}
                maxLength={MAX_MATERIAL_TITLE_LENGTH}
                disabled={disabled}
                aria-invalid={!!errors?.[index]?.title}
                aria-describedby={
                  errors?.[index]?.title
                    ? `${groupId}-title-err-${index}`
                    : undefined
                }
                {...form.register(`materials.${index}.title`)}
              />
              {errors?.[index]?.title?.message && (
                <p
                  id={`${groupId}-title-err-${index}`}
                  className="text-edu-error-text text-xs"
                >
                  {errors[index]?.title?.message}
                </p>
              )}
            </div>

            <div className="flex min-w-0 flex-[2] flex-col gap-1">
              <Label htmlFor={`${groupId}-url-${index}`} className="sr-only">
                {t("materialUrl")}
              </Label>
              <Input
                id={`${groupId}-url-${index}`}
                type="url"
                inputMode="url"
                placeholder="https://…"
                disabled={disabled}
                aria-invalid={!!errors?.[index]?.url}
                aria-describedby={
                  errors?.[index]?.url
                    ? `${groupId}-url-err-${index}`
                    : undefined
                }
                {...form.register(`materials.${index}.url`)}
              />
              {errors?.[index]?.url?.message && (
                <p
                  id={`${groupId}-url-err-${index}`}
                  className="text-edu-error-text text-xs"
                >
                  {errors[index]?.url?.message}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              disabled={disabled}
              aria-label={t("removeMaterial", { title: String(index + 1) })}
              onClick={() => remove(index)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || atCap}
          onClick={() => append({ title: "", url: "" })}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("addMaterial")}
        </Button>
        {atCap && (
          <p role="status" className="text-edu-text-secondary text-xs">
            {t("maxReached", { max: MAX_MATERIALS })}
          </p>
        )}
      </div>
    </fieldset>
  );
}
