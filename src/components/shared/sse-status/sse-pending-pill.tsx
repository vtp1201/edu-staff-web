"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

export interface SsePendingPillProps {
  /** Raw pending count. Formatting (">99 → 99+") is this component's job. */
  count: number;
  /** Container-computed visibility (count>0 AND not on /messages, AND RBAC). */
  visible: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Floating pill (bottom-right) surfacing unread chat messages while the user is
 * outside the messaging section (US-E08.6). Presentational only — visibility,
 * count and navigation are all controlled by the container (AppShell). Sits at
 * `z-40`: above the sticky header (`z-30`) yet below every Radix overlay
 * (`z-50`) so an open mobile nav/dialog correctly obscures it.
 */
export function SsePendingPill({
  count,
  visible,
  onClick,
  className,
}: SsePendingPillProps) {
  const t = useTranslations("shell.sseStatus");

  if (!visible || count === 0) return null;

  const label =
    count === 1 ? t("pendingMessageOne") : t("pendingMessageMany", { count });
  const glyph = count > 99 ? t("pendingMessageOverflowLabel") : String(count);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "fixed right-6 bottom-6 z-40 inline-flex min-h-11 min-w-11 items-center justify-center",
        "rounded-full bg-primary px-3.5 font-bold text-primary-foreground text-sm shadow-card-hover",
        "transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
