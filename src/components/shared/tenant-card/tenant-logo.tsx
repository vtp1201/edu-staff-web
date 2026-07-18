import { cn } from "@/shared/utils";
import type { TenantAccentTone } from "./tenant-card.i-vm";

export interface TenantLogoProps {
  /** 36 (header user-menu block) | 56 (dialog/select-screen cards) — exact px
   *  from design-spec.jsonc. No third size until a screen needs one. */
  size: 36 | 56;
  tenantName: string;
  /** Closed enum → tint/text/border classes (tokens only, never a raw color). */
  accentTone: TenantAccentTone;
  /** Optional real logo asset (forward-looking; mock-first has none → initials). */
  logoUrl?: string;
  className?: string;
}

/** Tone → `/15` tint bg + accent text + soft border. Every value is an existing
 *  semantic token (architecture.md §5). Text tones use the AA-safe `-text`
 *  variants where the vibrant hue would otherwise fail contrast — the box is
 *  decorative (`aria-hidden`) but keeping legible-tone text is cheap and safe. */
const ACCENT_CLASS: Record<TenantAccentTone, string> = {
  primary: "bg-primary/15 text-primary border-primary/25",
  success: "bg-edu-success/15 text-edu-success-text border-edu-success/25",
  warning:
    "bg-edu-warning/15 text-edu-warning-foreground border-edu-warning/25",
  info: "bg-edu-info/15 text-edu-info border-edu-info/25",
  purple: "bg-edu-purple/15 text-edu-purple-text border-edu-purple/25",
  teal: "bg-edu-teal/15 text-edu-teal-text border-edu-teal/25",
};

/** First letters of the first two words, uppercased (decorative fallback). */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Tenant logo / initials box. Decorative (`aria-hidden`) — the tenant name is
 * rendered as real text beside it, and the card's composed `aria-label` carries
 * the full sentence, so AT never depends on this box.
 */
export function TenantLogo({
  size,
  tenantName,
  accentTone,
  logoUrl,
  className,
}: TenantLogoProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[var(--edu-radius-role-icon)] border font-extrabold tracking-wide",
        size === 56 ? "size-14 text-lg" : "size-9 text-xs",
        ACCENT_CLASS[accentTone],
        className,
      )}
    >
      {logoUrl ? (
        // biome-ignore lint/performance/noImgElement: mock-first has no asset pipeline; decorative alt="" only.
        <img src={logoUrl} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(tenantName)
      )}
    </span>
  );
}
