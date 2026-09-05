import { useTranslations } from "next-intl";
import { CourseCard } from "./course-card";
import { CoursesEmpty } from "./courses-empty";
import { CrossSubjectList } from "./cross-subject-list";
import type { StudentCoursesScreenVm } from "./student-courses-screen.i-vm";
import { ViewSwitcher } from "./view-switcher";

/**
 * `/student/courses` — the class's published courses, in one of three views
 * (US-E24.4): the card grid (`?view=all`, default) or the cross-subject
 * "Bài tập" / "Bài kiểm tra" filter.
 *
 * A plain server-rendered screen since US-E24.1: the three progress tabs were
 * filtering on a client-computed completion status the `lms` contract does not
 * provide, so they filtered on nothing real. The view/sub-tab state that
 * replaced them lives entirely in the URL — every switch is a `<Link>`, so
 * back/forward work and there is still no `'use client'` anywhere here.
 *
 * `/student/assignments` and `/student/exams` are permanent redirects into the
 * two cross-subject views (US-E24.4); this is the single home of both lists.
 */
export function StudentCoursesScreen({
  view,
  viewHrefFor,
  courses,
  cross,
  errorKey,
}: StudentCoursesScreenVm) {
  const t = useTranslations("courses");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-extrabold text-2xl text-foreground">{t("title")}</h1>

      <ViewSwitcher view={view} hrefFor={viewHrefFor} />

      {errorKey ? (
        <p role="alert" className="text-edu-error-text text-sm">
          {t(`errors.${errorKey}`)}
        </p>
      ) : cross !== null ? (
        <CrossSubjectList
          view={cross.view}
          sub={cross.sub}
          groups={cross.groups}
          hrefFor={cross.hrefFor}
        />
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
                  LESSON: t("timeline.itemType.lesson"),
                  ASSIGNMENT: t("timeline.itemType.assignment"),
                  DOCUMENT: t("timeline.itemType.document"),
                  EXAM: t("timeline.itemType.exam"),
                },
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
