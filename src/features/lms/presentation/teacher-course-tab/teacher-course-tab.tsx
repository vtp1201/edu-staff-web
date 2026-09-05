"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/shared/destructive-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import type { LmsFailure } from "@/features/lms/domain/failures/lms.failure";
import { summarizeCourse } from "@/features/lms/domain/use-cases/summarize-course";
import { CourseTimeline } from "../course-timeline/course-timeline";
import { toWeekVms } from "../course-timeline/course-timeline.derive";
import type {
  AddItemKind,
  CourseTimelineActions,
  CourseTimelineVm,
} from "../course-timeline/course-timeline.i-vm";
import { CreateItemDialog } from "./create-item-dialog";
import { lmsKeys } from "./lms.query-keys";
import { SubjectPicker } from "./subject-picker";
import type {
  TeacherCourseTabActions,
  TeacherCourseTabVm,
} from "./teacher-course-tab.i-vm";

export interface TeacherCourseTabProps {
  vm: TeacherCourseTabVm;
  actions: TeacherCourseTabActions;
}

/** `datetime-local` value for a week's Monday, so a new item lands in the week
 *  whose pill was used. Blank for the "Luôn mở" group, which has no date. */
function weekStartToLocalInput(weekStart: string | null): string {
  return weekStart ? `${weekStart}T07:00` : "";
}

/**
 * Class-hub "Khoá học online" tab (US-E24.10).
 *
 * The ONE component in this tree that touches the server cache: everything
 * below it is presentational and reports intent through callbacks. That is
 * deliberate — reorder is optimistic, so exactly one place may write the cache.
 *
 * Reorder is the only optimistic mutation. The other six wait for their
 * response: `patchItem`'s new `state` is BE-computed from the window, and a
 * create/delete/publish that "already happened" in the UI and then failed is a
 * worse lie than a half-second spinner.
 */
