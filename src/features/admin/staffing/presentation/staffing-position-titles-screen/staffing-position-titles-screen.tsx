"use client";

import { Archive, Pencil, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils";
import type {
  Permission,
  PositionTitle,
} from "../../domain/entities/position-title.entity";
import { CreatePositionTitleSheet } from "./create-position-title-sheet";
import type {
  PositionTitleStatusFilter,
  StaffingPositionTitlesScreenProps,
} from "./staffing-position-titles-screen.i-vm";

const PERM_LABEL_KEY = {
  MANAGE_SUBJECT_CONTENT: "permManageSubjectContent",
  MANAGE_SCHEDULE: "permManageSchedule",
  MANAGE_CONDUCT: "permManageConduct",
  VIEW_REPORTS: "permViewReports",
} as const satisfies Record<Permission, string>;

export function StaffingPositionTitlesScreen({
  initialPositionTitles,
  isAdmin,
  onCreatePositionTitle,
  onPatchPositionTitle,
  onArchivePositionTitle,
}: StaffingPositionTitlesScreenProps) {
  const t = useTranslations("staffing.positionTitles");
  const searchId = useId();

  const [titles, setTitles] = useState<PositionTitle[]>(initialPositionTitles);
  const [filter, setFilter] = useState<PositionTitleStatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PositionTitle | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<PositionTitle | null>(
    null,
  );

  const counts = useMemo(
    () => ({
      ALL: titles.length,
      ACTIVE: titles.filter((p) => p.status === "ACTIVE").length,
      ARCHIVED: titles.filter((p) => p.status === "ARCHIVED").length,
    }),
    [titles],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return titles.filter((p) => {
      if (filter !== "ALL" && p.status !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [titles, filter, query]);

  const hasNoData = titles.length === 0;
  const filteredEmpty = !hasNoData && visible.length === 0;

  const upsert = (title: PositionTitle) =>
    setTitles((prev) => {
      const idx = prev.findIndex((p) => p.id === title.id);
      if (idx === -1) return [title, ...prev];
      const next = [...prev];
      next[idx] = title;
      return next;
    });

  const handleCreate: StaffingPositionTitlesScreenProps["onCreatePositionTitle"] =
    async (input) => {
      const result = await onCreatePositionTitle(input);
      if (result.ok) {
        upsert(result.positionTitle);
        toast.success(t("toast.createSuccess"));
      } else {
        toast.error(t(`errors.${result.errorKey}`));
      }
      return result;
    };

  const handlePatch: StaffingPositionTitlesScreenProps["onCreatePositionTitle"] =
    async (input) => {
      if (!editing) return { ok: false as const, errorKey: "unknown" as const };
      const result = await onPatchPositionTitle(editing.id, {
        permissions: input.permissions,
      });
      if (result.ok) {
        upsert(result.positionTitle);
        toast.success(t("toast.editSuccess"));
      } else {
        toast.error(t(`errors.${result.errorKey}`));
      }
      return result;
    };

  const handleArchive = async (title: PositionTitle) => {
    const result = await onArchivePositionTitle(title.id);
    if (result.ok) {
      upsert({ ...title, status: "ARCHIVED" });
      toast.success(t("toast.archiveSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey}`));
    }
    setArchiveTarget(null);
  };

  const FILTERS: PositionTitleStatusFilter[] = ["ALL", "ACTIVE", "ARCHIVED"];
  const filterLabel: Record<PositionTitleStatusFilter, string> = {
    ALL: t("filterAll"),
    ACTIVE: t("filterActive"),
    ARCHIVED: t("filterArchived"),
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">
              {t("title")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)} className="shrink-0">
              <Plus aria-hidden="true" className="size-4" />
              {t("addButton")}
            </Button>
          )}
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <fieldset className="flex flex-wrap gap-2 border-0 p-0">
            <legend className="sr-only">{t("filterAll")}</legend>
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium",
                    "motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary/12 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {filterLabel[f]} ({counts[f]})
                </button>
              );
            })}
          </fieldset>

          <div className="flex items-center gap-2 rounded-[var(--edu-radius-btn)] border border-border bg-background px-2 focus-within:ring-2 focus-within:ring-ring sm:w-72">
            <Search
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            <Label htmlFor={searchId} className="sr-only">
              {t("searchPlaceholder")}
            </Label>
            <Input
              id={searchId}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
            />
            {query && (
              <button
                type="button"
                aria-label={t("clearSearch")}
                onClick={() => setQuery("")}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
        </div>

        {hasNoData ? (
          <EmptyState
            title={t("emptyTitle")}
            subtitle={t("emptySubtitle")}
            cta={
              isAdmin ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden="true" className="size-4" />
                  {t("emptyCreateButton")}
                </Button>
              ) : null
            }
          />
        ) : filteredEmpty ? (
          <EmptyState
            title={t("filteredEmptyTitle")}
            subtitle={t("filteredEmptySubtitle")}
            cta={
              <Button
                variant="outline"
                onClick={() => {
                  setFilter("ALL");
                  setQuery("");
                }}
              >
                {t("clearFilters")}
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
            <Table aria-label={t("table.caption")}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.name")}</TableHead>
                  <TableHead>{t("table.scopeType")}</TableHead>
                  <TableHead>{t("table.permissions")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("table.assignments")}
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">
                      {t("table.actions")}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((title) => {
                  const archiveBlocked =
                    title.status === "ACTIVE" &&
                    title.activeAssignmentCount > 0;
                  return (
                    <TableRow key={title.id}>
                      <TableCell className="font-semibold text-foreground">
                        {title.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={
                            title.scopeType === "SUBJECT_PARENT"
                              ? "info"
                              : "purple"
                          }
                        >
                          {title.scopeType === "SUBJECT_PARENT"
                            ? t("scopeTypeSubjectParent")
                            : t("scopeTypeDepartment")}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {title.permissions.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            title.permissions.map((perm) => (
                              <span
                                key={perm}
                                className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                              >
                                {t(PERM_LABEL_KEY[perm])}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={title.status === "ACTIVE" ? "success" : "muted"}
                        >
                          {title.status === "ACTIVE"
                            ? t("statusActive")
                            : t("statusArchived")}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {title.activeAssignmentCount}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              aria-label={t("editButton")}
                              onClick={() => setEditing(title)}
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                            </Button>
                            {archiveBlocked ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <Button
                                      variant="ghost"
                                      size="icon-lg"
                                      aria-label={t("archiveButton")}
                                      aria-disabled="true"
                                      className="cursor-not-allowed opacity-50"
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      <Archive
                                        aria-hidden="true"
                                        className="size-4"
                                      />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {t("archiveBlockedTooltip", {
                                    count: title.activeAssignmentCount,
                                  })}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                aria-label={t("archiveButton")}
                                className="text-edu-error-text hover:text-edu-error-text"
                                disabled={title.status === "ARCHIVED"}
                                onClick={() => setArchiveTarget(title)}
                              >
                                <Archive
                                  aria-hidden="true"
                                  className="size-4"
                                />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CreatePositionTitleSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <CreatePositionTitleSheet
        key={editing?.id ?? "edit-none"}
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        target={editing}
        onSubmit={handlePatch}
      />

      <AlertDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => {
          if (!o) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("archiveConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget
                ? t("archiveConfirmBody", { name: archiveTarget.name })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-edu-error-text text-white hover:bg-edu-error-text/90"
              onClick={() => archiveTarget && handleArchive(archiveTarget)}
            >
              {t("archiveConfirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function EmptyState({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-dashed border-border bg-card py-16 text-center">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{subtitle}</p>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
