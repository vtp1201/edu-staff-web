"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

export interface QBFilterRequiredPromptProps {
  className?: string;
}

/**
 * The mandatory-search-filter gate prompt (spec §5 state 2 — a DISTINCT 5th
 * state, never folded into emptyFiltered). Shown when scope=search AND neither
 * subjectId nor tag is set; mirrors the BE `422 QUESTION_SEARCH_FILTER_REQUIRED`
 * client-side (no request fires until satisfied). Visually distinct from the
 * shared solid-border `EmptyState`: a DASHED-border card.
 */
export function QBFilterRequiredPrompt({
  className,
}: QBFilterRequiredPromptProps) {
  const t = useTranslations("questionBank.requiredFilterPrompt");
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center rounded-xl border border-border border-dashed bg-card px-6 py-16 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-18 items-center justify-center rounded-[20px] bg-primary/8"
      >
        <Search className="size-8 text-primary/70" />
      </span>
      <p className="mt-4 font-extrabold text-base text-foreground">
        {t("title")}
      </p>
      <p className="mt-1.5 max-w-md text-edu-text-secondary text-sm leading-relaxed">
        {t("body")}
      </p>
    </div>
  );
}
