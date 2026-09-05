"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isDueAfterStart,
  toIsoInstant,
  toLocalInputValue,
} from "@/features/lms/domain/use-cases/validate-item-window";
import type { ItemWindowInput } from "../course-timeline/course-timeline.i-vm";

export interface EditWindowRowProps {
  /** ISO instants from the row; rendered as LOCAL wall-clock values. */
  startAt: string | null;
  dueAt: string | null;
  isSaving: boolean;
  /** Already-i18n'd server failure from the last save attempt. */
  serverError: string | null;
  onSave: (input: ItemWindowInput) => void;
  onCancel: () => void;
}

/**
 * The inline "Sửa ngày" editor: two `datetime-local` fields plus Huỷ/Lưu.
 *
 * An inline DISCLOSURE, not a dialog — no focus trap, no portal; the row's
 * toggle button owns `aria-expanded` and this block follows it in DOM order.
 *
 * The inverted-window check runs here before the action fires, so the message
 * lands on the field the teacher must fix instead of arriving as a banner one
 * round trip later. BE re-validates regardless (`LMS_ITEM_INVALID_WINDOW`) —
 * this is a courtesy, never the gate.
 */
export function EditWindowRow({
  startAt,
  dueAt,
  isSaving,
  serverError,
  onSave,
  onCancel,
}: EditWindowRowProps) {
  const t = useTranslations("courses.teacher.editDates");
  const tErr = useTranslations("courses.teacher.errors");
  const fieldId = useId();
  const [start, setStart] = useState(() => toLocalInputValue(startAt));
  const [due, setDue] = useState(() => toLocalInputValue(dueAt));
  const [localError, setLocalError] = useState<string | null>(null);

  const errorText = localError ?? serverError;
  const errorId = `${fieldId}-error`;
  // The inverted window is a relationship between the two fields, so BOTH are
  // marked invalid — flagging only one would point at the wrong input half the
  // time.
  const invalid = errorText !== null;

  function save() {
    const startIso = toIsoInstant(start);
    const dueIso = toIsoInstant(due);
    if (!isDueAfterStart(startIso, dueIso)) {
      setLocalError(tErr("invalidWindow"));
      return;
    }
    setLocalError(null);
    onSave({ startAt: startIso, dueAt: dueIso });
  }

  return (
    <div className="flex flex-col gap-2 border-border border-t bg-background px-3.5 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <Label
            htmlFor={`${fieldId}-start`}
            className="font-bold text-[11px] text-muted-foreground uppercase tracking-[0.06em]"
          >
            {t("opensLabel")}
          </Label>
          <Input
            id={`${fieldId}-start`}
            type="datetime-local"
            value={start}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(e) => {
              setStart(e.target.value);
              setLocalError(null);
            }}
            className="h-11"
          />
        </div>
        <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <Label
            htmlFor={`${fieldId}-due`}
            className="font-bold text-[11px] text-muted-foreground uppercase tracking-[0.06em]"
          >
            {t("dueLabel")}
          </Label>
          <Input
            id={`${fieldId}-due`}
            type="datetime-local"
            value={due}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(e) => {
              setDue(e.target.value);
              setLocalError(null);
            }}
            className="h-11"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">{t("blankHint")}</p>

      {errorText && (
        <p
          id={errorId}
          role="alert"
          className="font-semibold text-[12px] text-edu-error-text"
        >
          {errorText}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
