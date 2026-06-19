"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ExamBankSummary } from "../../domain/entities/exam-bank-summary.entity";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { ExamBankEmpty } from "./exam-bank-empty";
import {
  ExamBankFilterBar,
  type ExamBankFilterState,
} from "./exam-bank-filter-bar";
import type { ExamBankScreenVM, ExamCardVM } from "./exam-bank-screen.i-vm";
import { ExamBankSkeleton } from "./exam-bank-skeleton";
import { ExamCard } from "./exam-card";
import { PublishConfirmDialog } from "./publish-confirm-dialog";

function applyFilters(
  exams: ExamBankSummary[],
  filters: ExamBankFilterState,
): ExamBankSummary[] {
  let items = [...exams];
  if (filters.subjectId) {
    items = items.filter((e) => e.subjectId === filters.subjectId);
  }
  if (filters.status) {
    items = items.filter((e) => e.status === filters.status);
  }
  if (filters.teacherId) {
    items = items.filter((e) => e.teacherId === filters.teacherId);
  }
  if (filters.search) {
    const query = filters.search.toLowerCase();
    items = items.filter((e) => e.title.toLowerCase().includes(query));
  }
  return items;
}

function hasActiveFilter(filters: ExamBankFilterState): boolean {
  return !!(
    filters.subjectId ||
    filters.status ||
    filters.teacherId ||
    filters.search
  );
}

function toCardVM(
  exam: ExamBankSummary,
  viewerRole: "teacher" | "admin",
  currentTeacherId: string,
  editPathPrefix: string,
): ExamCardVM {
  const isOwner =
    viewerRole === "teacher" && exam.teacherId === currentTeacherId;
  return {
    id: exam.id,
    title: exam.title,
    subjectName: exam.subjectName,
    totalQuestions: exam.totalQuestions,
    status: exam.status,
    createdAtDisplay: exam.createdAt,
    canEdit: isOwner,
    canDelete: isOwner && exam.status === "draft",
    canPublish: isOwner && exam.status === "draft",
    editPath: `${editPathPrefix}/${exam.id}/edit`,
  };
}

export function ExamBankScreen({
  exams: initialExams,
  subjects,
  teachers,
  viewerRole,
  currentTeacherId,
  createPath,
  editPathPrefix,
  publishAction,
  deleteAction,
  isLoading = false,
}: ExamBankScreenVM & { isLoading?: boolean }) {
  const t = useTranslations("examBank");
  const router = useRouter();

  const [exams, setExams] = useState<ExamBankSummary[]>(initialExams);
  const [filters, setFilters] = useState<ExamBankFilterState>({});
  const [publishTargetId, setPublishTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isPublishing, startPublish] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const canCreate = viewerRole === "teacher";

  const displayed = useMemo(
    () => applyFilters(exams, filters),
    [exams, filters],
  );
  const cards = useMemo(
    () =>
      displayed.map((e) =>
        toCardVM(e, viewerRole, currentTeacherId, editPathPrefix),
      ),
    [displayed, viewerRole, currentTeacherId, editPathPrefix],
  );
  const activeFilter = hasActiveFilter(filters);

  function handleFilterChange(patch: Partial<ExamBankFilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function confirmPublish() {
    const id = publishTargetId;
    if (!id) return;
    startPublish(async () => {
      const result = await publishAction(id);
      if (result.ok) {
        setExams((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: "published" } : e)),
        );
        toast.success(t("toast.published"));
      } else {
        toast.error(t(`errors.${result.errorKey}`));
      }
      setPublishTargetId(null);
    });
  }

  function confirmDelete() {
    const id = deleteTargetId;
    if (!id) return;
    startDelete(async () => {
      const result = await deleteAction(id);
      if (result.ok) {
        setExams((prev) => prev.filter((e) => e.id !== id));
        toast.success(t("toast.deleted"));
      } else {
        toast.error(t(`errors.${result.errorKey}`));
      }
      setDeleteTargetId(null);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-2xl text-foreground">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {viewerRole === "admin" ? t("subtitleAdmin") : t("subtitle")}
          </p>
        </div>

        {canCreate && (
          <Button asChild className="shrink-0">
            <Link href={createPath}>
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              {t("createButton")}
            </Link>
          </Button>
        )}
      </header>

      <ExamBankFilterBar
        filters={filters}
        subjects={subjects}
        teachers={teachers}
        showTeacherFilter={viewerRole === "admin"}
        onFilterChange={handleFilterChange}
      />

      {isLoading ? (
        <ExamBankSkeleton />
      ) : cards.length === 0 ? (
        <ExamBankEmpty
          canCreate={canCreate}
          hasActiveFilter={activeFilter}
          onCreate={() => router.push(createPath)}
        />
      ) : (
        <>
          <h2 className="sr-only">
            {t("resultsHeading", { count: cards.length })}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <ExamCard
                key={card.id}
                exam={card}
                onPublish={setPublishTargetId}
                onDelete={setDeleteTargetId}
              />
            ))}
          </div>
        </>
      )}

      <PublishConfirmDialog
        open={publishTargetId !== null}
        isPublishing={isPublishing}
        onConfirm={confirmPublish}
        onCancel={() => setPublishTargetId(null)}
      />
      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
