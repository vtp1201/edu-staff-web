"use client";

import { CopyPlus, Plus, Search, Undo2, X } from "lucide-react";
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
import { cn } from "@/shared/utils";
import type { PositionAssignment } from "../../domain/entities/position-assignment.entity";
import { AssignPositionSheet } from "./assign-position-sheet";
import { CopyAssignmentsSheet } from "./copy-assignments-sheet";
import type {
  AssignmentStatusFilter,
  StaffingAssignmentsScreenProps,
} from "./staffing-assignments-screen.i-vm";

export function StaffingAssignmentsScreen({
  initialAssignments,
  positionTitles,
  isAdmin,
  onAssignPosition,
  onRevokeAssignment,
  onCopyAssignments,
}: StaffingAssignmentsScreenProps) {
  const t = useTranslations("staffing.assignments");
  const searchId = useId();

  const [assignments, setAssignments] =
    useState<PositionAssignment[]>(initialAssignments);
  const [filter, setFilter] = useState<AssignmentStatusFilter>("ALL");
  const [query, setQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PositionAssignment | null>(
    null,
  );

  const counts = useMemo(
    () => ({
      ALL: assignments.length,
      ACTIVE: assignments.filter((a) => a.status === "ACTIVE").length,
      REVOKED: assignments.filter((a) => a.status === "REVOKED").length,
    }),
    [assignments],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((a) => {
      if (filter !== "ALL" && a.status !== filter) return false;
      if (q && !a.memberName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assignments, filter, query]);

  const hasNoData = assignments.length === 0;
  const filteredEmpty = !hasNoData && visible.length === 0;

  const handleAssign: StaffingAssignmentsScreenProps["onAssignPosition"] =
    async (input) => {
      const result = await onAssignPosition(input);
      if (result.ok) {
        setAssignments((prev) => [result.assignment, ...prev]);
        toast.success(t("toast.assignSuccess"));
      } else {
        toast.error(t(`errors.${result.errorKey}`));
      }
      return result;
    };

  const handleCopy: StaffingAssignmentsScreenProps["onCopyAssignments"] =
    async (input) => {
      const result = await onCopyAssignments(input);
      if (result.ok) {
        toast.success(t("toast.copySuccess"));
      } else {
        toast.error(t(`errors.${result.errorKey}`));
      }
      return result;
    };

  const handleRevoke = async (assignment: PositionAssignment) => {
    const result = await onRevokeAssignment(assignment.id);
    if (result.ok) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignment.id ? { ...a, status: "REVOKED" } : a,
        ),
      );
      toast.success(t("toast.revokeSuccess"));
    } else {
      toast.error(t(`errors.${result.errorKey}`));
    }
    setRevokeTarget(null);
  };

  const FILTERS: AssignmentStatusFilter[] = ["ALL", "ACTIVE", "REVOKED"];
  const filterLabel: Record<AssignmentStatusFilter, string> = {
    ALL: t("filterAll"),
    ACTIVE: t("filterActive"),
    REVOKED: t("filterRevoked"),
  };

  return (
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
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCopyOpen(true)}>
              <CopyPlus aria-hidden="true" className="size-4" />
              {t("copyYearButton")}
            </Button>
            <Button onClick={() => setAssignOpen(true)}>
              <Plus aria-hidden="true" className="size-4" />
              {t("assignButton")}
            </Button>
          </div>
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
          <Search aria-hidden="true" className="size-4 text-muted-foreground" />
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
              <Button onClick={() => setAssignOpen(true)}>
                <Plus aria-hidden="true" className="size-4" />
                {t("emptyAssignButton")}
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
                <TableHead>{t("table.member")}</TableHead>
                <TableHead>{t("table.positionTitle")}</TableHead>
                <TableHead>{t("table.scopeEntity")}</TableHead>
                <TableHead>{t("table.academicYear")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                {isAdmin && (
                  <TableHead className="text-right">
                    {t("table.actions")}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold text-foreground">
                    {a.memberName}
                  </TableCell>
                  <TableCell>{a.positionTitleName}</TableCell>
                  <TableCell>
                    {a.scopeEntityId ?? (
                      <span className="text-muted-foreground">
                        {t("noScopeEntity")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {a.academicYearId}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      tone={a.status === "ACTIVE" ? "success" : "muted"}
                    >
                      {a.status === "ACTIVE"
                        ? t("statusActive")
                        : t("statusRevoked")}
                    </StatusBadge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-lg"
                          aria-label={t("revokeButton")}
                          className="text-edu-error-text hover:text-edu-error-text"
                          disabled={a.status === "REVOKED"}
                          onClick={() => setRevokeTarget(a)}
                        >
                          <Undo2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssignPositionSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        positionTitles={positionTitles}
        onSubmit={handleAssign}
      />

      <CopyAssignmentsSheet
        open={copyOpen}
        onOpenChange={setCopyOpen}
        onSubmit={handleCopy}
      />

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget
                ? t("revokeConfirmBody", { name: revokeTarget.memberName })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-edu-error-text text-edu-error-foreground hover:bg-edu-error-text/90"
              onClick={() => revokeTarget && handleRevoke(revokeTarget)}
            >
              {t("revokeConfirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
