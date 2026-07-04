"use client";

import { BookOpen, Search, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";

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
    <EmptyState
      icon={hasActiveFilter ? Search : BookOpen}
      title={hasActiveFilter ? t("empty.noMatch") : t("empty.title")}
      body={hasActiveFilter ? t("empty.noMatchBody") : t("empty.body")}
      cta={
        canUpload && !hasActiveFilter && onUpload
          ? { label: t("empty.cta"), icon: Upload, onClick: onUpload }
          : undefined
      }
    />
  );
}
