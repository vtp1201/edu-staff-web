import { useTranslations } from "next-intl";
import { CourseCard } from "./course-card";
import { CoursesEmpty } from "./courses-empty";
import type { StudentCoursesScreenVm } from "./student-courses-screen.i-vm";

/**
 * `/student/courses` — the class's published courses.
 *
 * A plain server-rendered grid since US-E24.1: the three progress tabs
 * ("Tất cả / Đang học / Hoàn thành") were filtering on a client-computed
 * completion status that the `lms` contract does not provide, so they filtered
 * on nothing real and are gone. Progress-aware browsing returns with BE US-254
 * (ADR 0076). No client state remains → no `'use client'`.
 *
 * US-E24.2: each card now carries a derived timeline summary ("sắp đến hạn" +
 * "N mục đang mở"). Everything it needs — including whether a deadline is
 * urgent — arrives resolved in the VM, so this stays a pure render.
 */
export function StudentCoursesScreen({
  courses,
  errorKey,
}: StudentCoursesScreenVm) {
  const t = useTranslations("courses");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-extrabold text-2xl text-foreground">{t("title")}</h1>

      {errorKey ? (
        <p role="alert" className="text-edu-error-text text-sm">
          {t(`errors.${errorKey}`)}
        </p>
      ) : courses.length === 0 ? (
        <CoursesEmpty title={t("empty.allTab")} />
      ) : (
        /* `min(300px,100%)` rather than a bare 300px: an auto-fill track fixed
           at 300px overflows a 320px viewport once page padding is subtracted. */
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-[18px]">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              labels={{
                statusDraft: t("card.statusDraft"),
                cta: t("card.ctaOpen"),
                dueNext: t("card.dueNext"),
                dueSoonBadge: t("card.dueSoonBadge"),
                dueLine: (type, date) => t("card.dueLine", { type, date }),
                nothingDue: t("card.nothingDue"),
                openCount: (count) => t("card.openCount", { count }),
                summaryError: t("card.summaryError"),
                itemType: {
                  LESSON: t("player.itemType.lesson"),
                  ASSIGNMENT: t("player.itemType.assignment"),
                  DOCUMENT: t("player.itemType.document"),
                  EXAM: t("player.itemType.exam"),
                },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
