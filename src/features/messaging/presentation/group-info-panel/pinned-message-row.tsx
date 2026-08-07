"use client";

import { Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PinnedMessage } from "@/features/messaging/domain/entities/pinned-message.entity";

export interface PinnedMessageRowProps {
  pinned: PinnedMessage;
  onClick: (messageId: string) => void;
  /** Show the unpin control (moderation action) — see `canUnpin` on the VM. */
  canUnpin?: boolean;
  onUnpin?: (messageId: string) => void;
}

/**
 * A single pinned-message row in the group info panel (US-E10.4, real board in
 * US-E18.51). `senderName` has no wire source on the real pin board, so an
 * i18n fallback is rendered here — never a placeholder minted in the mapper.
 */
export function PinnedMessageRow({
  pinned,
  onClick,
  canUnpin = false,
  onUnpin,
}: PinnedMessageRowProps) {
  const t = useTranslations("messaging.groupInfo");
  return (
    <div className="flex items-start gap-1">
      <button
        type="button"
        onClick={() => onClick(pinned.messageId)}
        className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-edu-warning/20 text-edu-warning-foreground"
          aria-hidden="true"
        >
          <Pin className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex items-center justify-between gap-2">
            <span className="truncate font-bold text-foreground text-xs">
              {pinned.senderName ?? t("unknownSender")}
            </span>
          </span>
          <span className="block truncate text-muted-foreground text-xs">
            {pinned.excerpt}
          </span>
        </span>
      </button>
      {canUnpin && onUnpin && (
        <button
          type="button"
          onClick={() => onUnpin(pinned.messageId)}
          aria-label={t("unpinAria", {
            sender: pinned.senderName ?? t("unknownSender"),
          })}
          className="mt-2 flex size-11 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PinOff className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
