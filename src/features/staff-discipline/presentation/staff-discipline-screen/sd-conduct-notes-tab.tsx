"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ListError } from "@/components/shared/list-error";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import type {
  SetStaffConductNoteInput,
  StaffConductNoteEntity,
  StaffConductRating,
} from "../../domain/entities/staff-conduct-note.entity";
import { SDConductNoteRow } from "./sd-conduct-note-row";
import { SDConductTermBar } from "./sd-conduct-term-bar";
import { errorKeyOf, useSDErrorMessage } from "./sd-error-message";
import { sdSkeletonRow } from "./sd-list-states";
import { staffOf } from "./sd-roster-lookup";
import { SetConductNoteDialog } from "./set-conduct-note-dialog";
import {
  SD_LIST_QUERY_OPTIONS,
  staffDisciplineKeys,
} from "./staff-discipline.query-keys";
import type {
  StaffDisciplineErrorKey,
  StaffDisciplineScreenVM,
  StaffDisciplineSubmitError,
} from "./staff-discipline-screen.i-vm";

/**
 * Conduct-notes tab — its OWN container, fully independent of the violations tab
 * (own `useQuery`, own term/staff state, own dialog + reject state). `termId` is
 * part of the query key (a change re-queries INT-006, AC-006.6); the staff filter
 * narrows in memory only.
 *
 * The APPROVED-lock pre-check is a pure read of the already-fetched row state —
 * no extra query — and it lives at the ROW's trigger boundary, so the set dialog
 * can never be opened for an APPROVED record (AC-007.4).
 */
export type SDConductNotesTabProps = Pick<
  StaffDisciplineScreenVM,
  | "viewerRole"
  | "viewerMemberId"
  | "viewerStaffMemberId"
  | "initialConductNotes"
  | "initialConductNotesErrorKey"
  | "initialTermId"
  | "staffRoster"
  | "termOptions"
  | "listConductNotesAction"
  | "setConductNoteAction"
  | "submitConductNoteAction"
  | "approveConductNoteAction"
  | "rejectConductNoteAction"
>;

type NoteKey = { staffMemberId: string; termId: string };

const sameKey = (a: NoteKey, b: NoteKey) =>
  a.staffMemberId === b.staffMemberId && a.termId === b.termId;

