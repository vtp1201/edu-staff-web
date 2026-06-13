"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { RosterStudent } from "@/features/admin-roster/domain/entities/roster-student.entity";
import { cn } from "@/shared/utils";
import { GenderBadge } from "./gender-badge";
import { RosterPagination } from "./roster-pagination";

const PAGE_SIZE = 10;

function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.at(-1) ?? name).charAt(0).toUpperCase();
}

interface RosterTableProps {
  roster: RosterStudent[];
  disabled?: boolean;
  onRequestUnenrollOne: (studentId: string) => void;
  onRequestUnenrollMany: (studentIds: string[]) => void;
}

export function RosterTable({
  roster,
  disabled = false,
  onRequestUnenrollOne,
  onRequestUnenrollMany,
}: RosterTableProps) {
  const t = useTranslations("adminRoster");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const headerCheckboxRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }, [roster, search]);

  // Reset page + selection whenever the source roster or filter changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetting on filter change is intentional
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [roster, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const pageRowIds = pageRows.map((s) => s.id);
  const allPageSelected =
    pageRowIds.length > 0 && pageRowIds.every((id) => selected.has(id));
  const somePageSelected = pageRowIds.some((id) => selected.has(id));

  // Indeterminate state via the Radix data attribute is not exposed; set on the
  // underlying input via ref (the trigger is a button — Radix uses aria-checked).
  useEffect(() => {
    const node = headerCheckboxRef.current;
    if (node) {
      node.setAttribute(
        "aria-checked",
        allPageSelected ? "true" : somePageSelected ? "mixed" : "false",
      );
    }
  }, [allPageSelected, somePageSelected]);

  const togglePageAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageRowIds) {
        if (allPageSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const th =
    "px-4 py-2.5 text-left font-bold text-[10.5px] text-edu-text-muted uppercase tracking-wider whitespace-nowrap";

  return (
    <div className="overflow-hidden rounded-xl border border-edu-border bg-edu-card shadow-card">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5 border-edu-border border-b px-5 py-4">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-edu-border bg-edu-bg px-3 py-2">
          <Search className="size-3.5 text-edu-text-muted" aria-hidden="true" />
          <span className="sr-only">{t("table.searchPlaceholder")}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("table.searchPlaceholder")}
            className="w-full bg-transparent text-edu-text-primary text-sm outline-none"
          />
          {search && (
            <button
              type="button"
              aria-label={t("table.clearSelection")}
              onClick={() => setSearch("")}
              className="flex size-[44px] items-center justify-center text-edu-text-muted"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          )}
        </label>
        <Button variant="secondary" size="sm" disabled>
          {t("table.exportCsv")}
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-primary/30 border-b bg-primary/[0.06] px-5 py-2.5">
          <div className="flex-1 font-bold text-primary text-xs">
            {t("table.selected", { count: selected.size })}
          </div>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-md px-2 py-1 font-semibold text-edu-text-secondary text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("table.clearSelection")}
          </button>
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled}
            onClick={() => onRequestUnenrollMany(Array.from(selected))}
          >
            <X className="size-3" aria-hidden="true" />
            {t("table.removeFromClass")}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-edu-bg">
              <th className="w-[38px] py-2.5 pr-2 pl-5">
                <Checkbox
                  ref={headerCheckboxRef}
                  aria-label={t("table.selectAll")}
                  checked={
                    allPageSelected
                      ? true
                      : somePageSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={togglePageAll}
                  disabled={pageRowIds.length === 0}
                />
              </th>
              <th className={cn(th, "w-9")}>#</th>
              <th className={th}>{t("table.name")}</th>
              <th className={th}>{t("table.studentId")}</th>
              <th className={th}>{t("table.dob")}</th>
              <th className={cn(th, "text-center")}>{t("table.gender")}</th>
              <th className={th}>{t("table.status")}</th>
              <th className={cn(th, "text-right")} />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-edu-text-muted text-sm"
                >
                  {t("table.noMatch")}
                </td>
              </tr>
            ) : (
              pageRows.map((s, i) => {
                const isSelected = selected.has(s.id);
                const isTransferred = s.status === "transferred";
                const absoluteIndex = (safePage - 1) * PAGE_SIZE + i + 1;
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-edu-border border-t motion-safe:transition-colors",
                      isSelected ? "bg-primary/[0.04]" : "hover:bg-edu-bg",
                    )}
                  >
                    <td className="py-3 pr-2 pl-5 align-middle">
                      <Checkbox
                        aria-label={t("table.selectStudent", { name: s.name })}
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(s.id)}
                      />
                    </td>
                    <td className="px-4 py-3 align-middle text-edu-text-muted text-xs tabular-nums">
                      {absoluteIndex}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarFallback className="bg-primary/15 font-bold text-[11px] text-primary">
                            {initial(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "font-semibold text-sm",
                            isTransferred
                              ? "text-edu-text-muted line-through"
                              : "text-edu-text-primary",
                          )}
                        >
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle font-mono text-edu-text-secondary text-xs tabular-nums">
                      {s.id}
                    </td>
                    <td className="px-4 py-3 align-middle text-edu-text-secondary text-xs tabular-nums">
                      {s.dob}
                    </td>
                    <td className="px-4 py-3 text-center align-middle">
                      <GenderBadge gender={s.gender} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {isTransferred ? (
                        <StatusBadge tone="muted">
                          {t("status.transferred")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="success">
                          {t("status.active")}
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <button
                        type="button"
                        aria-label={`${t("table.removeFromClass")} — ${s.name}`}
                        disabled={disabled}
                        onClick={() => onRequestUnenrollOne(s.id)}
                        className={cn(
                          "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[7px] border border-edu-border text-edu-text-muted",
                          "motion-safe:transition-colors hover:border-edu-error hover:bg-edu-error-light hover:text-edu-error",
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <RosterPagination
        page={safePage}
        totalPages={totalPages}
        totalCount={filtered.length}
        pageRowCount={pageRows.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
