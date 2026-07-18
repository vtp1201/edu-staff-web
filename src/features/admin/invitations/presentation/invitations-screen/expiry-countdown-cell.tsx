import { cn } from "@/shared/utils";
import type { CountdownVM } from "./invitations-screen.i-vm";

export interface ExpiryCountdownCellProps {
  countdown: CountdownVM;
}

/**
 * Pure, prop-only expiry cell (UC-007). Urgency is conveyed by bold weight +
 * icon + text together — never colour alone (decision 0046). The `text-*`
 * classes are tokens-only.
 */
export function ExpiryCountdownCell({ countdown }: ExpiryCountdownCellProps) {
  const { variant, text, icon: Icon } = countdown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px]",
        variant === "urgent" && "font-extrabold text-edu-warning-text",
        variant === "normal" && "text-edu-text-secondary",
        (variant === "expired" || variant === "na") && "text-muted-foreground",
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {text}
    </span>
  );
}
