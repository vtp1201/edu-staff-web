"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { CourseCard } from "./course-card";
import { CourseTabs } from "./course-tabs";
import { CoursesEmpty } from "./courses-empty";
import type {
  CourseTab,
  StudentCoursesScreenVm,
} from "./student-courses-screen.i-vm";

const coursesListKey = () => ["lms", "courses", "list"] as const;

/**
 * Client container for `/student/courses`. RSC seeds the full unfiltered course
 * list via `initialData`; the 3 tabs filter it client-side (no refetch).
 */
export function StudentCoursesScreen({
  courses: initialCourses,
  errorKey,
}: StudentCoursesScreenVm) {
  const t = useTranslations("courses");
  const [activeTab, setActiveTab] = useState<CourseTab>("all");

  const { data: courses = initialCourses } = useQuery({
    queryKey: coursesListKey(),
    queryFn: async () => initialCourses,
    initialData: initialCourses,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const filtered = useMemo(() => {
    if (activeTab === "in-progress") {
      return courses.filter((c) => c.status === "in-progress");
    }
    if (activeTab === "completed") {
      return courses.filter((c) => c.status === "completed");
    }
    return courses;
  }, [courses, activeTab]);

  const cardLabels = {
    gradeLabel: t("card.gradeLabel"),
    lessonsLabel: t("card.lessonsLabel"),
    progressLabel: t("card.progressLabel"),
    ctaStart: t("card.ctaStart"),
    ctaContinue: t("card.ctaContinue"),
  };

  const emptyTitle =
    activeTab === "in-progress"
      ? t("empty.inProgressTab")
      : activeTab === "completed"
        ? t("empty.completedTab")
        : t("empty.allTab");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-extrabold text-2xl text-foreground">{t("title")}</h1>

      {errorKey ? (
        <p role="alert" className="text-edu-error-text text-sm">
          {t(`errors.${errorKey}`)}
        </p>
      ) : (
        <>
          <CourseTabs
            courses={courses}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            labels={{
              all: t("tabs.all"),
              inProgress: t("tabs.inProgress"),
              completed: t("tabs.completed"),
            }}
          />

          {filtered.length === 0 ? (
            <CoursesEmpty title={emptyTitle} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  labels={{
                    ...cardLabels,
                    progressAria: t("card.progressAria", {
                      pct: course.progressPct,
                    }),
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
