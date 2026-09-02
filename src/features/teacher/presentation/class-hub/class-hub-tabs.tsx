"use client";

import {
  BookOpen,
  Calendar,
  type LucideIcon,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ClassHubTab } from "@/features/teacher/domain/class-hub-tabs";
import { cn } from "@/shared/utils";
import type { ClassHubTabsVm } from "./class-hub.i-vm";

export interface ClassHubTabsProps {
  vm: ClassHubTabsVm;
}

/** Fixed design decision, not per-request data — kept out of the ViewModel. */
const TAB_ICON: Record<ClassHubTab, LucideIcon> = {
  students: Users,
  timetable: Calendar,
  course: BookOpen,
  homeroom: Shield,
};

/** DOM ids shared with the panel wrapper in `ClassHubScreen`. */
export function tabId(tab: ClassHubTab): string {
  return `classhub-tab-${tab}`;
}
export function panelId(tab: ClassHubTab): string {
  return `classhub-panel-${tab}`;
}

/**
 * Underline tab strip (US-E24.8). Each tab is a real anchor to `?tab=<id>`:
 * the URL is the state, the server resolves it, and Tab/Enter navigation comes
 * free from the anchor semantics. Only ONE panel exists at a time (the server
 * renders just the active body), so there is nothing to show/hide client-side.
 */
export function ClassHubTabs({ vm }: ClassHubTabsProps) {
  const t = useTranslations("teacher.classHub.tabs");

  return (
    <div
      role="tablist"
      aria-label={t("navLabel")}
      className="flex flex-wrap gap-1 border-border border-b"
    >
      {vm.tabs.map(({ id, href }) => {
        const Icon = TAB_ICON[id];
        const active = id === vm.activeTab;
        return (
          <Link
            key={id}
            id={tabId(id)}
            href={href}
            role="tab"
            aria-selected={active}
            aria-controls={panelId(vm.activeTab)}
            className={cn(
              "-mb-px inline-flex min-h-[44px] items-center gap-1.5 border-b-2 px-4 py-2.5 font-semibold text-[13px] outline-none motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary font-bold text-primary"
                : "border-transparent text-edu-text-secondary hover:text-edu-text-primary",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {t(id)}
          </Link>
        );
      })}
    </div>
  );
}
