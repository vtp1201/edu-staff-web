"use client";

import { LayoutGrid, List, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import type {
  LessonListFilter,
  LessonVisibility,
} from "../../domain/entities/lesson.entity";
import type { SubjectOption } from "./lesson-bank-screen.i-vm";

export type ViewLayout = "grid" | "list";

type LessonBankFilterBarProps = {
  filters: LessonListFilter;
  layout: ViewLayout;
  subjects: SubjectOption[];
  departments: string[];
  onFilterChange: (patch: Partial<LessonListFilter>) => void;
  onLayoutChange: (layout: ViewLayout) => void;
};

const SORT_OPTIONS = ["newest", "most-viewed", "title-asc"] as const;
const VISIBILITY_OPTIONS: (LessonVisibility | "")[] = [
  "",
  "private",
  "dept",
  "school",
];

export function LessonBankFilterBar({
  filters,
  layout,
  subjects,
  departments,
  onFilterChange,
  onLayoutChange,
}: LessonBankFilterBarProps) {
  const t = useTranslations("lessonBank");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-48 flex-1">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={t("filter.searchPlaceholder")}
          value={filters.search ?? ""}
          onChange={(e) =>
            onFilterChange({ search: e.target.value || undefined })
          }
          className="pl-9"
          aria-label={t("filter.searchAriaLabel")}
        />
      </div>

      {/* Subject filter */}
      <Select
        value={filters.subjectId ?? ""}
        onValueChange={(v) => onFilterChange({ subjectId: v || undefined })}
      >
        <SelectTrigger
          className="w-40"
          aria-label={t("filter.subjectAriaLabel")}
        >
          <SelectValue placeholder={t("filter.allSubjects")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{t("filter.allSubjects")}</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Department filter */}
      {departments.length > 0 && (
        <Select
          value={filters.department ?? ""}
          onValueChange={(v) => onFilterChange({ department: v || undefined })}
        >
          <SelectTrigger
            className="w-44"
            aria-label={t("filter.departmentAriaLabel")}
          >
            <SelectValue placeholder={t("filter.allDepartments")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("filter.allDepartments")}</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Visibility filter */}
      <Select
        value={filters.visibility ?? ""}
        onValueChange={(v) =>
          onFilterChange({ visibility: (v as LessonVisibility) || undefined })
        }
      >
        <SelectTrigger
          className="w-40"
          aria-label={t("filter.visibilityAriaLabel")}
        >
          <SelectValue placeholder={t("filter.allVisibility")} />
        </SelectTrigger>
        <SelectContent>
          {VISIBILITY_OPTIONS.map((v) => (
            <SelectItem key={v === "" ? "__all__" : v} value={v}>
              {v === "" ? t("filter.allVisibility") : t(`visibility.${v}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={filters.sort ?? "newest"}
        onValueChange={(v) =>
          onFilterChange({ sort: v as LessonListFilter["sort"] })
        }
      >
        <SelectTrigger className="w-40" aria-label={t("filter.sortAriaLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`filter.sort.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Grid / List toggle */}
      {/* biome-ignore lint/a11y/useSemanticElements: a toolbar group of toggle buttons, not a form fieldset */}
      <div
        className="ml-auto flex items-center gap-1"
        role="group"
        aria-label={t("filter.layoutAriaLabel")}
      >
        <Toggle
          pressed={layout === "grid"}
          onPressedChange={() => onLayoutChange("grid")}
          size="sm"
          aria-label={t("filter.layoutGrid")}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
        </Toggle>
        <Toggle
          pressed={layout === "list"}
          onPressedChange={() => onLayoutChange("list")}
          size="sm"
          aria-label={t("filter.layoutList")}
        >
          <List className="size-4" aria-hidden="true" />
        </Toggle>
      </div>
    </div>
  );
}
