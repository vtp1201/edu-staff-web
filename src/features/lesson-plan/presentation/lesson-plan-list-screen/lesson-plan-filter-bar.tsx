"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LessonPlanStatus } from "../../domain/entities/lesson-plan.entity";
import type { ListScope, SubjectOption } from "../shared.i-vm";
import type { LessonPlanFilterState } from "./lesson-plan-list-screen.i-vm";

export interface LessonPlanFilterBarProps {
  filters: LessonPlanFilterState;
  subjects: SubjectOption[];
  gradeOptions: string[];
  scope: ListScope;
  onFilterChange: (patch: Partial<LessonPlanFilterState>) => void;
}

// Radix Select forbids an empty-string item value; use a sentinel for "all".
const ALL = "__all__";
const STATUS_OPTIONS: LessonPlanStatus[] = ["DRAFT", "PUBLISHED"];

/**
 * Client-side filter bar. The status Select is DOM-absent in browse scope
 * (FR-007 — PUBLISHED-only, no status filter surfaced). `scope` is a prop so
 * this one component omits that control internally rather than the parent
 * forking a second bar.
 */
export function LessonPlanFilterBar({
  filters,
  subjects,
  gradeOptions,
  scope,
  onFilterChange,
}: LessonPlanFilterBarProps) {
  const t = useTranslations("lessonPlan");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="relative min-w-48 flex-1">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={t("filter.searchPlaceholder")}
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="pl-9"
          aria-label={t("filter.searchAriaLabel")}
        />
      </div>

      <Select
        value={filters.subjectId || ALL}
        onValueChange={(v) => onFilterChange({ subjectId: v === ALL ? "" : v })}
      >
        <SelectTrigger
          className="w-44"
          aria-label={t("filter.subjectAriaLabel")}
        >
          <SelectValue placeholder={t("filter.allSubjects")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filter.allSubjects")}</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.gradeLevel || ALL}
        onValueChange={(v) =>
          onFilterChange({ gradeLevel: v === ALL ? "" : v })
        }
      >
        <SelectTrigger className="w-40" aria-label={t("filter.gradeAriaLabel")}>
          <SelectValue placeholder={t("filter.allGrades")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filter.allGrades")}</SelectItem>
          {gradeOptions.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {scope === "mine" && (
        <Select
          value={filters.status || ALL}
          onValueChange={(v) =>
            onFilterChange({ status: v === ALL ? "" : (v as LessonPlanStatus) })
          }
        >
          <SelectTrigger
            className="w-44"
            aria-label={t("filter.statusAriaLabel")}
          >
            <SelectValue placeholder={t("filter.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filter.allStatuses")}</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s === "DRAFT" ? "draft" : "published"}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
