"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ChapterEntity } from "@/features/lms/domain/entities/chapter.entity";
import { calculateCourseProgress } from "@/features/lms/domain/use-cases/calculate-course-progress";
import type { CourseCardVm } from "../student-courses/student-courses-screen.i-vm";
import { ChapterList } from "./chapter-list";
import { LessonBody } from "./lesson-body";
import {
  courseProgressOf,
  findNextLessonId,
  patchLessonDone,
  projectChapters,
  toActiveLessonVm,
} from "./lesson-player.derive";
import type { LessonPlayerActions, LessonPlayerVm } from "./lesson-player.i-vm";
import { LessonTabs } from "./lesson-tabs";
import { MarkCompleteButton } from "./mark-complete-button";
import { NotesPanel } from "./notes-panel";
import { PlayerBreadcrumb } from "./player-breadcrumb";
import { ProgressCard } from "./progress-card";
import { QnaPanel } from "./qna-panel";

const lmsKeys = {
  courseLessons: (courseId: string) =>
    ["lms", "course", courseId, "lessons"] as const,
  coursesList: () => ["lms", "courses", "list"] as const,
  note: (lessonId: string) => ["lms", "lesson", lessonId, "note"] as const,
  questions: (lessonId: string) =>
    ["lms", "lesson", lessonId, "questions"] as const,
};

/** Typed error thrown by mutation fns so `onError` carries a stable failure key. */
class LmsActionError extends Error {}
function errorKeyOf(error: unknown): "not-found" | "forbidden" | "unknown" {
  const msg = error instanceof LmsActionError ? error.message : "";
  return msg === "not-found" || msg === "forbidden" ? msg : "unknown";
}

export interface LessonPlayerProps {
  vm: LessonPlayerVm;
  actions: LessonPlayerActions;
}

