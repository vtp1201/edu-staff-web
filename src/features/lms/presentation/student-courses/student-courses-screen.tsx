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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              labels={{
                statusPublished: t("card.statusPublished"),
                statusDraft: t("card.statusDraft"),
                cta: t("card.ctaOpen"),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
