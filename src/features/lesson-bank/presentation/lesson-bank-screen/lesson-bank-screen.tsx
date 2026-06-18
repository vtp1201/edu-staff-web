"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import type {
  LessonEntity,
  LessonListFilter,
} from "../../domain/entities/lesson.entity";
import type { UploadLessonInput } from "../../domain/entities/upload-lesson-input.entity";
import { LessonBankEmpty } from "./lesson-bank-empty";
import { LessonBankFilterBar, type ViewLayout } from "./lesson-bank-filter-bar";
import type { LessonBankScreenVM } from "./lesson-bank-screen.i-vm";
import { LessonBankSkeleton } from "./lesson-bank-skeleton";
import { LessonCard } from "./lesson-card";
import { LessonDetailSheet } from "./lesson-detail-sheet";
import { UploadDrawer } from "./upload-drawer";

function applyClientFilters(
  lessons: LessonEntity[],
  filters: LessonListFilter,
): LessonEntity[] {
  let items = [...lessons];

  if (filters.visibility) {
    items = items.filter((l) => l.visibility === filters.visibility);
  }
  if (filters.subjectId) {
    items = items.filter((l) => l.subjectId === filters.subjectId);
  }
  if (filters.department) {
    items = items.filter((l) => l.department === filters.department);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    items = items.filter((l) => l.title.toLowerCase().includes(q));
  }
  if (filters.sort === "most-viewed") {
    items.sort((a, b) => b.viewCount - a.viewCount);
  } else if (filters.sort === "title-asc") {
    items.sort((a, b) => a.title.localeCompare(b.title, "vi"));
  } else {
    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  return items;
}

function hasActiveFilter(filters: LessonListFilter): boolean {
  return !!(
    filters.search ||
    filters.subjectId ||
    filters.department ||
    filters.visibility
  );
}

export function LessonBankScreen({
  lessons: initialLessons,
  filters: initialFilters,
  subjects,
  departments,
  viewerRole,
  currentUserId,
  uploadAction,
  deleteAction,
}: LessonBankScreenVM) {
  const t = useTranslations("lessonBank");

  const [lessons, setLessons] = useState<LessonEntity[]>(initialLessons);
  const [filters, setFilters] = useState<LessonListFilter>({
    sort: "newest",
    ...initialFilters,
  });
  const [layout, setLayout] = useState<ViewLayout>("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonEntity | null>(
    null,
  );
  const [isUploading, startUpload] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isLoading] = useState(false);

  const canUpload = viewerRole === "teacher";

  const displayed = applyClientFilters(lessons, filters);
  const activeFilter = hasActiveFilter(filters);

  function handleFilterChange(patch: Partial<LessonListFilter>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleUploadSubmit(input: UploadLessonInput) {
    return new Promise<void>((resolve) => {
      startUpload(async () => {
        const result = await uploadAction(input);
        if (result.ok) {
          setLessons((prev) => [result.lesson, ...prev]);
          setUploadOpen(false);
          toast.success(t("toast.uploaded"));
        } else {
          toast.error(t(`errors.${result.errorKey}`));
        }
        resolve();
      });
    });
  }

  function handleDelete(id: string) {
    return new Promise<void>((resolve) => {
      startDelete(async () => {
        const result = await deleteAction(id);
        if (result.ok) {
          setLessons((prev) => prev.filter((l) => l.id !== id));
          setSelectedLesson(null);
          toast.success(t("toast.deleted"));
        } else {
          toast.error(t(`errors.${result.errorKey}`));
        }
        resolve();
      });
    });
  }

  function canEditLesson(lesson: LessonEntity): boolean {
    return viewerRole === "teacher" && lesson.authorId === currentUserId;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {viewerRole === "principal"
              ? t("subtitlePrincipal")
              : t("subtitle")}
          </p>
        </div>

        {canUpload && (
          <Button onClick={() => setUploadOpen(true)} className="shrink-0">
            <Upload className="mr-1.5 size-4" aria-hidden="true" />
            {t("uploadButton")}
          </Button>
        )}
      </header>

      {/* Filter bar */}
      <LessonBankFilterBar
        filters={filters}
        layout={layout}
        subjects={subjects}
        departments={departments}
        onFilterChange={handleFilterChange}
        onLayoutChange={setLayout}
      />

      {/* Content area */}
      {isLoading ? (
        <LessonBankSkeleton layout={layout} />
      ) : displayed.length === 0 ? (
        <LessonBankEmpty
          canUpload={canUpload}
          hasActiveFilter={activeFilter}
          onUpload={() => setUploadOpen(true)}
        />
      ) : layout === "list" ? (
        <div className="space-y-2">
          {displayed.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              variant="list"
              onClick={() => setSelectedLesson(lesson)}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          )}
        >
          {displayed.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              variant="grid"
              onClick={() => setSelectedLesson(lesson)}
            />
          ))}
        </div>
      )}

      {/* Upload drawer */}
      {canUpload && (
        <UploadDrawer
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          subjects={subjects}
          departments={departments}
          onSubmit={handleUploadSubmit}
          isSubmitting={isUploading}
        />
      )}

      {/* Detail sheet */}
      <LessonDetailSheet
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        canEdit={selectedLesson ? canEditLesson(selectedLesson) : false}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
