import type * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/shared/utils";

/**
 * Canonical "child identity header" — avatar (image or initials) + name +
 * optional subtitle and trailing slot (component-organization.md, decision
 * `0026`). Promoted from TWO pre-existing inline copies rather than copied a
 * third time for US-E20.4:
 *
 * - `features/parent/presentation/parent-dashboard.tsx` — `size="lg"`,
 *   `tone="purple"`, `initials="single"`, class-name subtitle.
 * - `features/user/presentation/profile/consent-section/child-consent-card.tsx`
 *   — `size="md"`, `tone="primary"`, `initials="double"`, avatar image, tinted
 *   container + a `StatusBadge` trailing slot.
 * - `features/parent/presentation/children-overview-screen/child-overview-card.tsx`
 *   (US-E20.4) — the third use, which triggered the promotion.
 *
 * Presentation-only: every string is passed in already translated.
 */

export type ChildIdentityTone = "primary" | "purple";
export type ChildIdentityInitials = "single" | "double";

/** Avatar-fallback classes per tone — tokens only, no raw color. */
export function identityToneClass(tone: ChildIdentityTone): string {
  return tone === "purple"
    ? "bg-edu-purple/15 font-semibold text-edu-purple"
    : "bg-primary/10 font-bold text-primary";
}

/**
 * `double` = initials of the last two name parts (Vietnamese given name +
 * middle name, the consent-card rule); `single` = initial of the last part
 * only (the parent-dashboard rule). Whitespace-tolerant; an empty name yields
 * an empty string so the avatar simply shows no letters.
 */
export function childInitials(
  fullName: string,
  mode: ChildIdentityInitials,
): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return parts
    .slice(mode === "double" ? -2 : -1)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const AVATAR_SIZE: Record<"md" | "lg", string> = {
  md: "size-[38px]",
  lg: "size-12",
};

const NAME_SIZE: Record<"md" | "lg", string> = {
  md: "text-sm",
  lg: "text-base",
};

export interface ChildIdentityHeaderProps {
  fullName: string;
  avatarUrl?: string;
  /** Already-translated secondary line under the name (e.g. a class label). */
  subtitle?: React.ReactNode;
  /** Right-aligned slot (badge, chevron, action) — rendered after the name. */
  trailing?: React.ReactNode;
  /** Avatar accent. Default `primary`. */
  tone?: ChildIdentityTone;
  /** `md` = 38px avatar / 14px name, `lg` = 48px avatar / 16px name. Default `md`. */
  size?: "md" | "lg";
  /** Initials rule when no avatar image resolves. Default `double`. */
  initials?: ChildIdentityInitials;
  /** Merged onto the outer row (container tint / padding per call site). */
  className?: string;
}

export function ChildIdentityHeader({
  fullName,
  avatarUrl,
  subtitle,
  trailing,
  tone = "primary",
  size = "md",
  initials = "double",
  className,
}: ChildIdentityHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className={AVATAR_SIZE[size]}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
        <AvatarFallback className={cn("text-xs", identityToneClass(tone))}>
          {childInitials(fullName, initials)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div
          className={cn("truncate font-bold text-foreground", NAME_SIZE[size])}
        >
          {fullName}
        </div>
        {subtitle !== undefined && (
          <div className="truncate text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      {trailing}
    </div>
  );
}
