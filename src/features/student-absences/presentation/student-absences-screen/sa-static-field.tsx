/**
 * Immutable identity field — STATIC TEXT ONLY (AC-004.3, §1 decision 1).
 *
 * This component has NO `value`-setter in its type and renders NO `<input>`,
 * `<select>`, or element with `role="textbox"`/`"combobox"`/`"listbox"`. That is
 * deliberate: AC-004.3's bar is "never as an input/select of any kind, EVEN
 * disabled", and a `disabled` input is structurally still an input whose flag a
 * later refactor could trivially flip. There is no code path in here that could
 * ever become editable.
 *
 * Used ×3 by `SAAbsenceFormDialog` in `mode="edit"` for `date`/`classId`/
 * `studentMemberId` — the natural key.
 */
export interface SAStaticFieldProps {
  /** Already-i18n'd label. */
  label: string;
  /** Already-resolved display string (date, class name, or student full name). */
  value: string;
}

export function SAStaticField({ label, value }: SAStaticFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-bold text-edu-text-secondary text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="truncate font-semibold text-foreground text-sm">
        {value}
      </span>
    </div>
  );
}
