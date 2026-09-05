"use client";

import { BookOpen, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import type { ClassHubTab } from "@/features/teacher/domain/class-hub-tabs";

/** The tabs whose real body has not shipped yet. `timetable` left this union in
 *  US-E24.9 and `homeroom` in US-E24.11 (real tab bodies); `students` never was
 *  one. `course` is the last placeholder. */
export type PlaceholderTab = Exclude<
  ClassHubTab,
  "students" | "timetable" | "homeroom"
>;

export interface TabPlaceholderProps {
  tab: PlaceholderTab;
}

const PLACEHOLDER_ICON: Record<PlaceholderTab, LucideIcon> = {
  course: BookOpen,
};

/**
 * "Đang xây dựng" body for a tab whose feature has not shipped yet. Copy is
 * per tab so each follow-up story knows exactly which placeholder it replaces.
 */
export function TabPlaceholder({ tab }: TabPlaceholderProps) {
  const t = useTranslations("teacherClasses.hub.placeholder");
  return (
    <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <EmptyState
        icon={PLACEHOLDER_ICON[tab]}
        title={t("title")}
        body={t(`body.${tab}`)}
        className="py-16"
      />
    </div>
  );
}
