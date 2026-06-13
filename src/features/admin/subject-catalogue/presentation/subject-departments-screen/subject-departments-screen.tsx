"use client";

import { Archive, Pencil, Plus, RotateCcw, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/utils";
import type { SubjectParent } from "../../domain/entities/subject-parent.entity";
import { ConceptBadge } from "../shared/concept-badge";
import { CreateParentDialog } from "../shared/create-parent-dialog";
import type {
  StatusFilter,
  SubjectDepartmentsScreenProps,
} from "./subject-departments-screen.i-vm";

export function SubjectDepartmentsScreen({
  initialParents,
  onCreateParent,
  onPatchParent,
  onArchiveParent,
  onRestoreParent,
}: SubjectDepartmentsScreenProps) {
  const t = useTranslations("subjectCatalogue.departments");
  const searchId = useId();

  const [parents, setParents] = useState<SubjectParent[]>(initialParents);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectParent | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SubjectParent | null>(
    null,
  );

  const counts = useMemo(
    () => ({
      ALL: parents.length,
      ACTIVE: parents.filter((p) => p.status === "ACTIVE").length,
      ARCHIVED: parents.filter((p) => p.status === "ARCHIVED").length,
    }),
    [parents],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parents.filter((p) => {
      if (filter !== "ALL" && p.status !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [parents, filter, query]);

  const hasNoData = parents.length === 0;
  const filteredEmpty = !hasNoData && visible.length === 0;

  const upsert = (parent: SubjectParent) =>
    setParents((prev) => {
      const idx = prev.findIndex((p) => p.id === parent.id);
      if (idx === -1) return [parent, ...prev];
      const next = [...prev];
      next[idx] = parent;
      return next;
    });

  const handleArchive = async (parent: SubjectParent) => {
    const result = await onArchiveParent(parent.id, parent);
    if (result.ok) {
      upsert({ ...parent, status: "ARCHIVED" });
    }
    setArchiveTarget(null);
  };

  const handleRestore = async (parent: SubjectParent) => {
    const result = await onRestoreParent(parent.id);
    if (result.ok) upsert({ ...parent, status: "ACTIVE" });
  };

  const FILTERS: StatusFilter[] = ["ALL", "ACTIVE", "ARCHIVED"];
  const filterLabel: Record<StatusFilter, string> = {
    ALL: t("filterAll"),
    ACTIVE: t("filterActive"),
    ARCHIVED: t("filterArchived"),
  };

  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">
              {t("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus aria-hidden="true" className="size-4" />
            {t("addButton")}
          </Button>
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
              <Button onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden="true" className="size-4" />
                {t("emptyCreateButton")}
              </Button>
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
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {visible.map((parent) => {
              const archiveBlocked =
                parent.status === "ACTIVE" && parent.activeChildCount > 0;
              return (
                <li
                  key={parent.id}
                  className="flex flex-col gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      {parent.name}
                    </h2>
                    <StatusBadge
                      tone={parent.status === "ACTIVE" ? "success" : "muted"}
                    >
                      {parent.status === "ACTIVE"
                        ? t("statusActive")
                        : t("statusArchived")}
                    </StatusBadge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ConceptBadge parent={parent} />
                    <span className="text-sm text-muted-foreground">
                      {parent.childCount} {t("subjectUnit")} ·{" "}
                      {parent.activeChildCount} {t("cardActive")}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(parent)}
                    >
                      <Pencil aria-hidden="true" className="size-3.5" />
                      {t("editButton")}
                    </Button>
                    {parent.status === "ACTIVE" ? (
                      archiveBlocked ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-disabled="true"
                              onClick={(e) => e.preventDefault()}
                              className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[var(--edu-radius-btn)] px-3 text-sm font-medium text-muted-foreground opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Archive
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              {t("archiveButton")}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("archiveBlockedTooltip", {
                              count: parent.activeChildCount,
                            })}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-edu-error-text hover:text-edu-error-text"
                          onClick={() => setArchiveTarget(parent)}
                        >
                          <Archive aria-hidden="true" className="size-3.5" />
                          {t("archiveButton")}
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(parent)}
                      >
                        <RotateCcw aria-hidden="true" className="size-3.5" />
                        {t("restoreButton")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CreateParentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (data) => {
          const result = await onCreateParent(data);
          if (result.ok) upsert(result.parent);
          return result;
        }}
      />

      <CreateParentDialog
        key={editing?.id ?? "edit-none"}
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        parent={editing}
        onSubmit={async (data) => {
          if (!editing) return { ok: false as const, errorKey: "unknown" };
          const result = await onPatchParent(editing.id, data);
          if (result.ok) upsert(result.parent);
          return result;
        }}
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
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-2">{cta}</div>
    </div>
  );
}
