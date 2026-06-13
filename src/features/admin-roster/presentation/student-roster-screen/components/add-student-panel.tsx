"use client";

import { Check, Plus, Search, TriangleAlert, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SearchStudent } from "@/features/admin-roster/domain/entities/search-student.entity";
import { cn } from "@/shared/utils";

const MAX_RESULTS = 25;

function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.at(-1) ?? name).charAt(0).toUpperCase();
}

interface AddStudentPanelProps {
  searchPool: SearchStudent[];
  /** Ids already in the roster — disables their rows. */
  enrolledIds: ReadonlySet<string>;
  /** Ids that were just acted on (optimistic guard) — disables their rows. */
  recentlyAdded: ReadonlySet<string>;
  disabled?: boolean;
  onRequestEnroll: (student: SearchStudent) => void;
}

export function AddStudentPanel({
  searchPool,
  enrolledIds,
  recentlyAdded,
  disabled = false,
  onRequestEnroll,
}: AddStudentPanelProps) {
  const t = useTranslations("adminRoster");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? searchPool.filter(
          (s) =>
            s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
        )
      : searchPool;
    return base.slice(0, MAX_RESULTS);
  }, [query, searchPool]);

  return (
    <div className="sticky top-0 flex h-fit flex-col overflow-hidden rounded-xl border border-edu-border bg-edu-card shadow-card">
      <div className="border-edu-border border-b px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-edu-primary/[0.12]">
            <Plus className="size-3.5 text-edu-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-edu-text-primary text-sm">
              {t("addPanel.title")}
            </div>
            <div className="mt-0.5 text-edu-text-muted text-xs">
              {t("addPanel.subtitle")}
            </div>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 rounded-lg border border-edu-border bg-edu-bg px-3 py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
          <Search className="size-3.5 text-edu-text-muted" aria-hidden="true" />
          <span className="sr-only">{t("addPanel.searchPlaceholder")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("addPanel.searchPlaceholder")}
            className="w-full bg-transparent text-edu-text-primary text-sm outline-none"
          />
        </label>
      </div>

      <ScrollArea className="max-h-[460px]">
        {results.length === 0 ? (
          <div className="px-5 py-6 text-center text-edu-text-muted text-xs">
            {t("addPanel.noResults")}
          </div>
        ) : (
          results.map((s) => {
            const alreadyEnrolled =
              enrolledIds.has(s.id) || recentlyAdded.has(s.id);
            const conflictClass = !alreadyEnrolled && s.currentClassName;
            return (
              <div
                key={s.id}
                className="flex items-start gap-2.5 border-edu-border border-t px-5 py-3"
              >
                <Avatar>
                  <AvatarFallback className="bg-primary/15 font-bold text-primary text-xs">
                    {initial(s.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-edu-text-primary text-sm">
                    {s.name}
                  </div>
                  <div className="mt-0.5 font-mono text-edu-text-muted text-xs tabular-nums">
                    {s.id}
                  </div>
                  {conflictClass && (
                    <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-edu-warning/30 bg-edu-warning/15 px-2 py-1.5">
                      <TriangleAlert
                        className="mt-0.5 size-3 shrink-0 text-edu-warning-foreground"
                        aria-hidden="true"
                      />
                      <p className="font-semibold text-[10.5px] text-edu-warning-foreground leading-snug">
                        {t("addPanel.transferWarning", {
                          className: s.currentClassName ?? "",
                        })}
                      </p>
                    </div>
                  )}
                  {!conflictClass && !alreadyEnrolled && (
                    <div className="mt-1">
                      <StatusBadge tone="muted">
                        {t("addPanel.unassigned")}
                      </StatusBadge>
                    </div>
                  )}
                </div>
                <div className="mt-0.5 shrink-0">
                  {alreadyEnrolled ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-md border border-edu-border bg-edu-bg px-2.5 font-bold text-edu-text-muted text-xs"
                    >
                      <Check className="size-3" aria-hidden="true" />
                      {t("addPanel.inClass")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRequestEnroll(s)}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2.5 font-bold text-xs",
                        "motion-safe:transition-opacity hover:opacity-85",
                        "outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        conflictClass
                          ? "bg-edu-warning text-edu-warning-foreground"
                          : "bg-edu-primary text-white",
                      )}
                    >
                      <Plus className="size-3" aria-hidden="true" />
                      {conflictClass
                        ? t("addPanel.transfer")
                        : t("addPanel.add")}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </ScrollArea>

      <div className="border-edu-border border-t bg-edu-bg px-4 py-3">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-edu-border border-dashed bg-transparent px-3 font-bold text-edu-text-secondary text-xs opacity-70"
        >
          <Upload className="size-3.5" aria-hidden="true" />
          {t("addPanel.importCsv")}
        </button>
      </div>
    </div>
  );
}
