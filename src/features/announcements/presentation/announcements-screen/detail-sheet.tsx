"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DetailPanelHeader } from "@/components/shared/detail-panel-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";
import type { AnnouncementEntity } from "../../domain/entities/announcement.entity";
import type {
  RecipientsOutcome,
  SendReminderOutcome,
} from "./announcements-screen.i-vm";

type RecipientFilter = "all" | "read" | "unread";

export interface DetailSheetProps {
  item: AnnouncementEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGetRecipients: (id: string) => Promise<RecipientsOutcome>;
  onRemind: (id: string) => Promise<SendReminderOutcome>;
}

export function DetailSheet({
  item,
  open,
  onOpenChange,
  onGetRecipients,
  onRemind,
}: DetailSheetProps) {
  const t = useTranslations("announcements");
  const [filter, setFilter] = useState<RecipientFilter>("all");
  const [reminding, setReminding] = useState(false);

  // TanStack Query — gated by open + item; auto-refetches when sheet opens for new item
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["announcements", item?.id, "recipients"],
    queryFn: async () => {
      if (!item) return [];
      const res = await onGetRecipients(item.id);
      if (!res.ok) {
        if (res.errorKey) throw new Error(res.errorKey);
        throw new Error("unknown");
      }
      return res.recipients ?? [];
    },
    enabled: open && !!item,
    staleTime: 30_000,
  });

  const filtered =
    filter === "read"
      ? recipients.filter((r) => r.readAt !== null)
      : filter === "unread"
        ? recipients.filter((r) => r.readAt === null)
        : recipients;

  async function remind() {
    if (!item) return;
    setReminding(true);
    try {
      const res = await onRemind(item.id);
      if (res.ok) {
        toast.success(t("remindToast", { count: res.unreadCount ?? 0 }));
      } else if (res.errorKey) {
        toast.error(t(`errors.${res.errorKey}`));
      }
    } finally {
      setReminding(false);
    }
  }

  const FILTERS: RecipientFilter[] = ["all", "read", "unread"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t("btnClose")}
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[400px]"
      >
        {/* Radix requires an accessible title/description on the Sheet; keep
            them sr-only and render the visible header via DetailPanelHeader. */}
        <SheetHeader className="sr-only">
          <SheetTitle>{t("detailTitle")}</SheetTitle>
          <SheetDescription>{item?.title ?? ""}</SheetDescription>
        </SheetHeader>

        <DetailPanelHeader
          backLabel={t("backToList")}
          onBack={() => onOpenChange(false)}
        />

        {item && (
          <div className="flex flex-col gap-4 p-5">
            <h3 className="font-bold text-card-foreground text-sm">
              {item.title}
            </h3>
            <p className="text-muted-foreground text-sm">{item.body}</p>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">{t("detailAuthor")}</dt>
              <dd className="text-card-foreground">{item.authorName}</dd>
              <dt className="text-muted-foreground">{t("detailSentAt")}</dt>
              <dd className="text-card-foreground">
                {item.sentAt ?? item.scheduledAt ?? item.createdAt}
              </dd>
            </dl>

            {/* Recipient filter tabs */}
            <div
              className="flex gap-2"
              role="tablist"
              aria-label={t("recipientFilterAll")}
            >
              {FILTERS.map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-full px-3 py-1 font-medium text-xs transition-colors",
                      active
                        ? "bg-primary/12 font-semibold text-edu-text-primary"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {f === "all"
                      ? t("recipientFilterAll")
                      : f === "read"
                        ? t("recipientFilterRead")
                        : t("recipientFilterUnread")}
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <div
                className="flex flex-col gap-2"
                role="status"
                aria-busy="true"
                aria-label={t("loadingRecipientsAriaLabel")}
              >
                {["a", "b", "c"].map((k) => (
                  <Skeleton
                    key={k}
                    className="h-10 w-full"
                    aria-hidden="true"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                {t("recipientsEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {filtered.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-[var(--edu-radius-btn)] bg-background px-3 py-2"
                  >
                    <span className="text-card-foreground text-sm">
                      {r.name}
                    </span>
                    <StatusBadge tone={r.readAt ? "success" : "muted"}>
                      {r.readAt
                        ? t("recipientStatusRead")
                        : t("recipientStatusUnread")}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="outline"
              disabled={reminding || isLoading}
              onClick={remind}
              className="mt-1"
            >
              {t("btnRemind")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
