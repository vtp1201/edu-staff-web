"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface NewReportButtonProps {
  onClick: () => void;
  isPending: boolean;
}

/**
 * "Tạo báo cáo" ghost button in the table HEADER (D-4 — never the toolbar).
 * Always rendered regardless of table body status, so it is never a dead
 * tab-stop hidden behind loading/error.
 */
export function NewReportButton({ onClick, isPending }: NewReportButtonProps) {
  const t = useTranslations("reports.table");
  return (
    <Button
      variant="ghost"
      size="sm"
      className="border border-border"
      onClick={onClick}
      disabled={isPending}
      aria-busy={isPending}
    >
      <Plus className="size-4" aria-hidden="true" />
      {t("newReport")}
    </Button>
  );
}