export function LessonPlayer({ vm, actions }: LessonPlayerProps) {
  const t = useTranslations("courses");
  const queryClient = useQueryClient();
  const { courseId } = vm;

  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    vm.initialActiveLessonId,
  );
  const [activeTab, setActiveTab] = useState<"notes" | "qna">("notes");
  const [notesSavedFor, setNotesSavedFor] = useState<string | null>(null);

  const { data: chapters = vm.chapters } = useQuery({
    queryKey: lmsKeys.courseLessons(courseId),
    queryFn: async () => vm.chapters,
    initialData: vm.chapters,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const activeLesson = toActiveLessonVm(chapters, activeLessonId);
  const projected = projectChapters(chapters);
  const progress = courseProgressOf(chapters);
  const nextLessonId = findNextLessonId(chapters, activeLessonId);

  // ── mark complete (optimistic, cross-query) ─────────────────────────────
  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await actions.markLessonComplete(lessonId);
      if (!res.ok || !res.data)
        throw new LmsActionError(res.errorKey ?? "unknown");
      return res.data;
    },
    onMutate: async (lessonId: string) => {
      await queryClient.cancelQueries({
        queryKey: lmsKeys.courseLessons(courseId),
      });
      await queryClient.cancelQueries({ queryKey: lmsKeys.coursesList() });
      const previousLessons = queryClient.getQueryData<ChapterEntity[]>(
        lmsKeys.courseLessons(courseId),
      );
      const previousCourses = queryClient.getQueryData<CourseCardVm[]>(
        lmsKeys.coursesList(),
      );

      const patched = patchLessonDone(
        previousLessons ?? chapters,
        lessonId,
        true,
      );
      queryClient.setQueryData(lmsKeys.courseLessons(courseId), patched);

      const p = courseProgressOf(patched);
      queryClient.setQueryData<CourseCardVm[]>(lmsKeys.coursesList(), (old) =>
        old?.map((c) =>
          c.id === courseId
            ? {
                ...c,
                lessonsDone: p.done,
                lessonsTotal: p.total,
                progressPct: p.pct,
                status: p.status,
              }
            : c,
        ),
      );
      return { previousLessons, previousCourses };
    },
    onError: (_err, _lessonId, context) => {
      if (context?.previousLessons) {
        queryClient.setQueryData(
          lmsKeys.courseLessons(courseId),
          context.previousLessons,
        );
      }
      if (context?.previousCourses) {
        queryClient.setQueryData(
          lmsKeys.coursesList(),
          context.previousCourses,
        );
      }
    },
    onSuccess: (data) => {
      // Re-patch with the server-confirmed values (idempotent).
      const current = queryClient.getQueryData<ChapterEntity[]>(
        lmsKeys.courseLessons(courseId),
      );
      const patched = patchLessonDone(
        current ?? chapters,
        data.lesson.id,
        data.lesson.done,
      );
      queryClient.setQueryData(lmsKeys.courseLessons(courseId), patched);
      queryClient.setQueryData<CourseCardVm[]>(lmsKeys.coursesList(), (old) =>
        old?.map((c) =>
          c.id === courseId
            ? {
                ...c,
                lessonsDone: data.courseProgress.done,
                lessonsTotal: data.courseProgress.total,
                progressPct: data.courseProgress.pct,
                status: calculateCourseProgress(
                  data.courseProgress.done,
                  data.courseProgress.total,
                ).status,
              }
            : c,
        ),
      );
    },
  });

  // ── notes ────────────────────────────────────────────────────────────────
  const noteQuery = useQuery({
    queryKey: activeLessonId
      ? lmsKeys.note(activeLessonId)
      : ["lms", "lesson", "none", "note"],
    queryFn: async () => {
      if (!activeLessonId) return null;
      const res = await actions.getNote(activeLessonId);
      return res.ok ? (res.data ?? null) : null;
    },
    enabled: Boolean(activeLessonId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const saveNote = useMutation({
    mutationFn: async (vars: { lessonId: string; content: string }) => {
      const res = await actions.saveNote(vars.lessonId, vars.content);
      if (!res.ok || !res.data)
        throw new LmsActionError(res.errorKey ?? "unknown");
      return res.data;
    },
    onSuccess: (savedNote) => {
      queryClient.setQueryData(lmsKeys.note(savedNote.lessonId), savedNote);
      setNotesSavedFor(savedNote.lessonId);
    },
  });

  // ── q&a ────────────────────────────────────────────────────────────────
  const questionsQuery = useQuery({
    queryKey: activeLessonId
      ? lmsKeys.questions(activeLessonId)
      : ["lms", "lesson", "none", "questions"],
    queryFn: async () => {
      if (!activeLessonId) return [];
      const res = await actions.listQuestions(activeLessonId);
      return res.ok ? (res.data ?? []) : [];
    },
    enabled: Boolean(activeLessonId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const askQuestion = useMutation({
    mutationFn: async (vars: { lessonId: string; question: string }) => {
      const res = await actions.askQuestion(vars.lessonId, vars.question);
      if (!res.ok || !res.data)
        throw new LmsActionError(res.errorKey ?? "unknown");
      return res.data;
    },
    onMutate: async (vars) => {
      const key = lmsKeys.questions(vars.lessonId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous =
        queryClient.getQueryData<
          Array<{ id: string; question: string; answer: string | null }>
        >(key) ?? [];
      const optimisticId = `optimistic-${Date.now()}`;
      queryClient.setQueryData(key, [
        { id: optimisticId, question: vars.question, answer: null },
        ...previous,
      ]);
      return { previous, optimisticId };
    },
    onSuccess: (serverQuestion, vars, context) => {
      queryClient.setQueryData(
        lmsKeys.questions(vars.lessonId),
        (
          old: Array<{
            id: string;
            question: string;
            answer: string | null;
          }> = [],
        ) =>
          old.map((q) =>
            q.id === context?.optimisticId
              ? {
                  id: serverQuestion.id,
                  question: serverQuestion.question,
                  answer: serverQuestion.answer,
                }
              : q,
          ),
      );
    },
    onError: (_err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          lmsKeys.questions(vars.lessonId),
          context.previous,
        );
      }
    },
  });

  const lessonName = activeLesson
    ? activeLesson.title
    : t("player.breadcrumb.pickLesson");

  return (
    <div className="flex flex-col gap-4">
      <PlayerBreadcrumb
        courseName={vm.courseName}
        coursesHref={vm.coursesListHref}
        lessonName={lessonName}
        coursesLabel={t("player.breadcrumb.coursesLink")}
        navLabel={t("player.breadcrumb.navLabel")}
      />

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* LEFT — content + tabs */}
        <div className="flex flex-col overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          {/* Announce lesson switches to SR/keyboard users (no focus steal). */}
          <span className="sr-only" aria-live="polite">
            {activeLesson
              ? t("a11y.lessonChanged", { title: activeLesson.title })
              : ""}
          </span>
          <div className="px-5 pt-3.5 pb-3">
            {activeLesson?.chapterTitle && (
              <div className="font-bold text-[10.5px] text-edu-text-secondary uppercase tracking-wider">
                {activeLesson.chapterTitle}
              </div>
            )}
            <h1 className="mt-0.5 font-extrabold text-[17px] text-foreground">
              {lessonName}
            </h1>
          </div>

          <LessonBody
            lesson={activeLesson}
            tone={vm.tone}
            labels={{
              emptyTitle: t("player.content.empty.title"),
              emptyBody: t("player.content.empty.body"),
              video: {
                lectureLabel: t("player.content.video.lectureLabel"),
                playAriaLabel: t("player.content.video.playAriaLabel"),
                pauseAriaLabel: t("player.content.video.pauseAriaLabel"),
                seekAriaLabel: t("player.content.video.seekAriaLabel"),
                playingAnnounce: t("player.content.video.playingAnnounce"),
                pausedAnnounce: t("player.content.video.pausedAnnounce"),
              },
              pdf: {
                title: t("player.content.pdf.title"),
                downloadButton: t("player.content.pdf.downloadButton"),
                downloadAriaLabel: t("player.content.pdf.downloadAriaLabel"),
              },
            }}
          />

          {activeLesson && (
            <div className="border-border border-t px-5 py-3.5">
              <MarkCompleteButton
                lessonId={activeLesson.id}
                done={activeLesson.done}
                isPending={markComplete.isPending}
                onMarkComplete={(id) => markComplete.mutate(id)}
                labels={{
                  button: t("player.markComplete.button"),
                  doneLabel: t("player.markComplete.doneLabel"),
                }}
              />
              {markComplete.isError && (
                <p role="alert" className="mt-2 text-edu-error-text text-xs">
                  {t(`errors.${errorKeyOf(markComplete.error)}`)}
                </p>
              )}
            </div>
          )}

          {activeLessonId && (
            <div className="border-border border-t px-5 pb-5">
              <LessonTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                labels={{
                  notes: t("player.tabs.notes"),
                  qna: t("player.tabs.qna"),
                }}
                notesContent={
                  <NotesPanel
                    key={`note-${activeLessonId}`}
                    lessonId={activeLessonId}
                    initialValue={noteQuery.data?.content ?? ""}
                    isSaving={saveNote.isPending}
                    saved={notesSavedFor === activeLessonId}
                    errorKey={
                      saveNote.isError ? errorKeyOf(saveNote.error) : null
                    }
                    onSave={(id, content) =>
                      saveNote.mutate({ lessonId: id, content })
                    }
                    labels={{
                      placeholder: t("player.notes.placeholder"),
                      saveButton: t("player.notes.saveButton"),
                      saving: t("player.notes.saving"),
                      savedToast: t("player.notes.savedToast"),
                      error: t("player.notes.loadError"),
                    }}
                  />
                }
                qnaContent={
                  <QnaPanel
                    lessonId={activeLessonId}
                    questions={(questionsQuery.data ?? []).map((q) => ({
                      id: q.id,
                      question: q.question,
                      answer: q.answer,
                    }))}
                    isSubmitting={askQuestion.isPending}
                    errorKey={
                      askQuestion.isError ? errorKeyOf(askQuestion.error) : null
                    }
                    onAsk={(id, question) =>
                      askQuestion.mutate({ lessonId: id, question })
                    }
                    labels={{
                      emptyState: t("player.qna.emptyState"),
                      inputPlaceholder: t("player.qna.inputPlaceholder"),
                      submitButton: t("player.qna.submitButton"),
                      submitting: t("player.qna.submitting"),
                      unanswered: t("player.qna.unanswered"),
                      error: t("player.qna.loadError"),
                    }}
                  />
                }
              />
            </div>
          )}
        </div>

        {/* RIGHT — progress + chapter list */}
        <aside className="flex flex-col gap-3.5">
          <ProgressCard
            pct={progress.pct}
            tone={vm.tone}
            isComplete={progress.status === "completed"}
            label={t("player.progress.label")}
            countLabel={t("player.progress.count", {
              done: progress.done,
              total: progress.total,
              pct: progress.pct,
            })}
          />
          <ChapterList
            chapters={projected}
            activeLessonId={activeLessonId}
            tone={vm.tone}
            onSelectLesson={setActiveLessonId}
            onNext={
              nextLessonId ? () => setActiveLessonId(nextLessonId) : undefined
            }
            labels={{
              navAriaLabel: t("player.chapterList.navAriaLabel"),
              toggleMobile: t("player.chapterList.toggleMobile"),
              emptyChapter: t("player.chapterList.emptyChapter"),
              emptyCourse: t("player.chapterList.emptyCourse"),
              nextButton: t("player.chapterList.nextButton"),
              doneStateLabel: t("a11y.doneLessonState"),
              activeStateLabel: t("a11y.activeLessonState"),
              lessonType: {
                video: t("player.lessonType.video"),
                pdf: t("player.lessonType.pdf"),
                text: t("player.lessonType.text"),
              },
            }}
          />
        </aside>
      </div>
    </div>
  );
}