export function TeacherCourseTab({ vm, actions }: TeacherCourseTabProps) {
  const t = useTranslations("courses");
  const tt = useTranslations("courses.teacher");
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = vm.courseId;

  const [status, setStatus] = useState(vm.courseStatus);
  const [dialogKind, setDialogKind] = useState<AddItemKind | null>(null);
  const [dialogWeekStart, setDialogWeekStart] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const itemsKey = lmsKeys.courseItems(courseId ?? "none");
  const { data: items = [] } = useQuery({
    queryKey: itemsKey,
    queryFn: async () => {
      const res = await actions.listItems();
      if (!res.ok) throw { type: res.errorKey } satisfies LmsFailure;
      return res.data;
    },
    // Seeded from the RSC read — no client re-fetch on mount, no
    // HydrationBoundary (this repo's one RSC→cache bridge is a plain prop).
    initialData: vm.items,
    enabled: courseId !== null,
  });

  function failureKeyOf(err: unknown): LmsFailure["type"] {
    return err && typeof err === "object" && "type" in err
      ? ((err as LmsFailure).type ?? "unknown")
      : "unknown";
  }

  function toastFailure(err: unknown) {
    toast.error(t(`errors.${failureKeyOf(err)}`));
  }

  /** The ONE optimistic mutation. */
  const reorderMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      const res = await actions.reorderItems(itemIds);
      if (!res.ok) throw { type: res.errorKey } satisfies LmsFailure;
      return res.data;
    },
    onMutate: async (itemIds) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const previous = queryClient.getQueryData<CourseItem[]>(itemsKey);
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]));
        queryClient.setQueryData<CourseItem[]>(
          itemsKey,
          // Re-projects the SAME item objects into the new order, so a
          // concurrently patched field is never reverted by a drag.
          itemIds
            .map((id) => byId.get(id))
            .filter((item): item is CourseItem => item !== undefined),
        );
      }
      return { previous };
    },
    onError: (err, _itemIds, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(itemsKey, ctx.previous);
      if (failureKeyOf(err) === "not-found") {
        // The id set drifted (someone else added or removed an item), so the
        // snapshot we just restored is ALSO wrong — only a real re-read fixes it.
        void queryClient.invalidateQueries({ queryKey: itemsKey });
      }
      toastFailure(err);
    },
    onSuccess: (serverItems) => {
      // Cheap no-op when it matches the optimistic guess; authoritative when
      // BE resolved a concurrent write differently.
      queryClient.setQueryData(itemsKey, serverItems);
    },
  });

  const patchMutation = useMutation({
    mutationFn: async (vars: {
      itemId: string;
      patch: { startAt: string | null; dueAt: string | null };
    }) => {
      const res = await actions.patchItem(vars.itemId, vars.patch);
      if (!res.ok) throw { type: res.errorKey } satisfies LmsFailure;
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CourseItem[]>(itemsKey, (old = []) =>
        old.map((item) => (item.id === updated.id ? updated : item)),
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: async (vars: {
      kind: AddItemKind;
      values: {
        title: string;
        content: string;
        instructions: string;
        url: string;
        startAt: string | null;
        dueAt: string | null;
      };
    }) => {
      const { kind, values } = vars;
      const res =
        kind === "lesson"
          ? await actions.createLesson({
              title: values.title,
              content: values.content,
              startAt: values.startAt ?? undefined,
              dueAt: values.dueAt ?? undefined,
            })
          : kind === "assignment"
            ? await actions.createAssignment({
                title: values.title,
                instructions: values.instructions || undefined,
                startAt: values.startAt,
                dueAt: values.dueAt,
              })
            : await actions.addDocumentItem({
                title: values.title,
                url: values.url,
                startAt: values.startAt ?? undefined,
                dueAt: values.dueAt ?? undefined,
              });
      if (!res.ok) throw { type: res.errorKey } satisfies LmsFailure;
      return res.data;
    },
    onSuccess: (freshItems) => {
      queryClient.setQueryData(itemsKey, freshItems);
      setDialogKind(null);
      setDialogError(null);
    },
    onError: (err) => {
      // The error is a direct consequence of the submit in an OPEN dialog, so
      // it stays there rather than becoming a toast behind it.
      setDialogError(t(`errors.${failureKeyOf(err)}`));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await actions.publishCourse();
      if (!res.ok) throw { type: res.errorKey } satisfies LmsFailure;
      return res.data;
    },
    onSuccess: (published) => setStatus(published),
    onError: (err) => {
      if (failureKeyOf(err) === "already-published") {
        // Someone (or a double click) already published it — the banner is the
        // stale thing here, not the request.
        setStatus("PUBLISHED");
      }
      toastFailure(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await actions.deleteItem(itemId);
      if (!res.ok) throw { type: res.errorKey } satisfies LmsFailure;
      return itemId;
    },
    onSuccess: (itemId) => {
      queryClient.setQueryData<CourseItem[]>(itemsKey, (old = []) =>
        old.filter((item) => item.id !== itemId),
      );
      setPendingDeleteId(null);
    },
    onError: (err) => {
      setPendingDeleteId(null);
      toastFailure(err);
    },
  });

  const isTeacher = vm.mode === "teacher";
  const pendingDeleteTitle =
    items.find((item) => item.id === pendingDeleteId)?.title ?? "";

  const timelineVm: CourseTimelineVm | null =
    courseId === null
      ? null
      : {
          courseId,
          courseName: vm.courseName,
          tone: vm.tone,
          openCount: summarizeCourse(items, new Date()).openCount,
          weeks: toWeekVms(items),
          errorKey: vm.errorKey,
          mode: vm.mode,
          teacher: {
            orderedItemIds: items.map((item) => item.id),
            deletableItemIds: items
              .filter((item) => item.itemType === "DOCUMENT")
              .map((item) => item.id),
            examBankHref: vm.examBankHref,
          },
        };

  const timelineActions: CourseTimelineActions = {
    retryListItems: async () => {
      await queryClient.refetchQueries({ queryKey: itemsKey });
      const state = queryClient.getQueryState<CourseItem[]>(itemsKey);
      if (state?.error) {
        return { ok: false, errorKey: failureKeyOf(state.error) };
      }
      const fresh = queryClient.getQueryData<CourseItem[]>(itemsKey) ?? [];
      return {
        ok: true,
        data: {
          weeks: toWeekVms(fresh),
          openCount: summarizeCourse(fresh, new Date()).openCount,
        },
      };
    },
    ...(isTeacher
      ? {
          reorderItems: async (orderedIds: string[]) => {
            try {
              await reorderMutation.mutateAsync(orderedIds);
              return { ok: true as const };
            } catch (err) {
              return { ok: false as const, errorKey: failureKeyOf(err) };
            }
          },
          patchItemWindow: async (itemId: string, input) => {
            try {
              await patchMutation.mutateAsync({ itemId, patch: input });
              return { ok: true as const };
            } catch (err) {
              return { ok: false as const, errorKey: failureKeyOf(err) };
            }
          },
          // Destructive: the confirm dialog is the mutation's trigger, so this
          // only records WHICH row was asked about. Nothing is removed, and
          // nothing is optimistic, before the teacher confirms.
          requestDeleteItem: (itemId: string) => setPendingDeleteId(itemId),
          requestAddItem: (kind: AddItemKind, weekStart: string | null) => {
            setDialogKind(kind);
            setDialogWeekStart(weekStart);
            setDialogError(null);
          },
        }
      : {}),
  };

  return (
    <div className="flex flex-col gap-4">
      {vm.subjectOptions.length > 1 && vm.selectedSubjectId && (
        <SubjectPicker
          options={vm.subjectOptions}
          selectedId={vm.selectedSubjectId}
          onSelect={(subjectId) =>
            router.push(
              `${vm.courseTabHrefBase}&subjectId=${encodeURIComponent(subjectId)}`,
            )
          }
        />
      )}

      {isTeacher && status === "DRAFT" && (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--edu-radius-card)] border border-edu-warning/40 bg-edu-warning-light px-4 py-3">
          <p className="min-w-0 flex-1 font-semibold text-[13px] text-foreground">
            {tt("draftBanner.title")}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            aria-busy={publishMutation.isPending}
          >
            {tt("draftBanner.publish")}
          </Button>
        </div>
      )}

      {timelineVm === null ? (
        <div className="overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          <EmptyState
            icon={BookOpen}
            title={tt(
              vm.emptyReason === "forbidden"
                ? "forbiddenSubject"
                : vm.emptyReason === "no-subjects"
                  ? "noSubjects"
                  : "noCourse",
            )}
            body={tt("readonlyPill")}
            className="py-16"
          />
        </div>
      ) : (
        <CourseTimeline
          vm={timelineVm}
          actions={timelineActions}
          // Staff rows are not links, but the prop is part of the shared
          // contract; the course's own path is the honest value.
          itemHrefBase={`${vm.courseTabHrefBase}&item=`}
        />
      )}

      {dialogKind && (
        <CreateItemDialog
          // Re-keyed per open so the seeded "Mở lúc" always matches the week
          // whose pill was used.
          key={`${dialogKind}-${dialogWeekStart ?? "always"}`}
          kind={dialogKind}
          suggestedStartAt={weekStartToLocalInput(dialogWeekStart)}
          isSubmitting={createMutation.isPending}
          submitError={dialogError}
          onSubmit={(kind, values) => createMutation.mutate({ kind, values })}
          onCancel={() => {
            setDialogKind(null);
            setDialogError(null);
          }}
        />
      )}

      <DestructiveConfirmDialog
        open={pendingDeleteId !== null}
        title={tt("delete.confirmTitle")}
        body={tt("delete.confirmBody", { title: pendingDeleteTitle })}
        confirmLabel={tt("delete.confirmLabel")}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (pendingDeleteId) deleteMutation.mutate(pendingDeleteId);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
