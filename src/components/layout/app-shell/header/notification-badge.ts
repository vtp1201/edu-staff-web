/**
 * Bell unread badge. DR-009 US-E16.2: error-ramp contrast — it uses
 * `bg-edu-error-dark` (#b91c1c, AA on white) instead of the lighter
 * `bg-edu-error` hue which fails small-target contrast.
 */
export const NOTIFICATION_BADGE_CLASS =
  "absolute top-1 right-1 flex min-w-[18px] items-center justify-center rounded-full bg-edu-error-dark px-1 py-0.5 text-[11px] font-extrabold text-edu-error-foreground";
