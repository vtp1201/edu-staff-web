"use client";

import { BookOpen, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type LessonBankEmptyProps = {
  canUpload: boolean;
  hasActiveFilter: boolean;
  onUpload?: () => void;
};

export function LessonBankEmpty({
  canUpload,
  hasActiveFilter,
  onUpload,
}: LessonBankEmptyProps) {
  const t = useTranslations("lessonBank");

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--edu-radius-card)] border border-dashed border-border bg-card px-8 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-[var(--edu-radius-card)] bg-muted">
        <BookOpen className="size-8 text-muted-foreground" aria-hidden="true" />
      </span>

      <div className="space-y-1">
        <p className="text-base font-bold text-foreground">
          {hasActiveFilter ? t("empty.noMatch") : t("empty.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {hasActiveFilter ? t("empty.noMatchBody") : t("empty.body")}
        </p>
      </div>

      {canUpload && !hasActiveFilter && onUpload && (
        <Button onClick={onUpload} size="sm">
          <Upload className="mr-1.5 size-4" aria-hidden="true" />
          {t("empty.cta")}
        </Button>
      )}
    </div>
  );
}
