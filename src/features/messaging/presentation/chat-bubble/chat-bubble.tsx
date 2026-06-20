"use client";

import { Ellipsis } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
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
  /** Highlight flash after scroll-to (US-E10.4, motion-safe). */
  isHighlighted?: boolean;
  /** Right-click / long-press → open the message context menu. */
  onContextMenu?: (e: MouseEvent, messageId: string) => void;
  /** Click the quoted block → scroll to the original message. */
  onClickReply?: (messageId: string) => void;
}

export function ChatBubble({
  message,
  isGroup,
  showSender,
  isHighlighted,
  onContextMenu,
  onClickReply,
}: ChatBubbleProps) {
  const t = useTranslations("messaging");
  const {
    id,
    from,
    text,
    time,
    senderName,
    senderInitials,
    senderColor,
    isPending,
    replyTo,
    isDeleted,
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
        <div className="group/bubble relative">
          {onContextMenu && !isDeleted && (
            <button
              type="button"
              aria-label={t("contextMenu.openAriaLabel")}
              aria-haspopup="menu"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onContextMenu(
                  {
                    preventDefault() {},
                    clientX: isMe ? rect.left : rect.right,
                    clientY: rect.bottom,
                  } as MouseEvent,
                  id,
                );
              }}
              className={cn(
                "absolute top-1 z-10 flex size-6 items-center justify-center rounded-md",
                isMe ? "left-1" : "right-1",
                "bg-card text-edu-text-secondary opacity-0 shadow-card transition-opacity",
                "group-focus-within/bubble:opacity-100 hover:bg-muted hover:opacity-100",
                "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <Ellipsis className="size-3.5" aria-hidden="true" />
            </button>
          )}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: bubble exposes a right-click context menu in addition to its accessible menu trigger */}
          <div
            data-message-id={id}
            onContextMenu={
              onContextMenu
                ? (e) => {
                    e.preventDefault();
                    onContextMenu(e, id);
                  }
                : undefined
            }
            className={cn(
              "px-3.5 py-2.5 text-sm leading-relaxed break-words shadow-card",
              isMe
                ? "rounded-[16px_16px_4px_16px] bg-primary text-primary-foreground"
                : "rounded-[16px_16px_16px_4px] border border-border bg-card text-foreground",
              isPending && "opacity-60",
              isHighlighted && "edu-msg-highlight",
            )}
          >
            {replyTo && !isDeleted && (
              <button
                type="button"
                onClick={() => onClickReply?.(replyTo.messageId)}
                style={
                  isMe
                    ? {
                        background: "var(--edu-messaging-quote-own-bg)",
                        borderLeft:
                          "4px solid var(--edu-messaging-quote-own-border)",
                      }
                    : undefined
                }
                className={cn(
                  "mb-1.5 block w-full rounded-md px-2.5 py-1.5 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !isMe && "rounded border border-primary/30 bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "block text-[11px] font-bold",
                    isMe ? "text-primary-foreground" : "text-edu-text-primary",
                  )}
                >
                  {replyTo.senderName}
                </span>
                <span
                  className={cn(
                    "block truncate text-[12px]",
                    isMe
                      ? "text-primary-foreground"
                      : "text-edu-text-secondary",
                  )}
                >
                  {replyTo.excerpt}
                </span>
              </button>
            )}
            {isDeleted ? (
              <span
                className={cn(
                  "italic",
                  isMe ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {t("deleteDialog.deletedLabel")}
              </span>
            ) : (
              text
            )}
          </div>
        </div>
        <span className="mt-0.5 mr-1 ml-1 text-[11px] text-edu-text-secondary">
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
