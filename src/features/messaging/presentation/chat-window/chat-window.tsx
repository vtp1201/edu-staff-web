"use client";

import { ArrowLeft, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";
import { ChatBubble, DateDivider } from "../chat-bubble/chat-bubble";
import {
  GroupInfoPanel,
  type GroupInfoPanelActions,
} from "../group-info-panel";
import { MessageContextMenu } from "../message-context-menu";
import { TypingIndicator } from "../typing-indicator/typing-indicator";
import { scheduleHighlightClear } from "./highlight-timer";

type ReplyState = { messageId: string; senderName: string; excerpt: string };

type ContextMenuState = {
  x: number;
  y: number;
  targetMessageId: string;
  isMine: boolean;
  sentAt?: string;
};

export interface ChatWindowProps {
  conversation: ConversationEntity;
  messages: MessageEntity[];
  isLoading: boolean;
  onSend: (text: string, replyTo?: ReplyState) => void;
  /** Show the typing indicator. False by default (mock-first: no real SSE signal yet). */
  isTyping?: boolean;
  /** Mobile only — back to the conversation list. */
  onBack?: () => void;
  /** Mobile focus management — focus the composer when the chat pane opens. */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;

  // --- US-E10.4 message interactions + group info ---
  /** Pin a message (admin-gated in groups). */
  onPinMessage?: (messageId: string) => void;
  /** Delete an own message (confirmed by the screen). */
  onDeleteMessage?: (messageId: string) => void;
  /** Group info panel data — fetched by the screen when the panel opens. */
  group?: GroupEntity;
  groupLoading?: boolean;
  selfId?: string;
  groupActions?: Omit<GroupInfoPanelActions, "onOpenChange" | "onPinnedClick">;
}

type Row =
  | { kind: "divider"; key: string; label: string }
  | { kind: "msg"; key: string; message: MessageEntity; showSender: boolean };

export function ChatWindow({
  conversation,
  messages,
  isLoading,
  isTyping = false,
  onSend,
  onBack,
  inputRef,
  onPinMessage,
  onDeleteMessage,
  group,
  groupLoading = false,
  selfId = "me",
  groupActions,
}: ChatWindowProps) {
  const t = useTranslations("messaging");
  const tReply = useTranslations("messaging.reply");
  const inputId = useId();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isGroup = conversation.type === "group";
  const selfIsGroupAdmin = Boolean(conversation.selfIsGroupAdmin);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextTriggerRef = useRef<HTMLElement | null>(null);
  const [replyState, setReplyState] = useState<ReplyState | null>(null);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, conversation.id]);

  // DEF-01: clear any pending highlight timer when the component unmounts so we
  // never call setHighlightId on an unmounted component (no timer leak).
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Pure helper applies the highlight + schedules the clear, always clearing
    // any prior pending timer first (rapid-click + DEF-01 no-leak contract).
    highlightTimerRef.current = scheduleHighlightClear({
      messageId,
      setHighlightId,
      previousTimer: highlightTimerRef.current,
    });
  }, []);

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
    onSend(text, replyState ?? undefined);
    setInput("");
    setReplyState(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openContextMenu = (e: MouseEvent, messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.from === "system") return;
    contextTriggerRef.current = document.activeElement as HTMLElement | null;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetMessageId: messageId,
      isMine: msg.from === "me",
      sentAt: msg.sentAt,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    const trigger = contextTriggerRef.current;
    if (trigger) requestAnimationFrame(() => trigger.focus());
  };

  const handleReplyFromMenu = () => {
    const msg = messages.find((m) => m.id === contextMenu?.targetMessageId);
    if (msg) {
      setReplyState({
        messageId: msg.id,
        senderName: msg.from === "me" ? t("chat.you") : (msg.senderName ?? ""),
        excerpt: msg.text.slice(0, 80),
      });
    }
    closeContextMenu();
  };

  const handleCopyFromMenu = () => {
    const msg = messages.find((m) => m.id === contextMenu?.targetMessageId);
    if (msg) void navigator.clipboard?.writeText(msg.text);
    closeContextMenu();
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
        {isGroup ? (
          <button
            type="button"
            onClick={() => setGroupInfoOpen(true)}
            className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("groupInfo.title")}
          >
            <span className="block truncate font-extrabold text-foreground text-sm">
              {conversation.name}
            </span>
            {subtitle && (
              <span className="block text-muted-foreground text-xs">
                {subtitle}
              </span>
            )}
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="truncate font-extrabold text-foreground text-sm">
              {conversation.name}
            </div>
            {subtitle && (
              <div className="text-muted-foreground text-xs">{subtitle}</div>
            )}
          </div>
        )}
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
          <ul className="flex flex-1 flex-col gap-3 py-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className={cn(
                  "flex",
                  i % 2 === 0 ? "justify-start" : "justify-end",
                )}
              >
                <span
                  className="edu-msg-shimmer block h-7 rounded-[16px]"
                  style={{ width: `${45 + (i % 3) * 12}%` }}
                  aria-hidden="true"
                />
              </li>
            ))}
            <li className="sr-only">{t("skeleton.loading")}</li>
          </ul>
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
                  isHighlighted={highlightId === row.message.id}
                  onContextMenu={openContextMenu}
                  onClickReply={scrollToMessage}
                />
              ),
            )}
            {!isGroup && isTyping && (
              <TypingIndicator
                initials={conversation.avatarInitials}
                color={conversation.color}
              />
            )}
          </>
        )}
      </div>

      {replyState && (
        <div className="flex items-center gap-2 border-border border-t border-l-4 border-l-primary bg-card px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[10.5px] text-primary uppercase tracking-wide">
              {tReply("replyingTo", { name: replyState.senderName })}
            </p>
            <p className="truncate text-edu-text-secondary text-xs">
              {replyState.excerpt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyState(null)}
            aria-label={tReply("cancelAriaLabel")}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex-shrink-0 border-border border-t bg-card px-4 py-3">
        <div className="flex items-end gap-2.5">
          <label htmlFor={inputId} className="sr-only">
            {replyState ? tReply("placeholder") : t("chat.placeholder")}
          </label>
          <textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              replyState ? tReply("placeholder") : t("chat.placeholder")
            }
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

      {contextMenu && (
        <MessageContextMenu
          open
          x={contextMenu.x}
          y={contextMenu.y}
          isMine={contextMenu.isMine}
          sentAt={contextMenu.sentAt}
          isGroup={isGroup}
          selfIsGroupAdmin={selfIsGroupAdmin}
          onReply={handleReplyFromMenu}
          onPin={() => {
            onPinMessage?.(contextMenu.targetMessageId);
            closeContextMenu();
          }}
          onCopy={handleCopyFromMenu}
          onDelete={() => {
            onDeleteMessage?.(contextMenu.targetMessageId);
            closeContextMenu();
          }}
          onClose={closeContextMenu}
        />
      )}

      {isGroup && groupActions && (
        <GroupInfoPanel
          open={groupInfoOpen}
          group={group}
          isLoading={groupLoading}
          selfIsAdmin={selfIsGroupAdmin}
          selfId={selfId}
          onOpenChange={setGroupInfoOpen}
          onPinnedClick={(messageId) => {
            setGroupInfoOpen(false);
            requestAnimationFrame(() => scrollToMessage(messageId));
          }}
          {...groupActions}
        />
      )}
    </div>
  );
}
