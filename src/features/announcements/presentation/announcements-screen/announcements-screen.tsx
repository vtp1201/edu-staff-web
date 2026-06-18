"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/utils";
import type {
  AnnouncementEntity,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../../domain/entities/announcement.entity";
import { AnnouncementCard } from "./announcement-card";
import { AnnouncementDrawer } from "./announcement-drawer";
import type {
  AnnouncementActionOutcome,
  AnnouncementFilter,
  RecipientsOutcome,
  SendReminderOutcome,
} from "./announcements-screen.i-vm";
import { DeleteAnnouncementDialog } from "./delete-announcement-dialog";
import { DetailSheet } from "./detail-sheet";

export interface AnnouncementsScreenProps {
  initialItems: AnnouncementEntity[];
  loadFailed?: boolean;
  /** Fetch a fresh filtered list (server action). */
  fetchListAction: (
    filter: AnnouncementFilter,
  ) => Promise<AnnouncementEntity[]>;
  onCreate: (
    input: CreateAnnouncementInput,
  ) => Promise<AnnouncementActionOutcome>;
  onUpdate: (
    input: UpdateAnnouncementInput,
  ) => Promise<AnnouncementActionOutcome>;
  onDelete: (id: string) => Promise<AnnouncementActionOutcome>;
  onGetRecipients: (id: string) => Promise<RecipientsOutcome>;
  onRemind: (id: string) => Promise<SendReminderOutcome>;
}

const FILTERS: { value: AnnouncementFilter; labelKey: FilterKey }[] = [
  { value: "all", labelKey: "filterAll" },
  { value: "sent", labelKey: "filterSent" },
  { value: "scheduled", labelKey: "filterScheduled" },
  { value: "draft", labelKey: "filterDraft" },
];

type FilterKey = "filterAll" | "filterSent" | "filterScheduled" | "filterDraft";

export const announcementKeys = {
  all: ["announcements"] as const,
  list: (filter: AnnouncementFilter) =>
    ["announcements", "list", filter] as const,
};

export function AnnouncementsScreen({
  initialItems,
  loadFailed = false,
  fetchListAction,
  onCreate,
  onUpdate,
  onDelete,
  onGetRecipients,
  onRemind,
}: AnnouncementsScreenProps) {
  const t = useTranslations("announcements");
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<AnnouncementFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementEntity | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: announcementKeys.list(filter),
    queryFn: () => fetchListAction(filter),
    initialData: filter === "all" ? initialItems : undefined,
    staleTime: 15_000,
  });

  const items = data ?? [];
  const showError = isError || loadFailed;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: announcementKeys.all });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => onDelete(id),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(t("deleteToast"));
        invalidate();
      } else {
        toast.error(t(`errors.${res.errorKey ?? "unknown"}` as const));
      }
      setDeleteId(null);
    },
  });

  const detailItem = useMemo(
    () => items.find((i) => i.id === detailId) ?? null,
    [items, detailId],
  );
  const deleteItem = useMemo(
    () => items.find((i) => i.id === deleteId) ?? null,
    [items, deleteId],
  );

  const handleCreateClick = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id) ?? null;
      setEditing(item);
      setDrawerOpen(true);
    },
    [items],
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("pageTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="size-4" aria-hidden="true" />
          {t("createButton")}
        </Button>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("pageTitle")}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium text-sm transition-colors",
                active
                  ? "bg-primary/12 font-semibold text-edu-text-primary"
                  : "bg-muted text-foreground hover:bg-muted/70",
              )}
            >
              {t(f.labelKey)}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <output
          aria-label={t("loadingAriaLabel")}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 4 }, (_, i) => `sk-${i}`).map((k) => (
            <div
              key={k}
              className="rounded-[var(--edu-radius-card)] bg-card p-5 shadow-card"
            >
              <Skeleton className="mb-3 h-5 w-24" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="mb-4 h-4 w-1/2" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </output>
      ) : showError ? (
        <div className="rounded-[var(--edu-radius-card)] bg-card p-10 text-center shadow-card">
          <p className="text-edu-error text-sm">{t("loadError")}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] bg-card p-12 text-center shadow-card">
          <span className="flex size-13 items-center justify-center rounded-2xl bg-primary/18 text-primary">
            <Megaphone className="size-6" aria-hidden="true" />
          </span>
          <h2 className="font-bold text-card-foreground text-base">
            {t("emptyTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("emptyBody")}</p>
          <Button onClick={handleCreateClick} className="mt-1">
            <Plus className="size-4" aria-hidden="true" />
            {t("createButton")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              onView={setDetailId}
              onEdit={handleEdit}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <AnnouncementDrawer
        open={drawerOpen}
        editing={editing}
        onOpenChange={setDrawerOpen}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onSuccess={invalidate}
      />

      <DetailSheet
        item={detailItem}
        open={detailId !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
        onGetRecipients={onGetRecipients}
        onRemind={onRemind}
      />

      <DeleteAnnouncementDialog
        open={deleteId !== null}
        title={deleteItem?.title ?? ""}
        isDeleting={deleteMutation.isPending}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
