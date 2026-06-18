"use client";

import { ArrowLeft, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";
import { ChatBubble, DateDivider } from "../chat-bubble/chat-bubble";
import { TypingIndicator } from "../typing-indicator/typing-indicator";

export interface ChatWindowProps {
  conversation: ConversationEntity;
  messages: MessageEntity[];
  isLoading: boolean;
  onSend: (text: string) => void;
  /** Mobile only — back to the conversation list. */
  onBack?: () => void;
  /** Mobile focus management — focus the composer when the chat pane opens. */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

type Row =
  | { kind: "divider"; key: string; label: string }
  | { kind: "msg"; key: string; message: MessageEntity; showSender: boolean };

export function ChatWindow({
  conversation,
  messages,
  isLoading,
  onSend,
  onBack,
  inputRef,
}: ChatWindowProps) {
  const t = useTranslations("messaging");
  const inputId = useId();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isGroup = conversation.type === "group";

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, conversation.id]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDate: string | null = null;
    let prevSender: string | null = null;
    messages.forEach((message, i) => {
      if (message.date && message.date !== lastDate) {
        out.push({
          kind: "divider",
          key: `d-${message.date}-${i}`,
          label: message.date,
        });
        lastDate = message.date;
        prevSender = null;
      }
      const showSender =
        message.from === "other" && message.senderName !== prevSender;
      prevSender =
        message.from === "other" ? (message.senderName ?? null) : null;
      out.push({ kind: "msg", key: message.id, message, showSender });
    });
    return out;
  }, [messages]);

  const subtitle = isGroup
    ? t("chat.members", { count: conversation.memberCount ?? 0 })
    : conversation.isOnline
      ? t("chat.online")
      : "";

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-muted/30">
      <div className="flex flex-shrink-0 items-center gap-3 border-border border-b bg-card px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("chat.backToList")}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <span className="relative flex-shrink-0">
          <span
            className={cn(
              "flex size-10 items-center justify-center text-sm font-extrabold",
              isGroup ? "rounded-xl" : "rounded-full",
              avatarToneClasses(conversation.color),
            )}
          >
            {conversation.avatarInitials}
          </span>
          {!isGroup && conversation.isOnline && (
            <>
              <span
                aria-hidden="true"
                className="absolute right-0.5 bottom-0.5 size-2.5 rounded-full border-2 border-card bg-edu-success"
              />
              <span className="sr-only">{t("chat.online")}</span>
            </>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-extrabold text-foreground text-sm">
            {conversation.name}
          </div>
          {subtitle && (
            <div className="text-muted-foreground text-xs">{subtitle}</div>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label={t("chat.history")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: AC-11 — keyboard-scrollable chat log region
        tabIndex={0}
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isLoading ? (
          <p className="m-auto text-muted-foreground text-sm">
            {t("skeleton.loading")}
          </p>
        ) : (
          <>
            {rows.map((row) =>
              row.kind === "divider" ? (
                <DateDivider key={row.key} label={row.label} />
              ) : (
                <ChatBubble
                  key={row.key}
                  message={row.message}
                  isGroup={isGroup}
                  showSender={row.showSender}
                />
              ),
            )}
            {!isGroup && conversation.isOnline && (
              <TypingIndicator
                initials={conversation.avatarInitials}
                color={conversation.color}
              />
            )}
          </>
        )}
      </div>

      <div className="flex-shrink-0 border-border border-t bg-card px-4 py-3">
        <div className="flex items-end gap-2.5">
          <label htmlFor={inputId} className="sr-only">
            {t("chat.placeholder")}
          </label>
          <textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            rows={1}
            ref={inputRef}
            className="max-h-[120px] flex-1 resize-none rounded-[22px] border-[1.5px] border-border bg-background px-3.5 py-2.5 text-foreground text-sm leading-relaxed outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            aria-label={t("chat.send")}
            className={cn(
              "flex size-[44px] flex-shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              input.trim()
                ? "bg-primary text-primary-foreground shadow-card hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            <Send className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
