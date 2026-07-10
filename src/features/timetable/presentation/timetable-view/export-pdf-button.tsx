"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * "Xuất PDF" action shared by the timetable read-only screens
 * (`TimetableView` + `TeacherScheduleScreen`). Export is not wired yet — the
 * click surfaces a "coming soon" toast. The download icon is decorative.
 */
export function ExportPdfButton() {
  const t = useTranslations("timetableView");
  return (
    <Button
      variant="ghost"
      size="sm"
      className="motion-safe:transition-colors"
      onClick={() => toast(t("exportComingSoon"))}
    >
      <Download aria-hidden="true" />
      {t("exportPdf")}
    </Button>
  );
}
