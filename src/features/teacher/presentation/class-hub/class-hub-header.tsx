"use client";

import { ChevronRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { RoleBadges } from "../shared/role-badges";
import type { ClassHubHeaderVm } from "./class-hub.i-vm";

export interface ClassHubHeaderProps {
  vm: ClassHubHeaderVm;
}

/**
 * Class-hub identity header (design `ClassHubScreen`): breadcrumb + 46×46 icon
 * box + "Lớp <name>" + role badges + "<n> học sinh · Năm học <year>".
 *
 * The mockup's back affordance is a client-state `<button>`; this is a real
 * route, so it is a `Link` to the class list — same visual, routed interaction.
 */
export function ClassHubHeader({ vm }: ClassHubHeaderProps) {
  const t = useTranslations("teacher.classHub");
  const isHomeroom = vm.roles.includes("homeroom");
  const title = t("title", { className: vm.className });

  return (
    <div className="space-y-4">
      <nav aria-label={t("breadcrumbLabel")}>
        <ol className="flex flex-wrap items-center gap-1.5 text-edu-text-secondary text-sm">
          <li>
            <Link
              href={vm.classesHref}
              className="rounded-md px-1 font-medium outline-none hover:text-edu-text-primary focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("breadcrumbClasses")}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-3.5" />
          </li>
          <li>
            <span
              aria-current="page"
              className="font-semibold text-edu-text-secondary"
            >
              {title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-center gap-3.5 rounded-[var(--edu-radius-card)] border border-border bg-card px-5 py-4 shadow-card">
        {/* Decorative — the role is ALSO spelled out by the badges (a11y). */}
        <span
          aria-hidden="true"
          className={cn(
            "grid size-[46px] shrink-0 place-items-center rounded-[11px]",
            isHomeroom ? "bg-edu-role-parent/18" : "bg-primary/18",
          )}
        >
          <LayoutGrid
            className={cn(
              "size-5",
              isHomeroom ? "text-edu-role-parent" : "text-primary",
            )}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-extrabold text-[17px] text-edu-text-primary">
              {title}
            </h1>
            <RoleBadges roles={vm.roles} subjects={vm.subjects} size="md" />
          </div>
          <p className="mt-0.5 text-edu-text-secondary text-xs">
            {t("meta", {
              count: vm.studentCount,
              year: vm.academicYearLabel,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
