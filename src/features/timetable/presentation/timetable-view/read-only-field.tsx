/**
 * A labelled, non-editable field shown in the decorative read-only selectors
 * bar of the timetable screens (academic year / semester). Display-only — it
 * renders text, not a real form control, so it carries no interactive a11y.
 */
export function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[184px]">
      <div className="mb-1 font-bold text-[10px] text-edu-text-secondary uppercase tracking-wide">
        {label}
      </div>
      <div className="rounded-lg border border-edu-border bg-edu-card px-3 py-2 font-bold text-edu-text-primary text-sm">
        {value}
      </div>
    </div>
  );
}
