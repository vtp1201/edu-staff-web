"use client";

import { Lock, LockOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/shared/utils";

export interface SealStatusBadgeProps {
  sealed: boolean;
  className?: string;
}

/**
 * Read-only indicator of whether an academic record (or term) is sealed.
 * Display only — the seal/unseal action is US-E14.6, not this story.
 */
export function SealStatusBadge({ sealed, className }: SealStatusBadgeProps) {
  const t = useTranslations("academicRecord.sealStatus");
  const label = sealed ? t("sealed") : t("unsealed");
  const ariaLabel = sealed ? t("ariaSealed") : t("ariaUnsealed");
  const Icon = sealed ? Lock : LockOpen;

  return (
    <StatusBadge
      tone={sealed ? "success" : "muted"}
      className={cn("gap-1", className)}
      aria-label={ariaLabel}
    >
      <Icon aria-hidden className="size-3" />
      {label}
    </StatusBadge>
  );
}
