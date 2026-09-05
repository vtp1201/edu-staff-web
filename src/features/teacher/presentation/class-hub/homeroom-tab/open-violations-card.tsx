"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import type { OpenViolationsCardVm } from "./homeroom-tab.i-vm";

export interface OpenViolationsCardProps {
  vm: OpenViolationsCardVm;
}

/**
 * "Vi phạm chờ xử lý" (US-E24.11). Read-only: every action on a violation lives
 * on the full Vi phạm & Hạnh kiểm screen this card links to.
 *
 * A count of 0 is NOT error-toned — an empty queue is good news, and colouring
 * it red would make "nothing to do" look like a problem.
 */
export function OpenViolationsCard({ vm }: OpenViolationsCardProps) {
  const t = useTranslations("teacherClasses.hub.homeroom.violations");

  return (
    <section className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-border border-b px-5 py-3.5">
        <h3 className="font-extrabold text-foreground text-sm">{t("title")}</h3>
        <StatusBadge
          tone={vm.count > 0 ? "error" : "muted"}
          aria-label={t("countLabel", { count: vm.count })}
        >
          {vm.count}
        </StatusBadge>
      </div>

      {vm.items.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("empty")} className="py-8" />
      ) : (
        <ul>
          {vm.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 border-border border-b px-5 py-3 last:border-b-0"
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-edu-error"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground text-xs">
                  {item.studentName}
                </p>
                <p className="mt-0.5 text-edu-text-secondary text-xs">
                  {item.description}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-edu-text-secondary text-xs">
                {item.dateLabel}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="px-5 pt-4 pb-5">
        <Button asChild variant="outline" className="w-full">
          <Link href={vm.disciplineHref}>{t("openLink")}</Link>
        </Button>
      </div>
    </section>
  );
}
