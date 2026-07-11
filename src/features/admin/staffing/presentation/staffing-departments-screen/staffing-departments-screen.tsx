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
import type { Department } from "../../domain/entities/department.entity";
import { CreateDepartmentSheet } from "./create-department-sheet";
import type {
  DepartmentStatusFilter,
  StaffingDepartmentsScreenProps,
} from "./staffing-departments-screen.i-vm";

export function StaffingDepartmentsScreen({
  initialDepartments,
  isAdmin,
  onCreateDepartment,
  onPatchDepartment,
  onArchiveDepartment,
}: StaffingDepartmentsScreenProps) {
  const t = useTranslations("staffing.departments");
  const searchId = useId();
  const blockedHintId = useId();

  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [filter, setFilter] = useState<DepartmentStatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Department | null>(null);

  const counts = useMemo(
    () => ({
      ALL: departments.length,
      ACTIVE: departments.filter((d) => d.status === "ACTIVE").length,
      ARCHIVED: departments.filter((d) => d.status === "ARCHIVED").length,
    }),
    [departments],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return departments.filter((d) => {
      if (filter !== "ALL" && d.status !== filter) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [departments, filter, query]);

  const hasNoData = departments.length === 0;
  const filteredEmpty = !hasNoData && visible.length === 0;

  const upsert = (dep: Department) =>
    setDepartments((prev) => {
      const idx = prev.findIndex((d) => d.id === dep.id);
      if (idx === -1) return [dep, ...prev];
      const next = [...prev];
      next[idx] = dep;
      return next;
    });

  const handleCreate = async (name: string) => {
    const result = await onCreateDepartment({
      name,
      conceptLabelSuggested: null,
      conceptLabelCustom: null,
      subjectParentIds: [],
    });
    if (result.ok) {
      upsert(result.department);
      toast.success(t("toast.createSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey}`));
    }
    return result;
  };

  const handlePatch = async (name: string) => {
    if (!editing) return { ok: false as const, errorKey: "unknown" as const };
    const result = await onPatchDepartment(editing.id, { name });
    if (result.ok) {
      upsert(result.department);
      toast.success(t("toast.editSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey}`));
    }
    return result;
  };

  const handleArchive = async (dep: Department) => {
    const result = await onArchiveDepartment(dep.id);
    if (result.ok) {
      upsert({ ...dep, status: "ARCHIVED" });
      toast.success(t("toast.archiveSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey}`));
    }
    setArchiveTarget(null);
  };

  const FILTERS: DepartmentStatusFilter[] = ["ALL", "ACTIVE", "ARCHIVED"];
  const filterLabel: Record<DepartmentStatusFilter, string> = {
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
            <legend className="sr-only">{t("filterGroupLabel")}</legend>
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
                {visible.map((dep) => {
                  const archiveBlocked =
                    dep.status === "ACTIVE" && dep.activeAssignmentCount > 0;
                  return (
                    <TableRow key={dep.id}>
                      <TableCell className="font-semibold text-foreground">
                        {dep.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={dep.status === "ACTIVE" ? "success" : "muted"}
                        >
                          {dep.status === "ACTIVE"
                            ? t("statusActive")
                            : t("statusArchived")}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {dep.activeAssignmentCount}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              aria-label={t("editButton")}
                              onClick={() => setEditing(dep)}
                            >
                              <Pencil aria-hidden="true" className="size-4" />
                            </Button>
                            {archiveBlocked ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <span
                                      id={`${blockedHintId}-${dep.id}`}
                                      className="sr-only"
                                    >
                                      {t("archiveBlockedTooltip", {
                                        count: dep.activeAssignmentCount,
                                      })}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon-lg"
                                      aria-label={t("archiveButton")}
                                      aria-disabled="true"
                                      aria-describedby={`${blockedHintId}-${dep.id}`}
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
                                    count: dep.activeAssignmentCount,
                                  })}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                aria-label={t("archiveButton")}
                                className="text-edu-error-text hover:text-edu-error-text"
                                disabled={dep.status === "ARCHIVED"}
                                onClick={() => setArchiveTarget(dep)}
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

      <CreateDepartmentSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <CreateDepartmentSheet
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
              className="bg-edu-error-text text-edu-error-foreground hover:bg-edu-error-text/90"
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
