import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/utils";

/** Semantic tone → icon-box + icon color (design-spec StatCard). */
export type StatTone =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "teal"
  | "muted";

const TONE: Record<StatTone, { box: string; icon: string }> = {
  primary: { box: "bg-primary/15", icon: "text-primary" },
  success: { box: "bg-edu-success/15", icon: "text-edu-success" },
  warning: { box: "bg-edu-warning/15", icon: "text-edu-warning" },
  error: { box: "bg-edu-error/15", icon: "text-edu-error" },
  info: { box: "bg-edu-info/15", icon: "text-edu-info" },
  purple: { box: "bg-edu-purple/15", icon: "text-edu-purple" },
  teal: { box: "bg-edu-teal/15", icon: "text-edu-teal" },
  muted: { box: "bg-muted", icon: "text-foreground" },
};

/**
 * Compact variant colors ONLY the value text. Tones without a dedicated
 * compact color (and the default/undefined case) fall back to text-foreground.
 */
export function compactToneClass(tone: StatTone | undefined): string {
  switch (tone) {
    case "success":
      // text-edu-success (#13DEB9) fails AA on white (1.74:1).
      // text-edu-success-text (#007A6E) = 5.4:1 — passes. Decision 0027.
      return "text-edu-success-text";
    case "error":
      // text-edu-error (#FA896B) fails AA on white (2.36:1).
      // text-edu-error-text (#C0392B) = 5.1:1 — passes. Decision 0027.
      return "text-edu-error-text";
    case "primary":
      return "text-primary";
    default:
      return "text-foreground";
  }
}

type StatCardDefaultProps = {
  variant?: "default";
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Optional trend chip; `dir` colors it (up=success, down=error). */
  trend?: { dir: "up" | "down"; value: string };
  className?: string;
};

type StatCardCompactProps = {
  variant: "compact";
  label: string;
  value: string;
  icon?: never;
  tone?: StatTone;
  trend?: never;
  className?: string;
};

type StatCardMiniProps = {
  variant: "mini";
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: never;
  trend?: never;
  className?: string;
};

export type StatCardProps =
  | StatCardDefaultProps
  | StatCardCompactProps
  | StatCardMiniProps;

export function StatCard(props: StatCardProps) {
  if (props.variant === "compact") {
    return <CompactStatCard {...props} />;
  }
  if (props.variant === "mini") {
    return <MiniStatCard {...props} />;
  }
  return <DefaultStatCard {...props} />;
}

function DefaultStatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  trend,
  className,
}: StatCardDefaultProps) {
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

function CompactStatCard({
  label,
  value,
  tone = "muted",
  className,
}: StatCardCompactProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        {/* text-edu-text-secondary (#5A6A85) = 5.9:1 on white — AA for normal text. A11Y-001 / Decision 0027. */}
        <div className="text-xs text-edu-text-secondary">{label}</div>
        <div
          className={cn("mt-1 text-2xl font-semibold", compactToneClass(tone))}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStatCard({ label, value, icon, className }: StatCardMiniProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--edu-radius-btn)] bg-muted/50 p-2",
        className,
      )}
    >
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
      {/* text-edu-text-secondary (#5A6A85) = 5.9:1 on muted/50 bg — AA for normal text. A11Y-001 / Decision 0027. */}
      <div className="text-[10px] text-edu-text-secondary">{label}</div>
    </div>
  );
}
