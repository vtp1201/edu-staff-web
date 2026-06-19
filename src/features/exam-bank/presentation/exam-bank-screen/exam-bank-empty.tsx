"use client";

import { FileQuestion, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type ExamBankEmptyProps = {
  canCreate: boolean;
  hasActiveFilter: boolean;
  onCreate?: () => void;
};

export function ExamBankEmpty({
  canCreate,
  hasActiveFilter,
  onCreate,
}: ExamBankEmptyProps) {
  const t = useTranslations("examBank");

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-8 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-[var(--edu-radius-card)] bg-muted">
        <FileQuestion
          className="size-8 text-muted-foreground"
          aria-hidden="true"
        />
      </span>

      <div className="space-y-1">
        <p className="font-bold text-base text-foreground">
          {hasActiveFilter ? t("empty.noMatch") : t("empty.title")}
        </p>
        <p className="text-muted-foreground text-sm">
          {hasActiveFilter ? t("empty.noMatchBody") : t("empty.body")}
        </p>
      </div>

      {canCreate && !hasActiveFilter && onCreate && (
        <Button onClick={onCreate} size="sm">
          <Plus className="mr-1.5 size-4" aria-hidden="true" />
          {t("empty.cta")}
        </Button>
      )}
    </div>
  );
}
