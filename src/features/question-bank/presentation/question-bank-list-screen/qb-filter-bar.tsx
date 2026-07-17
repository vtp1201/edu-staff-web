"use client";

import { AlertTriangle, Check, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/shared/utils";
import type {
  Difficulty,
  QuestionType,
} from "../../domain/entities/question.entity";
import type { ListScope, SubjectOption } from "../shared.i-vm";
import type { QuestionBankFilterState } from "./question-bank-list-screen.i-vm";

export interface QBFilterBarProps {
  filters: QuestionBankFilterState;
  subjects: SubjectOption[];
  gradeOptions: string[];
  scope: ListScope;
  /** Only meaningful in scope=search — drives the mandatoryFilterIndicator.
   * Screen computes it via the domain's isSearchFilterSatisfied predicate. */
  isFilterSatisfied: boolean;
  onFilterChange: (patch: Partial<QuestionBankFilterState>) => void;
}

// Radix Select forbids an empty-string item value; use a sentinel for "all".
const ALL = "__all__";
const TYPE_OPTIONS: QuestionType[] = ["ESSAY", "SHORT_ANSWER", "FILL_IN"];
const DIFFICULTY_OPTIONS: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const STATUS_OPTIONS = ["DRAFT", "PUBLISHED"] as const;

/**
 * Client-side filter bar (5 shadcn `Select`s used directly — no `QBDropdown`
 * wrapper, per component-architecture.md §1). The status Select is DOM-absent
 * in scope=search (PUBLISHED-only). The mandatory-filter indicator (icon+text,
 * `aria-live`) is scope=search only and never conveys state by color alone.
 */
export function QBFilterBar({
  filters,
  subjects,
  gradeOptions,
  scope,
  isFilterSatisfied,
  onFilterChange,
}: QBFilterBarProps) {
  const t = useTranslations("questionBank.filter");
  const tType = useTranslations("questionBank.questionType");
  const tDiff = useTranslations("questionBank.difficulty");
  const tStatus = useTranslations("questionBank.status");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="relative min-w-48 flex-1">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={
            scope === "search" ? t("tagPlaceholder") : t("searchPlaceholder")
          }
          value={filters.tag}
          onChange={(e) => onFilterChange({ tag: e.target.value })}
          className="pl-9"
          aria-label={
            scope === "search" ? t("tagAriaLabel") : t("searchAriaLabel")
          }
        />
      </div>

      <Select
        value={filters.subjectId || ALL}
        onValueChange={(v) => onFilterChange({ subjectId: v === ALL ? "" : v })}
      >
        <SelectTrigger className="w-44" aria-label={t("subjectAriaLabel")}>
          <SelectValue placeholder={t("allSubjects")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allSubjects")}</SelectItem>
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
        <SelectTrigger className="w-40" aria-label={t("gradeAriaLabel")}>
          <SelectValue placeholder={t("allGrades")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allGrades")}</SelectItem>
          {gradeOptions.map((g) => (
            <SelectItem key={g} value={g}>
              {g}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.questionType || ALL}
        onValueChange={(v) =>
          onFilterChange({ questionType: v === ALL ? "" : (v as QuestionType) })
        }
      >
        <SelectTrigger className="w-44" aria-label={t("typeAriaLabel")}>
          <SelectValue placeholder={t("allTypes")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allTypes")}</SelectItem>
          {TYPE_OPTIONS.map((qt) => (
            <SelectItem key={qt} value={qt}>
              {tType(qt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.difficulty || ALL}
        onValueChange={(v) =>
          onFilterChange({ difficulty: v === ALL ? "" : (v as Difficulty) })
        }
      >
        <SelectTrigger className="w-40" aria-label={t("difficultyAriaLabel")}>
          <SelectValue placeholder={t("allDifficulties")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("allDifficulties")}</SelectItem>
          {DIFFICULTY_OPTIONS.map((d) => (
            <SelectItem key={d} value={d}>
              {tDiff(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {scope === "mine" && (
        <Select
          value={filters.status || ALL}
          onValueChange={(v) =>
            onFilterChange({
              status: v === ALL ? "" : (v as "DRAFT" | "PUBLISHED"),
            })
          }
        >
          <SelectTrigger className="w-44" aria-label={t("statusAriaLabel")}>
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s === "DRAFT" ? "draft" : "published")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {scope === "search" && (
        <p
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1.5 font-bold text-xs",
            isFilterSatisfied
              ? "text-edu-success-text"
              : "text-edu-warning-foreground",
          )}
        >
          {isFilterSatisfied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-3.5" aria-hidden="true" />
          )}
          {isFilterSatisfied ? t("mandatorySatisfied") : t("mandatoryRequired")}
        </p>
      )}
    </div>
  );
}
