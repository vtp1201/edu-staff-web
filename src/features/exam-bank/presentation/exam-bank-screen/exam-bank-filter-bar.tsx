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
import type { ExamBankStatus } from "../../domain/entities/exam-bank-summary.entity";
import type { SubjectOption, TeacherOption } from "./exam-bank-screen.i-vm";

export interface ExamBankFilterState {
  subjectId?: string;
  status?: ExamBankStatus;
  teacherId?: string;
  search?: string;
}

type ExamBankFilterBarProps = {
  filters: ExamBankFilterState;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  showTeacherFilter: boolean;
  onFilterChange: (patch: Partial<ExamBankFilterState>) => void;
};

const STATUS_OPTIONS: (ExamBankStatus | "")[] = ["", "draft", "published"];

export function ExamBankFilterBar({
  filters,
  subjects,
  teachers,
  showTeacherFilter,
  onFilterChange,
}: ExamBankFilterBarProps) {
  const t = useTranslations("examBank");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-48 flex-1">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground"
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

      {/* Status filter */}
      <Select
        value={filters.status ?? ""}
        onValueChange={(v) =>
          onFilterChange({ status: (v as ExamBankStatus) || undefined })
        }
      >
        <SelectTrigger
          className="w-40"
          aria-label={t("filter.statusAriaLabel")}
        >
          <SelectValue placeholder={t("filter.allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s === "" ? "__all__" : s} value={s}>
              {s === "" ? t("filter.allStatuses") : t(`status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Teacher filter (admin only) */}
      {showTeacherFilter && (
        <Select
          value={filters.teacherId ?? ""}
          onValueChange={(v) => onFilterChange({ teacherId: v || undefined })}
        >
          <SelectTrigger
            className="w-44"
            aria-label={t("filter.teacherAriaLabel")}
          >
            <SelectValue placeholder={t("filter.allTeachers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("filter.allTeachers")}</SelectItem>
            {teachers.map((te) => (
              <SelectItem key={te.id} value={te.id}>
                {te.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
