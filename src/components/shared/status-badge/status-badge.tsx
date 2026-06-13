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
  primary: "bg-primary/15 text-primary",
  success: "bg-edu-success/15 text-edu-success-text",
  warning: "bg-edu-warning/15 text-edu-warning-foreground",
  error: "bg-edu-error/15 text-edu-error-text",
  info: "bg-edu-info/15 text-edu-info",
  purple: "bg-edu-purple/15 text-edu-purple",
  teal: "bg-edu-teal/15 text-edu-teal",
  muted: "bg-muted text-muted-foreground",
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
