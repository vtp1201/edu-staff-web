"use client";

import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import {
  avatarToneClasses,
  avatarToneTextClass,
} from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";

export interface ChatBubbleProps {
  message: MessageEntity;
  isGroup: boolean;
  /** Show sender name + avatar (group "other" messages, first in a run). */
  showSender: boolean;
}

export function ChatBubble({ message, isGroup, showSender }: ChatBubbleProps) {
  const {
    from,
    text,
    time,
    senderName,
    senderInitials,
    senderColor,
    isPending,
  } = message;

  if (from === "system") {
    return (
      <div className="py-1 text-center">
        <span className="inline-block rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-edu-text-secondary">
          {text}
        </span>
      </div>
    );
  }

  const isMe = from === "me";

  return (
    <div
      className={cn(
        "mb-1 flex items-end gap-2",
        isMe ? "flex-row-reverse" : "flex-row",
      )}
    >
      {!isMe && isGroup ? (
        <span
          className={cn(
            "mb-0.5 flex size-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
            avatarToneClasses(senderColor ?? "primary"),
          )}
          aria-hidden="true"
        >
          {senderInitials ?? "?"}
        </span>
      ) : (
        !isMe && <span className="w-7 flex-shrink-0" aria-hidden="true" />
      )}

      <div
        className={cn(
          "flex max-w-[72%] flex-col",
          isMe ? "items-end" : "items-start",
        )}
      >
        {!isMe && isGroup && showSender && senderName && (
          <span
            className={cn(
              "mb-0.5 ml-1 text-[11px] font-bold",
              avatarToneTextClass(senderColor ?? "primary"),
            )}
          >
            {senderName}
          </span>
        )}
        <div
          className={cn(
            "px-3.5 py-2.5 text-sm leading-relaxed break-words shadow-card",
            isMe
              ? "rounded-[16px_16px_4px_16px] bg-primary text-primary-foreground"
              : "rounded-[16px_16px_16px_4px] border border-border bg-card text-foreground",
            isPending && "opacity-60",
          )}
        >
          {text}
        </div>
        <span className="mt-0.5 mr-1 ml-1 text-[11px] text-muted-foreground">
          {time}
        </span>
      </div>
    </div>
  );
}

export interface DateDividerProps {
  label: string;
}

export function DateDivider({ label }: DateDividerProps) {
  return (
    <div className="my-1 flex items-center gap-2.5 py-1.5">
      <span className="h-px flex-1 bg-border" />
      <span className="whitespace-nowrap text-[11px] font-semibold text-edu-text-secondary">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
