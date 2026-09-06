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

/**
 * Icon color must reach 3:1 against its OWN `/15` tint box (WCAG 1.4.11,
 * graphical objects). The raw status hues fail badly on their own tint:
 * `--edu-warning` #FFAE1F ≈ 1.71:1, `--edu-success` #13DEB9 ≈ 1.56:1 — so both
 * use an existing darker sibling token instead (A11Y-002, US-E18.32).
 */
export const STAT_TONE: Record<StatTone, { box: string; icon: string }> = {
  primary: { box: "bg-primary/15", icon: "text-primary" },
  // #007A6E on the #13DEB9/15 tint ≈ 4.9:1.
  success: { box: "bg-edu-success/15", icon: "text-edu-success-text" },
  // warning: text-edu-text-primary, NOT text-edu-warning-foreground. The two
  // are the same navy (#2A3547) in light mode (~11:1 on the tint), but
  // warning-foreground is the fixed tone for text on SOLID yellow and has no
  // dark value — on the tinted icon box over a dark card it measured 1.10:1
  // (US-E24.12, same defect fixed in status-badge.tsx). text-edu-text-primary
  // follows the theme (~9:1 in dark), like info/purple/teal.
  warning: { box: "bg-edu-warning/15", icon: "text-edu-text-primary" },
  error: { box: "bg-edu-error/15", icon: "text-edu-error" },
  info: { box: "bg-edu-info/15", icon: "text-edu-info" },
  purple: { box: "bg-edu-purple/15", icon: "text-edu-purple" },
  teal: { box: "bg-edu-teal/15", icon: "text-edu-teal" },
  muted: { box: "bg-muted", icon: "text-foreground" },
};

/**
 * Trend chip text color (default variant). Uses AA-compliant text tokens so
 * small text (text-xs, ~12px) meets WCAG 1.4.3 4.5:1 on white card background.
 * Raw hues (#13DEB9 / #FA896B) fail (1.74:1 / 2.36:1). Decision 0027.
 */
export function trendColorClass(dir: "up" | "down"): string {
  return dir === "up" ? "text-edu-success-text" : "text-edu-error-text";
}

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

/**
 * `denseOnMobile` sizes, BELOW `sm` only. Each pair re-states the design-spec
 * default from `sm` up, so turning the prop on can never change a card on a
 * tablet/desktop layout — only the widths where the default card's min-content
 * (24px side padding + 52px icon + 26px value ≈ 173px) does not fit a 2-up
 * grid at 375px and pushes the page into a horizontal scroll (a11y A11Y-101).
 */
export const STAT_DENSE_MOBILE = {
  root: "gap-3 px-3 py-4 sm:gap-4 sm:px-6 sm:py-5",
  /** Wrap rather than ellipsize a label that no longer fits the narrow card. */
  label: "line-clamp-2 sm:truncate",
  box: "size-11 sm:size-13",
  icon: "size-5 sm:size-6",
  value: "text-[22px] sm:text-[26px]",
} as const;

type StatCardDefaultProps = {
  variant?: "default";
  label: string;
  /**
   * Usually a formatted number string. Accepts a node so a caller whose read
   * genuinely FAILED can render an explicit unavailable marker (em-dash +
   * sr-only text) instead of a fake `0` or an endless skeleton (US-E18.32).
   */
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  /** Optional trend chip; `dir` colors it (up=success, down=error). */
  trend?: { dir: "up" | "down"; value: string };
  /**
   * Tighten padding, icon and value type BELOW `sm` (see
   * {@link STAT_DENSE_MOBILE}). For callers that keep a multi-column grid at
   * 375px, where the default card would overflow the viewport.
   */
  denseOnMobile?: boolean;
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
  denseOnMobile = false,
  className,
}: StatCardDefaultProps) {
  const t = STAT_TONE[tone];
  const TrendIcon = trend?.dir === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <div
      className={cn(
        "flex items-center rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card",
        denseOnMobile ? STAT_DENSE_MOBILE.root : "gap-4 px-6 py-5",
        className,
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-[var(--edu-radius-card)]",
          denseOnMobile ? STAT_DENSE_MOBILE.box : "size-13",
          t.box,
        )}
      >
        <Icon
          className={cn(
            denseOnMobile ? STAT_DENSE_MOBILE.icon : "size-6",
            t.icon,
          )}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-xs font-medium text-muted-foreground",
            denseOnMobile ? STAT_DENSE_MOBILE.label : "truncate",
          )}
        >
          {label}
        </div>
        <div
          className={cn(
            "font-extrabold leading-tight text-foreground",
            denseOnMobile ? STAT_DENSE_MOBILE.value : "text-[26px]",
          )}
        >
          {value}
        </div>
      </div>
      {trend && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-bold",
            trendColorClass(trend.dir),
          )}
        >
          <TrendIcon className="size-3.5" aria-hidden="true" />
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
