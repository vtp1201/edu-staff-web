import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/utils";

export type StatusTone =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "teal"
  | "muted";

/** Tone → bg (color/15) + text — WCAG-aware per design-system.md §Badge + decision 0027.
 *  success/error text use the AA-compliant dark variants (text-edu-success-text /
 *  text-edu-error-text); warning text uses text-edu-warning-foreground (dark),
 *  never white (a11y rule).
 */
const TONE_CLASS: Record<StatusTone, string> = {
  // primary text on its own tinted bg = 3.65:1 (fails AA, A11Y-001) →
  // text-edu-text-primary (#2A3547) = 11.52:1 on the tint, guaranteed AA.
  primary: "bg-primary/15 text-edu-text-primary",
  // success/error use AA-compliant dark text tokens (decision 0027): 5.4/5.1:1 on tinted bg.
  success: "bg-edu-success/15 text-edu-success-text",
  // warning-foreground (#2A3547) = ~11:1 on warning tint — a11y rule (never white).
  warning: "bg-edu-warning/15 text-edu-warning-foreground",
  error: "bg-edu-error/15 text-edu-error-text",
  // info/teal/purple vibrant hues fail AA on their own tinted bg (A11Y-001/002).
  // text-edu-text-primary (#2A3547) = 11.5:1 on any light tint — guaranteed AA.
  info: "bg-edu-info/15 text-edu-text-primary",
  purple: "bg-edu-purple/15 text-edu-text-primary",
  teal: "bg-edu-teal/15 text-edu-text-primary",
  // muted: text-muted-foreground (#8898A9) = 2.76:1 on #F5F7FA — fails AA (A11Y-004).
  // text-foreground (#2A3547) = 11.5:1 — passes.
  muted: "bg-muted text-foreground",
};

/** Pure tone→class resolver (unit-tested; default tone = primary). */
export function statusToneClass(tone: StatusTone = "primary"): string {
  return TONE_CLASS[tone];
}

export type StatusBadgeProps = {
  tone?: StatusTone;
  className?: string;
  children: ReactNode;
};

export function StatusBadge({
  tone = "primary",
  className,
  children,
}: StatusBadgeProps) {
  return (
    <Badge className={cn("border-0", statusToneClass(tone), className)}>
      {children}
    </Badge>
  );
}
