"use client";

import { Plus, Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { MessagingFailure } from "@/features/messaging/domain/failures/messaging.failure";
import { cn } from "@/shared/utils";
import { ConversationItem } from "../conversation-item/conversation-item";

type Tab = "direct" | "groups";

export interface ConversationListProps {
  conversations: ConversationEntity[];
  activeConversationId: string | null;
  isLoading: boolean;
  loadError?: MessagingFailure["type"];
  onSelect: (id: string) => void;
  onNewMessage: () => void;
  /** Open the create-group modal (Groups tab CTA + empty state, US-E10.4). */
  onCreateGroup?: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading,
  loadError,
  onSelect,
  onNewMessage,
  onCreateGroup,
}: ConversationListProps) {
  const t = useTranslations("messaging");
  const tErrors = useTranslations("messaging.errors");
  const [tab, setTab] = useState<Tab>("direct");
  const [search, setSearch] = useState("");
  const searchId = useId();

  const filtered = useMemo(() => {
    const wantGroup = tab === "groups";
    const q = search.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        (c.type === "group") === wantGroup &&
        (!q || c.name.toLowerCase().includes(q)),
    );
  }, [conversations, tab, search]);

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const panelId = `${searchId}-panel`;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-border border-r bg-card md:w-[300px] md:flex-shrink-0">
      <div className="flex-shrink-0 border-border border-b px-4 pt-4 pb-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-foreground">
              {t("title")}
            </span>
            {totalUnread > 0 && (
              <span className="rounded-full bg-edu-primary-accessible px-1.5 py-0.5 text-[11px] font-extrabold text-primary-foreground">
                <span className="sr-only">
                  {t("totalUnread", { count: totalUnread })}
                </span>
                <span aria-hidden="true">{totalUnread}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onNewMessage}
            aria-label={t("newMessage.button")}
            className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        <div className="relative">
          <Search
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor={searchId} className="sr-only">
            {t("search.placeholder")}
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full rounded-lg border-[1.5px] border-border bg-background py-2 pr-2.5 pl-8 text-foreground text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
        </div>
      </div>

      <div
        className="flex flex-shrink-0 border-border border-b"
        role="tablist"
        aria-label={t("title")}
      >
        {(["direct", "groups"] as const).map((id) => (
          <button
            key={id}
            id={`${searchId}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={panelId}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px flex-1 border-b-2 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === id
                ? "border-primary font-bold text-primary"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${searchId}-tab-${tab}`}
        className="flex-1 overflow-y-auto"
      >
        {loadError ? (
          <div
            role="alert"
            className="m-3 rounded-lg border border-edu-error/30 bg-edu-error-light px-3 py-2.5 text-edu-error-text text-sm"
          >
            {tErrors(loadError)}
          </div>
        ) : isLoading ? (
          <ul className="space-y-1 p-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-[42px] rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            {tab === "groups" && onCreateGroup && (
              <button
                type="button"
                onClick={onCreateGroup}
                className="flex w-full items-center gap-1.5 bg-primary/8 px-4 py-2.5 text-left font-semibold text-edu-primary-accessible text-sm transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                {t("group.emptyCreateCta")}
              </button>
            )}
            {filtered.length > 0 ? (
              <ul>
                {filtered.map((c) => (
                  <li key={c.id}>
                    <ConversationItem
                      conversation={c}
                      isActive={activeConversationId === c.id}
                      onSelect={onSelect}
                    />
                  </li>
                ))}
              </ul>
            ) : tab === "groups" && !search.trim() ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Users
                  className="size-9 text-border"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <p className="font-bold text-foreground text-sm">
                  {t("group.emptyTitle")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("group.emptySubtitle")}
                </p>
                {onCreateGroup && (
                  <button
                    type="button"
                    onClick={onCreateGroup}
                    className="mt-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("group.emptyCreateCta")}
                  </button>
                )}
              </div>
            ) : (
              <p className="px-6 py-6 text-center text-muted-foreground text-sm">
                {tab === "groups"
                  ? t("search.noGroups")
                  : t("search.noResults")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
