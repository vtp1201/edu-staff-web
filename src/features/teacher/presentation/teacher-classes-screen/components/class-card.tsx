"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { RoleBadges } from "../../shared/role-badges";
import type { TeacherClassVM } from "../teacher-classes-screen.i-vm";
import { KpiTile } from "./kpi-tile";

/** Class card (design bundle v3 `ChClassList`). Purely presentational: the
 *  single navigable element is the "Mở lớp" link — the mockup's whole-card
 *  `onClick` is a prototype affordance, not an accessible pattern. */
export function ClassCard({ vm }: { vm: TeacherClassVM }) {
  const t = useTranslations("teacherClasses");
  const isHomeroom = vm.roles.includes("homeroom");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      {/* Decorative accent — the role is always ALSO spelled out in the badges. */}
      <div
        aria-hidden="true"
        className={cn(
          "h-1.5",
          isHomeroom ? "bg-edu-role-parent" : "bg-primary",
        )}
      />

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-4 pb-[18px]">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <h2 className="truncate font-extrabold text-[18px] text-edu-text-primary">
              {vm.name}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {t("card.studentCount", { count: vm.studentCount })}
            </p>
          </div>
          <RoleBadges roles={vm.roles} subjects={vm.subjects} />
        </div>

        {vm.kpi && (
          <div className="flex flex-wrap gap-2">
            {vm.kpi.tiles.map((tile) => (
              <KpiTile
                key={tile.key}
                value={tile.value}
                suffix={tile.suffix}
                label={tile.label}
                tone={tile.tone}
                isDemo={tile.isDemo}
              />
            ))}
          </div>
        )}

        <div className="mt-auto flex justify-end pt-1">
          <Link
            href={vm.studentsHref}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1 rounded-[var(--edu-radius-btn)] px-2 font-bold text-xs",
              isHomeroom
                ? "text-edu-purple-text"
                : "text-edu-primary-accessible",
              // Hover cue sits on the CTA alone: the card is NOT clickable, only
              // this link navigates (A11Y-005).
              "outline-none motion-safe:transition-colors hover:bg-muted",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
          >
            {t("card.cta")}
            <ChevronRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
