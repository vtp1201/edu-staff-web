"use client";

import { Check, Clock, Eye, PenLine, ScrollText, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LPCardVM } from "./lesson-plan-list-screen.i-vm";

export interface LPCardProps {
  plan: LPCardVM;
  onOpen: (id: string) => void;
}

/**
 * Lesson-plan grid card (design listScreen.cardGrid). Status is `StatusBadge`
 * (icon + text, never color-only). Owner attribution (browse scope) is the
 * pre-resolved `ownerLabel` — no per-card lookup (FR-007). Uniform primary-tint
 * header strip: the design's per-subject hex isn't a design token, so it is
 * intentionally normalized to the primary tint (no new token / no ADR needed).
 */
export function LPCard({ plan, onOpen }: LPCardProps) {
  const t = useTranslations("lessonPlan");
  const tCard = useTranslations("lessonPlan.card");
  const draft = plan.status === "DRAFT";

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex h-16 items-center gap-3 bg-primary/8 px-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-card shadow-card">
          <ScrollText className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-[11px] text-primary">
            {plan.subjectName}
          </p>
          <p className="text-[11px] text-edu-text-secondary">
            {plan.gradeLevel}
          </p>
        </div>
        <StatusBadge tone={draft ? "warning" : "success"}>
          {draft ? (
            <PenLine className="size-3" aria-hidden="true" />
          ) : (
            <Check className="size-3" aria-hidden="true" />
          )}
          {draft ? t("status.draft") : t("status.published")}
        </StatusBadge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="line-clamp-2 min-h-[38px] font-bold text-foreground text-sm leading-snug">
          {plan.title}
        </p>

        {plan.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full px-2 py-0.5 font-bold text-[10px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex-1" />

        <p className="flex flex-wrap items-center gap-1.5 text-edu-text-secondary text-[11px]">
          <Clock className="size-2.5" aria-hidden="true" />
          {tCard("updatedAt", { date: plan.updatedAtDisplay })}
          {!plan.isMine && (
            <>
              <span aria-hidden="true">·</span>
              <User className="size-2.5" aria-hidden="true" />
              {plan.ownerLabel}
            </>
          )}
        </p>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpen(plan.id)}
          className="mt-1 w-full"
          aria-label={`${plan.isMine ? tCard("edit") : tCard("view")}: ${plan.title}`}
        >
          {plan.isMine ? (
            <PenLine className="mr-1.5 size-3.5" aria-hidden="true" />
          ) : (
            <Eye className="mr-1.5 size-3.5" aria-hidden="true" />
          )}
          {plan.isMine ? tCard("edit") : tCard("view")}
        </Button>
      </div>
    </div>
  );
}
