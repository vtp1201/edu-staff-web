import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/utils";

/** Semantic tone → icon-box + icon color (design-spec StatCard). */
export type StatTone =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "teal";

const TONE: Record<StatTone, { box: string; icon: string }> = {
  primary: { box: "bg-primary/15", icon: "text-primary" },
  success: { box: "bg-edu-success/15", icon: "text-edu-success" },
  warning: { box: "bg-edu-warning/15", icon: "text-edu-warning" },
  error: { box: "bg-edu-error/15", icon: "text-edu-error" },
  info: { box: "bg-edu-info/15", icon: "text-edu-info" },
  purple: { box: "bg-edu-purple/15", icon: "text-edu-purple" },
  teal: { box: "bg-edu-teal/15", icon: "text-edu-teal" },
};

export type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Optional trend chip; `dir` colors it (up=success, down=error). */
  trend?: { dir: "up" | "down"; value: string };
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  trend,
  className,
}: StatCardProps) {
  const t = TONE[tone];
  const TrendIcon = trend?.dir === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-[var(--edu-radius-card)] border border-border bg-card px-6 py-5 shadow-card",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-13 shrink-0 place-items-center rounded-[var(--edu-radius-card)]",
          t.box,
        )}
      >
        <Icon className={cn("size-6", t.icon)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </div>
        <div className="text-[26px] font-extrabold leading-tight text-foreground">
          {value}
        </div>
      </div>
      {trend && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-bold",
            trend.dir === "up" ? "text-edu-success" : "text-edu-error",
          )}
        >
          <TrendIcon className="size-3.5" />
          {trend.value}
        </span>
      )}
    </div>
  );
}
