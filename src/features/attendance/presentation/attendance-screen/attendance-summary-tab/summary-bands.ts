import type { ProgressBarColor } from "@/components/shared/progress-bar";
import type { StatusTone } from "@/components/shared/status-badge";
import type { AttendanceBand } from "../../../domain/entities/student-attendance-summary.entity";

/**
 * Band → design-system tone, in ONE place: the chip, the progress fill, the
 * alerts panel and the thresholds legend must never disagree about what "Cảnh
 * báo" looks like. Literal maps (not interpolated class names) so Tailwind's
 * scanner sees every class (`tailwind-v4.md`).
 */
export const BAND_TONE: Record<AttendanceBand, StatusTone> = {
  ok: "success",
  watch: "warning",
  risk: "error",
};

export const BAND_PROGRESS_COLOR: Record<AttendanceBand, ProgressBarColor> = {
  ok: "success",
  watch: "warning",
  risk: "error",
};

/** Dot colour for the thresholds legend + the alerts list marker. */
export const BAND_DOT_CLASS: Record<AttendanceBand, string> = {
  ok: "bg-edu-success",
  watch: "bg-edu-warning",
  risk: "bg-edu-error",
};

/**
 * Text tone for a band-coloured LABEL. Never the raw status hue: `--edu-success`
 * (1.74:1) and `--edu-error` (2.36:1) fail WCAG 1.4.3 on a card, and
 * `--edu-warning` yellow fails worse — the AA-safe siblings are the only legal
 * text tokens here (decision `0027`, `design-system.md` §Contrast token).
 */
export const BAND_TEXT_CLASS: Record<AttendanceBand, string> = {
  ok: "text-edu-success-text",
  watch: "text-foreground",
  risk: "text-edu-error-text",
};
