"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type {
  PatchSubjectInput,
  Subject,
} from "../../domain/entities/subject.entity";
import { SubjectDetailFields } from "./subject-detail-fields";
import type { SubjectActionResult } from "./subjects-screen.i-vm";
import { useSubjectDetailForm } from "./use-subject-detail-form";

export interface SubjectDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentName: string;
  subject: Subject | null;
  classOfferings: ClassSubject[];
  loading: boolean;
  onSave: (id: string, data: PatchSubjectInput) => Promise<SubjectActionResult>;
}

/**
 * Quick-edit slide-over opened from the Subjects table. Thin chrome around the
 * SHARED editor body (`useSubjectDetailForm` + `SubjectDetailFields`), which the
 * full-page route `/admin/subjects/[id]` also consumes (US-E12.13).
 *
 * Archive deliberately stays out of the Sheet (table row + full page own it).
 */
export function SubjectDetailSheet({
  open,
  onOpenChange,
  parentName,
  subject,
  classOfferings,
  loading,
  onSave,
}: SubjectDetailSheetProps) {
  const t = useTranslations("subjectCatalogue.subjectDetail");
  const tSubjects = useTranslations("subjectCatalogue.subjects");

  const form = useSubjectDetailForm(subject, onSave);

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-[520px]"
        >
          <SheetHeader>
            <nav
              aria-label={tSubjects("breadcrumbLabel")}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <span>{parentName}</span>
              <ChevronRight aria-hidden="true" className="size-3" />
              <span>{tSubjects("gradeScopedBreadcrumb")}</span>
            </nav>
            <SheetTitle>{subject?.name ?? ""}</SheetTitle>
          </SheetHeader>

          {loading || !subject ? (
            <div className="space-y-3 px-4 py-6" aria-busy="true">
              <div className="h-5 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          ) : (
            <div className="flex flex-col gap-6 px-4 py-4">
              <SubjectDetailFields
                form={form}
                classOfferings={classOfferings}
                readOnly={false}
              />
            </div>
          )}

          <SheetFooter>
            <div
              role="status"
              aria-live="polite"
              className="mr-auto text-sm text-edu-success-text"
            >
              {form.saved ? t("savedFeedback") : ""}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("closeButton")}
            </Button>
            <Button
              onClick={form.handleSave}
              disabled={form.saving || loading || !subject}
            >
              {t("saveButton")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
