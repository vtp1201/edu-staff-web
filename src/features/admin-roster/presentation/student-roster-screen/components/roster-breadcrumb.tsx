"use client";

import { ChevronDown, ChevronRight, Grid3x3 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ClassSummary } from "@/features/admin-roster/domain/entities/class-summary.entity";
import { cn } from "@/shared/utils";

interface RosterBreadcrumbProps {
  classList: ClassSummary[];
  currentClassId: string;
  onClassChange: (classId: string) => void;
}

export function RosterBreadcrumb({
  classList,
  currentClassId,
  onClassChange,
}: RosterBreadcrumbProps) {
  const t = useTranslations("adminRoster");
  const current = classList.find((c) => c.id === currentClassId);

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-edu-text-muted text-sm">
      <span>{t("breadcrumb.classes")}</span>
      <ChevronRight className="size-3.5" aria-hidden="true" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5",
            "font-bold text-edu-text-primary",
            "motion-safe:transition-colors hover:bg-edu-bg",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {t("classInfo.class", { name: current?.name ?? "" })}
          <ChevronDown
            className="size-3 text-edu-text-muted"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          {classList.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => onClassChange(c.id)}
              className={cn(
                "flex items-center gap-2",
                c.id === currentClassId &&
                  "bg-primary/12 font-bold text-primary",
              )}
            >
              <Grid3x3
                className={cn(
                  "size-3",
                  c.id === currentClassId
                    ? "text-primary"
                    : "text-edu-text-muted",
                )}
                aria-hidden="true"
              />
              <span className="flex-1">
                {t("classInfo.class", { name: c.name })}
              </span>
              <span className="text-[10px] text-edu-text-muted tabular-nums">
                K{c.gradeLevel}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <ChevronRight className="size-3.5" aria-hidden="true" />
      <span className="font-semibold text-edu-text-secondary">
        {t("breadcrumb.roster")}
      </span>
    </div>
  );
}
