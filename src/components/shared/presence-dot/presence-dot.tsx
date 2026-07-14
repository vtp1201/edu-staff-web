import type { PresenceState } from "@/features/messaging/domain/entities/presence";
import { cn } from "@/shared/utils";

/**
 * Canonical home for the messaging presence dot (US-E10.6, DR-017) — reused at
 * 3 sites (conversation-list avatar, DM chat-header avatar, group member panel),
 * so it lives in `components/shared/` per component-organization.md (decision
 * 0026): one component, one home, no inline forks.
 *
 * Dumb presentational primitive: no `useTranslations` inside — the caller passes
 * the already-translated sr-only `label` (matches `status-badge` conventions).
 * The parent must be `relative` (the dot is absolutely positioned bottom-right).
 */
export type PresenceDotSize = "list" | "header" | "panel";

/**
 * Geometry per design-spec `screens.messaging.presence.dot`: list/header =
 * 10px / 1px offset; panel = 9px / 0 offset. `size-2.5` = 10px, `size-[9px]` = 9px.
 */
const SIZE_CLASS: Record<PresenceDotSize, string> = {
  list: "size-2.5 right-px bottom-px",
  header: "size-2.5 right-px bottom-px",
  panel: "right-0 bottom-0 size-[9px]",
};

export interface PresenceDotProps {
  presence: PresenceState;
  size: PresenceDotSize;
  /** Pre-translated sr-only status text — status is never color-only (NFR-001). */
  label: string;
  className?: string;
}

export function PresenceDot({
  presence,
  size,
  label,
  className,
}: PresenceDotProps) {
  // offline → no dot at all (never a grey dot — design-spec, reduces noise).
  if (presence === "offline") return null;

  return (
    <>
      <span
        aria-hidden="true"
        data-presence={presence}
        className={cn(
          // No transition/animation — presence must not blink/pulse (NFR-002).
          "absolute rounded-full ring-2 ring-card",
          SIZE_CLASS[size],
          presence === "online"
            ? "bg-edu-success"
            : // recent → hollow: card fill + 2px success border (visually distinct)
              "border-2 border-edu-success bg-card",
          className,
        )}
      />
      <span className="sr-only">{label}</span>
    </>
  );
}
