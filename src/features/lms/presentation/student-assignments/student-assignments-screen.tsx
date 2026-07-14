"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import type {
  AssignmentEntity,
  SubmitAssignmentInput,
} from "@/features/lms/domain/entities/assignment.entity";
import type { AssignmentFailure } from "@/features/lms/domain/failures/assignment.failure";
import { AssignmentCard } from "./assignment-card";
import { AssignmentTabs } from "./assignment-tabs";
import { AssignmentsError } from "./assignments-error";
import { AssignmentsSkeleton } from "./assignments-skeleton";
import { GradedSheet } from "./graded-sheet";
import type {
  AssignmentTab,
  ListAssignmentsResult,
  StudentAssignmentsActions,
  StudentAssignmentsScreenProps,
} from "./student-assignments-screen.i-vm";
import { SubmitSheet } from "./submit-sheet";

const assignmentsKeys = {
  all: () => ["lms", "assignments"] as const,
  lists: () => ["lms", "assignments", "list"] as const,
  list: (tab: AssignmentTab) => ["lms", "assignments", "list", tab] as const,
};

/** Carries a stable failure key from a failed Server Action through the query /
 *  mutation error channel so presentation can translate it. */
export class AssignmentActionError extends Error {
  constructor(readonly errorKey: AssignmentFailure["type"]) {
    super(errorKey);
    this.name = "AssignmentActionError";
  }
}

type SheetState = {
  assignment: AssignmentEntity;
  mode: "edit" | "readonly" | "graded";
} | null;

/** Loading/empty/error/success region for one tab. Keyed by tab in the parent
 *  so each tab switch cold-mounts a fresh query (§13.1: gcTime/staleTime 0 for
 *  non-default tabs; the RSC-seeded "all" tab holds initialData for 30s). */
function AssignmentsListRegion({
  tab,
  initialData,
  listAction,
  emptyTitle,
  onOpenCard,
}: {
  tab: AssignmentTab;
  initialData: AssignmentEntity[] | undefined;
  listAction: StudentAssignmentsActions["listAssignmentsAction"];
  emptyTitle: string;
  onOpenCard: (assignment: AssignmentEntity) => void;
}) {
  const t = useTranslations("assignments");
  const seeded = tab === "all" && initialData !== undefined;
  const query = useQuery({
    queryKey: assignmentsKeys.list(tab),
    queryFn: async (): Promise<AssignmentEntity[]> => {
      const res: ListAssignmentsResult = await listAction(tab);
      if (!res.ok) throw new AssignmentActionError(res.errorKey);
      return res.data;
    },
    initialData: seeded ? initialData : undefined,
    staleTime: seeded ? 30_000 : 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (query.isPending) {
    return (
      <>
        <span className="sr-only" role="status">
          {t("skeleton.loading")}
        </span>
        <AssignmentsSkeleton />
      </>
    );
  }
  if (query.isError) {
    return (
      <AssignmentsError
        isRetrying={query.isFetching}
        onRetry={() => {
          if (!query.isFetching) query.refetch();
        }}
      />
    );
  }

  const list = query.data ?? [];
  if (list.length === 0) {
    return (
      <div className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        <EmptyState icon={ClipboardList} title={emptyTitle} />
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {list.map((a) => (
        <li key={a.id}>
          <AssignmentCard assignment={a} onOpen={onOpenCard} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Client container for `/student/assignments`. The RSC seeds the default "all"
 * tab; every tab owns its own cold-mounting query (§13.1). The submit mutation
 * is non-optimistic (visible "Đang nộp bài…" sub-state) and patches the active
 * tab's cache on success (§13.4).
 */
export function StudentAssignmentsScreen({
  assignments: initialAssignments,
  pendingCount: initialPendingCount,
  errorKey,
  actions,
}: StudentAssignmentsScreenProps) {
  const t = useTranslations("assignments");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AssignmentTab>("all");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  const submitMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      input,
    }: {
      assignmentId: string;
      input: SubmitAssignmentInput;
    }): Promise<AssignmentEntity> => {
      const res = await actions.submitAssignmentAction(assignmentId, input);
      if (!res.ok) throw new AssignmentActionError(res.errorKey);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<AssignmentEntity[]>(
        assignmentsKeys.list(activeTab),
        (old = []) =>
          activeTab === "all"
            ? old.map((a) => (a.id === updated.id ? updated : a))
            : old.filter((a) => a.id !== updated.id),
      );
      queryClient.invalidateQueries({
        queryKey: assignmentsKeys.lists(),
        refetchType: "inactive",
      });
      setPendingCount((c) => Math.max(0, c - 1));
      toast.success(t("submit.submitSuccessToast"));
      setSheet(null);
    },
    onError: (err) => {
      // The assignment's true state changed underneath us — refetch on next visit.
      if (
        err instanceof AssignmentActionError &&
        (err.errorKey === "not-found" || err.errorKey === "already-submitted")
      ) {
        queryClient.invalidateQueries({
          queryKey: assignmentsKeys.lists(),
          refetchType: "inactive",
        });
      }
    },
  });

  const openCard = (a: AssignmentEntity) => {
    submitMutation.reset();
    const mode =
      a.status === "graded"
        ? "graded"
        : a.status === "pending"
          ? "edit"
          : "readonly";
    setSheet({ assignment: a, mode });
  };

  const closeSheet = () => {
    submitMutation.reset();
    setSheet(null);
  };

  const submitErrorKey: AssignmentFailure["type"] | null =
    submitMutation.error instanceof AssignmentActionError
      ? submitMutation.error.errorKey
      : submitMutation.isError
        ? "unknown"
        : null;

  const emptyTitleFor = (tab: AssignmentTab) =>
    tab === "pending"
      ? t("empty.pendingTab")
      : tab === "submitted"
        ? t("empty.submittedTab")
        : tab === "graded"
          ? t("empty.gradedTab")
          : t("empty.allTab");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("page.title")}
        </h1>
        <p className="text-edu-text-secondary text-sm">
          {pendingCount === 0
            ? t("page.subtitleZero")
            : t("page.subtitle", { count: pendingCount })}
        </p>
      </header>

      {errorKey ? (
        <p role="alert" className="text-edu-error-text text-sm">
          {t(`errors.${errorKey}`)}
        </p>
      ) : (
        <>
          <AssignmentTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            groupLabel={t("tabs.groupLabel")}
            labels={{
              all: t("tabs.all"),
              pending: t("tabs.pending"),
              submitted: t("tabs.submitted"),
              graded: t("tabs.graded"),
            }}
          />

          <AssignmentsListRegion
            key={activeTab}
            tab={activeTab}
            initialData={
              activeTab === "all"
                ? (initialAssignments ?? undefined)
                : undefined
            }
            listAction={actions.listAssignmentsAction}
            emptyTitle={emptyTitleFor(activeTab)}
            onOpenCard={openCard}
          />
        </>
      )}

      {sheet && (sheet.mode === "edit" || sheet.mode === "readonly") && (
        <SubmitSheet
          assignment={sheet.assignment}
          mode={sheet.mode}
          open
          onOpenChange={(o) => {
            if (!o) closeSheet();
          }}
          submitting={submitMutation.isPending}
          submitErrorKey={submitErrorKey}
          onSubmit={(input) =>
            submitMutation.mutate({ assignmentId: sheet.assignment.id, input })
          }
        />
      )}

      {sheet && sheet.mode === "graded" && (
        <GradedSheet
          assignment={sheet.assignment}
          open
          onOpenChange={(o) => {
            if (!o) closeSheet();
          }}
        />
      )}
    </div>
  );
}
