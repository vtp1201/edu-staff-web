import { cn } from "@/shared/utils";
import { clampPercent } from "./progress-bar.utils";

/**
 * Fill tones. A LITERAL-class map, not a `color` string passed through to an
 * inline style: `.claude/rules/design-system.md` forbids raw colour, and a
 * dynamic `bg-${tone}` string is invisible to Tailwind's scanner. The design
 * mockup's `color={rate >= 95 ? T.success : ...}` therefore becomes a caller
 * choosing one of these four names.
 */
export type ProgressBarColor = "primary" | "success" | "warning" | "error";

const FILL_CLASS: Record<ProgressBarColor, string> = {
  primary: "bg-primary",
  success: "bg-edu-success",
  warning: "bg-edu-warning",
  error: "bg-edu-error",
};

export interface ProgressBarProps {
  /** Raw value; combined with `max` into a 0–100 percent. */
  value: number;
  /** Denominator. Defaults to 100 so a caller may pass a percent directly. */
  max?: number;
  color?: ProgressBarColor;
  /**
   * Accessible name (`aria-label`). REQUIRED in practice: several bars stacked
   * in a "by month" card are indistinguishable to a screen reader otherwise.
   * Optional only so a caller may instead point `aria-labelledby` at a visible
   * label via `...rest`-free composition (wrap it in a labelled group).
   */
  label?: string;
  className?: string;
}

/**
 * Design-system progress bar (design-system.md §Component patterns — track
 * `--edu-border`, caller-chosen fill, `transition width .6s`). US-E24.6 is its
 * first pair of callers (student + parent attendance monthly rollup), so it
 * lands directly in `components/shared/` per decision `0026`.
 *
 * a11y: a real `role="progressbar"` with `aria-valuenow/min/max` plus an
 * `sr-only` percent so the value is announced even where a browser does not
 * surface `aria-valuenow` (design-spec `student-attendance.a11y`). The
 * transition is gated behind `motion-safe:` per `accessibility.md`.
 */
export function ProgressBar({
  value,
  max = 100,
  color = "primary",
  label,
  className,
}: ProgressBarProps) {
  const percent = clampPercent(value, max);
  return (
    <div className={cn("w-full", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percent}%`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-edu-border"
      >
        <div
          className={cn(
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-[600ms]",
            FILL_CLASS[color],
          )}
          // Dynamic computed width — the one case inline style is allowed
          // (`.claude/rules/tailwind-v4.md` §Anti-patterns).
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* OUTSIDE the progressbar on purpose: `role="progressbar"` children are
          not part of its accessible name/description, so an sr-only span nested
          inside would never be announced. */}
      <span className="sr-only">{`${percent}%`}</span>
    </div>
  );
}
