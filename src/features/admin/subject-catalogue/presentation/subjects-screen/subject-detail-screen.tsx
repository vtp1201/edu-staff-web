"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type {
  Subject,
  SubjectStatus,
} from "../../domain/entities/subject.entity";
import {
  ArchiveSubjectButton,
  ArchiveSubjectDialog,
} from "./archive-subject-dialog";
import { SubjectDetailFields } from "./subject-detail-fields";
import type { SubjectDetailScreenProps } from "./subject-detail-screen.i-vm";
import { useSubjectDetailForm } from "./use-subject-detail-form";

/**
 * Deep-linkable full-page subject master editor (`/admin/subjects/[id]`,
 * US-E12.13, gap NEW-02). Shares the editor body with the quick-edit Sheet via
 * `useSubjectDetailForm` + `SubjectDetailFields`; adds the page-only chrome:
 * breadcrumb, status/archive header, usage rail and the save bar.
 *
 * The role guard lives in `(app)/admin/layout.tsx` — no guard code here.
 */
export function SubjectDetailScreen({
  subject,
  parentName,
  classOfferings,
  backHref,
  onSave,
  onArchive,
}: SubjectDetailScreenProps) {
  const t = useTranslations("subjectCatalogue.subjectDetail");
  const tSubjects = useTranslations("subjectCatalogue.subjects");
  const tPage = useTranslations("subjectCatalogue.subjectDetailPage");

  const form = useSubjectDetailForm(subject, onSave);
  const [status, setStatus] = useState<SubjectStatus>(
    subject?.status ?? "ACTIVE",
  );
  const [archiveTarget, setArchiveTarget] = useState<Subject | null>(null);

  if (!subject) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-20 text-center sm:px-6">
        <h1 className="text-lg font-extrabold text-foreground">
          {tPage("notFoundTitle")}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {tPage("notFoundBody")}
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href={backHref}>{tPage("backToListButton")}</Link>
        </Button>
      </div>
    );
  }

  const handleArchive = async (target: Subject) => {
    const result = await onArchive(target.id);
    if (result.ok) setStatus("ARCHIVED");
    setArchiveTarget(null);
  };

  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <nav
          aria-label={tSubjects("breadcrumbLabel")}
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href={backHref}
            className="rounded-[var(--edu-radius-btn)] font-semibold hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {tPage("breadcrumbCatalogue")}
          </Link>
          <ChevronRight aria-hidden="true" className="size-3" />
          <span className="font-semibold">{parentName}</span>
          <ChevronRight aria-hidden="true" className="size-3" />
          <span aria-current="page" className="font-bold text-foreground">
            {subject.name}
          </span>
        </nav>

        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-foreground">
              {subject.name}
            </h1>
            <StatusBadge tone="primary">
              {tSubjects("gradeLabel", { level: subject.gradeLevel })}
            </StatusBadge>
            <StatusBadge tone={status === "ACTIVE" ? "success" : "muted"}>
              {status === "ACTIVE"
                ? tSubjects("statusActive")
                : tSubjects("statusArchived")}
            </StatusBadge>
          </div>
          {status === "ACTIVE" && (
            <div className="shrink-0">
              <ArchiveSubjectButton
                subject={subject}
                onRequest={setArchiveTarget}
                withLabel
              />
            </div>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-6 rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card">
            <SubjectDetailFields
              form={form}
              classOfferings={classOfferings}
              showClassOfferings={false}
            />
          </div>

          <UsageCard classOfferings={classOfferings} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          <div
            role="status"
            aria-live="polite"
            className="mr-auto text-sm text-edu-success-text"
          >
            {form.saved ? t("savedFeedback") : ""}
          </div>
          <Button asChild variant="outline">
            <Link href={backHref}>{tPage("backToListButton")}</Link>
          </Button>
          <Button onClick={form.handleSave} disabled={form.saving}>
            {t("saveButton")}
          </Button>
        </div>
      </div>

      <ArchiveSubjectDialog
        target={archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        onConfirm={handleArchive}
      />
    </TooltipProvider>
  );
}

/**
 * Page-only right rail: the offerings as a scannable card list (the design
 * reference shows a genuinely different presentation from the Sheet's flat
 * table, so this is not shared).
 */
function UsageCard({ classOfferings }: { classOfferings: ClassSubject[] }) {
  const tPage = useTranslations("subjectCatalogue.subjectDetailPage");
  const title = tPage("usageSectionTitle");

  return (
    <section
      aria-label={title}
      className="flex h-fit flex-col gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {classOfferings.length > 0 && (
          <StatusBadge tone="primary">
            {tPage("usageClassCount", { count: classOfferings.length })}
          </StatusBadge>
        )}
      </div>

      {classOfferings.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-8 text-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-[var(--edu-radius-card)] bg-muted">
            <Users
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          </span>
          <p className="text-sm font-bold text-foreground">
            {tPage("usageEmptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {tPage("usageEmptyBody")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {classOfferings.map((co) => (
            <li
              key={co.id}
              className="rounded-[var(--edu-radius-btn)] border border-border p-3"
            >
              <p className="text-sm font-bold text-foreground">
                {co.className}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · {co.academicYear}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {co.teacherName} ·{" "}
                {tPage("usageStudentCount", { count: co.studentCount })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
