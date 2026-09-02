"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import type { AssignmentSummary } from "@/features/lms/domain/entities/assignment.entity";
import { AssignmentCard } from "./assignment-card";
import { AssignmentsError } from "./assignments-error";
import { AssignmentsSkeleton } from "./assignments-skeleton";
import type {
  AssignmentsErrorKey,
  StudentAssignmentsActions,
  StudentAssignmentsScreenProps,
} from "./student-assignments-screen.i-vm";
import { SubmitSheet } from "./submit-sheet";

const assignmentsKeys = {
  list: () => ["lms", "assignments", "list"] as const,
  detail: (assignmentId: string) =>
    ["lms", "assignments", "detail", assignmentId] as const,
};

/** Carries a stable failure key from a failed Server Action through the query /
 *  mutation error channel so presentation can translate it. */
export class AssignmentActionError extends Error {
  constructor(readonly errorKey: AssignmentsErrorKey) {
    super(errorKey);
    this.name = "AssignmentActionError";
  }
}

function errorKeyOf(error: unknown): AssignmentsErrorKey | null {
  if (error instanceof AssignmentActionError) return error.errorKey;
  return error ? "unknown" : null;
}

/** Loading/empty/error/success region for the class's assignment list. */
function AssignmentsListRegion({
  initialData,
  listAction,
  onOpenCard,
}: {
  initialData: AssignmentSummary[] | undefined;
  listAction: StudentAssignmentsActions["listAssignmentsAction"];
  onOpenCard: (assignment: AssignmentSummary) => void;
}) {
  const t = useTranslations("assignments");
  const query = useQuery({
    queryKey: assignmentsKeys.list(),
    queryFn: async (): Promise<AssignmentSummary[]> => {
      const res = await listAction();
      if (!res.ok) throw new AssignmentActionError(res.errorKey);
      return res.data;
    },
    initialData,
    staleTime: 30_000,
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
        <EmptyState icon={ClipboardList} title={t("empty.allTab")} />
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
 * Client container for `/student/assignments` (US-E24.1).
 *
 * ONE flat list — the four status tabs are gone because the class-scoped list
 * row carries no per-student status (see `student-assignments-screen.i-vm.ts`).
 * Opening a card fires the DETAIL read, which is the only place the caller's
 * own submission is known; the submit mutation is non-optimistic (single
 * attempt — an optimistic row that then 409s would be a lie).
 */
export function StudentAssignmentsScreen({
  assignments: initialAssignments,
  errorKey,
  actions,
}: StudentAssignmentsScreenProps) {
  const t = useTranslations("assignments");
  const queryClient = useQueryClient();
  const [openRow, setOpenRow] = useState<AssignmentSummary | null>(null);

  const detailQuery = useQuery({
    queryKey: openRow
      ? assignmentsKeys.detail(openRow.id)
      : ["lms", "assignments", "detail", "none"],
    queryFn: async () => {
      if (!openRow) return null;
      const res = await actions.getAssignmentDetailAction(openRow.id);
      if (!res.ok) throw new AssignmentActionError(res.errorKey);
      return res.data;
    },
    enabled: openRow !== null,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      content,
    }: {
      assignmentId: string;
      content: string;
    }) => {
      const res = await actions.submitAssignmentAction(assignmentId, content);
      if (!res.ok) throw new AssignmentActionError(res.errorKey);
      return res.data;
    },
    onSuccess: (submission) => {
      // Re-read the detail so the sheet flips to its read-only submitted view
      // from SERVER truth rather than a locally-assembled guess.
      queryClient.invalidateQueries({
        queryKey: assignmentsKeys.detail(submission.assignmentId),
      });
      toast.success(t("submit.submitSuccessToast"));
    },
    onError: (err) => {
      // `already-submitted` means the server state moved under us — refetch the
      // detail so the sheet shows the submission that actually exists.
      if (
        err instanceof AssignmentActionError &&
        err.errorKey === "already-submitted" &&
        openRow
      ) {
        queryClient.invalidateQueries({
          queryKey: assignmentsKeys.detail(openRow.id),
        });
      }
    },
  });

  const openCard = (a: AssignmentSummary) => {
    submitMutation.reset();
    setOpenRow(a);
  };

  const closeSheet = () => {
    submitMutation.reset();
    setOpenRow(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-extrabold text-2xl text-foreground">
          {t("page.title")}
        </h1>
        <p className="text-edu-text-secondary text-sm">{t("page.subtitle")}</p>
      </header>

      {errorKey ? (
        <p role="alert" className="text-edu-error-text text-sm">
          {t(`errors.${errorKey}`)}
        </p>
      ) : (
        <AssignmentsListRegion
          initialData={initialAssignments ?? undefined}
          listAction={actions.listAssignmentsAction}
          onOpenCard={openCard}
        />
      )}

      {openRow && (
        <SubmitSheet
          row={openRow}
          detail={detailQuery.data ?? null}
          detailLoading={detailQuery.isPending}
          detailErrorKey={
            detailQuery.isError ? errorKeyOf(detailQuery.error) : null
          }
          open
          onOpenChange={(o) => {
            if (!o) closeSheet();
          }}
          submitting={submitMutation.isPending}
          submitErrorKey={
            submitMutation.isError ? errorKeyOf(submitMutation.error) : null
          }
          onSubmit={(content) =>
            submitMutation.mutate({ assignmentId: openRow.id, content })
          }
        />
      )}
    </div>
  );
}
