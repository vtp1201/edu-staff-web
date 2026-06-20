"use client";

import { Pin } from "lucide-react";
import type { PinnedMessage } from "@/features/messaging/domain/entities/group.entity";

export interface PinnedMessageRowProps {
  pinned: PinnedMessage;
  onClick: (messageId: string) => void;
}

/** A single pinned-message row in the group info panel (US-E10.4). */
export function PinnedMessageRow({ pinned, onClick }: PinnedMessageRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(pinned.messageId)}
      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            {pinned.senderName}
          </span>
        </span>
        <span className="block truncate text-muted-foreground text-xs">
          {pinned.excerpt}
        </span>
      </span>
    </button>
  );
}
