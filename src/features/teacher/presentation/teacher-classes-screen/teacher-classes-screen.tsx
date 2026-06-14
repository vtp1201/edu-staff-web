"use client";

import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { ClassCard } from "./components/class-card";
import type { TeacherClassesScreenVM } from "./teacher-classes-screen.i-vm";

interface TeacherClassesScreenProps {
  vm: TeacherClassesScreenVM;
  /** Storybook-only: render the skeleton grid (RSC resolves before render). */
  loading?: boolean;
}

export function TeacherClassesScreen({
  vm,
  loading = false,
}: TeacherClassesScreenProps) {
  const t = useTranslations("teacherClasses");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-edu-text-primary">
        {t("pageTitle")}
      </h1>

      {loading ? (
        <ClassGridSkeleton />
      ) : vm.status === "error" ? (
        <ErrorState message={t("errorRetry")} />
      ) : vm.classes.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {vm.classes.map((cls) => (
            <ClassCard key={cls.id} vm={cls} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassGridSkeleton() {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
      aria-hidden="true"
    >
      {Array.from({ length: 4 }, (_, i) => i).map((i) => (
        <div
          key={i}
          className="h-[196px] animate-pulse rounded-[var(--edu-radius-card)] border border-border bg-muted/50"
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--edu-radius-card)] border border-border border-dashed bg-card px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted">
        <BookOpen className="size-6 text-edu-text-muted" aria-hidden="true" />
      </span>
      <p className="text-sm text-edu-text-secondary">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-[var(--edu-radius-card)] border border-edu-error/30 bg-edu-error/15 px-6 py-10 text-center text-sm text-edu-error-text"
    >
      {message}
    </div>
  );
}