export function SDConductNotesTab({
  viewerRole,
  viewerMemberId,
  viewerStaffMemberId,
  initialConductNotes,
  initialConductNotesErrorKey,
  initialTermId,
  staffRoster,
  termOptions,
  listConductNotesAction,
  setConductNoteAction,
  submitConductNoteAction,
  approveConductNoteAction,
  rejectConductNoteAction,
}: SDConductNotesTabProps) {
  const t = useTranslations("staffDiscipline.conductNotes");
  const tSD = useTranslations("staffDiscipline");
  const tCommon = useTranslations("Common");
  const errorMessage = useSDErrorMessage();
  const queryClient = useQueryClient();

  const isPrincipal = viewerRole === "principal";
  const [termId, setTermId] = useState(initialTermId);
  const [staffFilter, setStaffFilter] = useState("all");
  const [setOpen, setSetOpen] = useState(false);
  const [setTarget, setSetTarget] = useState<NoteKey | null>(null);
  const [setExisting, setSetExisting] = useState<
    { rating: StaffConductRating; note: string } | undefined
  >(undefined);
  const [setError, setSetError] = useState<
    StaffDisciplineSubmitError | undefined
  >(undefined);
  const [rejectingKey, setRejectingKey] = useState<NoteKey | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rowError, setRowError] = useState<{
    key: NoteKey;
    errorKey: StaffDisciplineErrorKey;
  } | null>(null);

  const filter = useMemo(
    () =>
      isPrincipal
        ? { termId }
        : { staffMemberId: viewerStaffMemberId, termId: initialTermId },
    [isPrincipal, termId, viewerStaffMemberId, initialTermId],
  );

  const isSeededFilter =
    !initialConductNotesErrorKey &&
    (isPrincipal ? termId === initialTermId : true);

  const query = useQuery({
    queryKey: staffDisciplineKeys.conductNotesList(filter),
    queryFn: async () => {
      const res = await listConductNotesAction(filter);
      if (!res.ok) throw { type: res.errorKey, retryable: res.retryable };
      return res.data;
    },
    initialData: isSeededFilter ? initialConductNotes : undefined,
    ...SD_LIST_QUERY_OPTIONS,
    retry: (count, error) => errorKeyOf(error) === "network-error" && count < 2,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: staffDisciplineKeys.conductNotes(),
    });

  const setMutation = useMutation({
    mutationFn: async (input: SetStaffConductNoteInput) => {
      const res = await setConductNoteAction(input);
      if (!res.ok) throw { type: res.errorKey, fields: res.fields };
      return res.data;
    },
    onSuccess: () => {
      setSetError(undefined);
      setSetOpen(false);
      setSetTarget(null);
      setSetExisting(undefined);
      void invalidate();
    },
    onError: (error: unknown) => {
      // Dialog stays open with values preserved (AC-007.9). `locked` here is the
      // race/stale server backstop (AC-007.5), never the pre-open block.
      setSetError({
        errorKey: errorKeyOf(error),
        fields:
          error && typeof error === "object" && "fields" in error
            ? (error as StaffDisciplineSubmitError).fields
            : undefined,
      });
      if (errorKeyOf(error) === "locked") void invalidate();
    },
  });

  const rowMutation = useMutation({
    mutationFn: async (
      action:
        | { kind: "submit"; key: NoteKey }
        | { kind: "approve"; key: NoteKey }
        | { kind: "reject"; key: NoteKey; reason: string },
    ) => {
      const { staffMemberId, termId: term } = action.key;
      const res =
        action.kind === "submit"
          ? await submitConductNoteAction(staffMemberId, term)
          : action.kind === "approve"
            ? await approveConductNoteAction(staffMemberId, term)
            : await rejectConductNoteAction(staffMemberId, term, action.reason);
      if (!res.ok) throw { type: res.errorKey };
      return res.data;
    },
    onSuccess: () => {
      setRowError(null);
      setRejectingKey(null);
      setRejectReason("");
      void invalidate();
    },
    onError: (error: unknown, variables) => {
      setRowError({ key: variables.key, errorKey: errorKeyOf(error) });
    },
  });

  const listErrorKey: StaffDisciplineErrorKey | undefined = query.isError
    ? errorKeyOf(query.error)
    : initialConductNotesErrorKey && !query.isSuccess
      ? initialConductNotesErrorKey
      : undefined;

  // AC-006.8 — a term failure belongs on the term selector, not the list.
  const termErrorKey =
    listErrorKey === "term-not-found" ? listErrorKey : undefined;

  const rows: StaffConductNoteEntity[] = useMemo(() => {
    const data = query.data ?? [];
    return staffFilter === "all"
      ? data
      : data.filter((n) => n.staffMemberId === staffFilter);
  }, [query.data, staffFilter]);

  const body = () => {
    if (termErrorKey) return null;
    if (listErrorKey) {
      return (
        <ListError
          message={errorMessage(listErrorKey)}
          retryLabel={tSD("retry")}
          shape="inline-card"
          retryIcon="rotate"
          retryButtonVariant="outline"
          iconSize={10}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (query.isLoading)
      return (
        <ListSkeleton
          loadingAriaLabel={tCommon("skeleton.loadingAriaLabel")}
          rows={4}
          variant="inline"
          renderRow={sdSkeletonRow}
        />
      );
    if (rows.length === 0) {
      return (
        <div className="rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
          <EmptyState
            icon={ClipboardList}
            title={isPrincipal ? t("empty.adminCta") : t("empty.readOnly")}
            cta={
              isPrincipal
                ? {
                    label: t("form.title"),
                    icon: Plus,
                    onClick: () => {
                      setSetTarget(null);
                      setSetExisting(undefined);
                      setSetError(undefined);
                      setSetOpen(true);
                    },
                  }
                : undefined
            }
          />
        </div>
      );
    }
    return (
      <div className="divide-y divide-border overflow-hidden rounded-[var(--edu-radius-card)] border border-border bg-card shadow-card">
        {rows.map((note) => {
          const key: NoteKey = {
            staffMemberId: note.staffMemberId,
            termId: note.termId,
          };
          const busy =
            rowMutation.isPending &&
            rowMutation.variables !== undefined &&
            sameKey(rowMutation.variables.key, key);
          const isLocked = note.state === "APPROVED";
          return (
            <SDConductNoteRow
              key={`${note.termId}:${note.staffMemberId}`}
              note={note}
              staff={staffOf(staffRoster, note.staffMemberId)}
              canSubmit={
                isPrincipal &&
                (note.state === "DRAFT" || note.state === "REJECTED") &&
                note.authorMemberId === viewerMemberId
              }
              canDecide={isPrincipal && note.state === "SUBMITTED"}
              canEdit={isPrincipal && !isLocked}
              isLocked={isLocked}
              isRejecting={rejectingKey !== null && sameKey(rejectingKey, key)}
              isBusy={busy}
              rejectReason={rejectReason}
              errorMessage={
                rowError &&
                sameKey(rowError.key, key) &&
                rowError.errorKey !== "missing-reject-reason"
                  ? errorMessage(rowError.errorKey)
                  : undefined
              }
              rejectServerErrorKey={
                rowError && sameKey(rowError.key, key)
                  ? rowError.errorKey
                  : undefined
              }
              onSubmit={() => rowMutation.mutate({ kind: "submit", key })}
              onApprove={() => rowMutation.mutate({ kind: "approve", key })}
              onStartReject={() => {
                setRowError(null);
                setRejectReason("");
                setRejectingKey(key);
              }}
              onChangeRejectReason={setRejectReason}
              onConfirmReject={() =>
                rowMutation.mutate({
                  kind: "reject",
                  key,
                  reason: rejectReason,
                })
              }
              onCancelReject={() => {
                setRejectingKey(null);
                setRejectReason("");
              }}
              onOpenSetDialog={() => {
                // Unreachable for an APPROVED note: the row renders no trigger.
                setSetTarget(key);
                setSetExisting({ rating: note.rating, note: note.note });
                setSetError(undefined);
                setSetOpen(true);
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-4" aria-label={t("title")}>
      {isPrincipal && (
        <SDConductTermBar
          termOptions={termOptions}
          termId={termId}
          staffFilter={staffFilter}
          staffOptions={staffRoster}
          termErrorMessage={
            termErrorKey ? errorMessage(termErrorKey) : undefined
          }
          onTermChange={setTermId}
          onStaffFilterChange={setStaffFilter}
          onOpenSetDialog={() => {
            setSetTarget(null);
            setSetExisting(undefined);
            setSetError(undefined);
            setSetOpen(true);
          }}
        />
      )}

      {body()}

      {isPrincipal && (
        <SetConductNoteDialog
          open={setOpen}
          target={setTarget}
          existing={setExisting}
          termId={termId}
          staffRoster={staffRoster}
          isSubmitting={setMutation.isPending}
          submitError={setError}
          onSubmit={(input) => setMutation.mutate(input)}
          onClose={() => {
            setSetOpen(false);
            setSetTarget(null);
            setSetExisting(undefined);
            setSetError(undefined);
          }}
        />
      )}
    </section>
  );
}
