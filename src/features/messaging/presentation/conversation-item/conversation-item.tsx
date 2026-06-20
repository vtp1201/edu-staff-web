"use client";

import { useTranslations } from "next-intl";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";

export interface ConversationItemProps {
  conversation: ConversationEntity;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: ConversationItemProps) {
  const t = useTranslations("messaging");
  const {
    id,
    type,
    name,
    avatarInitials,
    color,
    lastMessage,
    lastMessageTime,
    unreadCount,
    isOnline,
    lastSenderName,
  } = conversation;
  const isGroup = type === "group";
  const hasUnread = unreadCount > 0;
  const preview =
    isGroup && lastSenderName
      ? `${lastSenderName}: ${lastMessage}`
      : lastMessage;

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-label={t("openConversation", { name })}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition-colors",
        "min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "border-primary bg-primary/8"
          : "border-transparent hover:bg-muted",
      )}
    >
      <span className="relative flex-shrink-0">
        <span
          className={cn(
            "flex size-[42px] items-center justify-center text-sm font-extrabold",
            isGroup ? "rounded-xl" : "rounded-full",
            avatarToneClasses(color),
          )}
        >
          {avatarInitials}
        </span>
        {!isGroup && isOnline && (
          <>
            <span
              aria-hidden="true"
              className="absolute right-0.5 bottom-0.5 size-2.5 rounded-full border-2 border-card bg-edu-success"
            />
            <span className="sr-only">{t("chat.online")}</span>
          </>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="mb-0.5 flex items-center justify-between gap-1">
          <span
            className={cn(
              "truncate text-foreground text-sm",
              hasUnread ? "font-extrabold" : "font-semibold",
            )}
          >
            {name}
          </span>
          <span className="flex-shrink-0 text-muted-foreground text-xs">
            {lastMessageTime}
          </span>
        </span>
        <span className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "truncate text-xs",
              hasUnread
                ? "font-semibold text-foreground"
                : "text-muted-foreground",
            )}
          >
            {preview}
          </span>
          {hasUnread && (
            <span
              aria-hidden="true"
              className="ml-1 flex min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-extrabold text-primary-foreground"
            >
              {unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
