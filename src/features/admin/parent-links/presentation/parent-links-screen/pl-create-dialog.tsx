"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Link2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import {
  SearchCombobox,
  type SearchComboboxCandidate,
  type SearchComboboxStatus,
} from "@/components/shared/search-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LinkCandidate } from "../../domain/entities/link-candidate.entity";
import type { RelationshipType } from "../../domain/entities/parent-student-link.entity";
import { parentLinksKeys } from "./parent-links.query-keys";
import type { CreateLinkActionInput } from "./parent-links-screen.i-vm";

const RELATIONSHIPS: RelationshipType[] = ["father", "mother", "guardian"];
const DEBOUNCE_MS = 300;

export interface PLCreateDialogSubmitError {
  kind: "already-linked" | "validation" | "network-error";
  /** Already-i18n'd message (role="alert"). */
  message: string;
  fieldErrors?: {
    field: "studentId" | "parentId" | "relationship" | "note";
    message: string;
  }[];
}

export interface PLCreateDialogProps {
  open: boolean;
  isSubmitting: boolean;
  submitError?: PLCreateDialogSubmitError;
  /** Throw on failure so the internal useQuery captures the error state. */
  onSearchStudents: (q: string) => Promise<LinkCandidate[]>;
  onSearchParents: (q: string) => Promise<LinkCandidate[]>;
  onSubmit: (input: CreateLinkActionInput) => void;
  onClose: () => void;
}

function toCandidate(c: LinkCandidate, sub?: string): SearchComboboxCandidate {
  return {
    id: c.memberId,
    primaryLabel: c.fullName,
    subLabel: sub,
    avatarUrl: c.avatarUrl,
    avatarInitials: c.fullName.slice(0, 2),
  };
}

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value]);
  return debounced;
}

function comboStatus(
  enabled: boolean,
  q: {
    isLoading: boolean;
    isError: boolean;
  },
): SearchComboboxStatus {
  if (!enabled) return "idle";
  if (q.isLoading) return "loading";
  if (q.isError) return "error";
  return "success";
}

/**
 * Create-link dialog (FR-003/004/005/010/011). Constructive shadcn `Dialog`
 * (not AlertDialog). Owns 2 independent debounce+`enabled` gates → 2 `useQuery`
 * candidate fetches (state-architecture §6.3). Local-form state only (plain
 * useState, reset on open). Server-side duplicate/role checks surface via
 * `submitError` (already-linked inline `role="alert"`, 422 per-field, network).
 */
export function PLCreateDialog({
  open,
  isSubmitting,
  submitError,
  onSearchStudents,
  onSearchParents,
  onSubmit,
  onClose,
}: PLCreateDialogProps) {
  const t = useTranslations("parentLinks");
  const parentErrorId = useId();

  const [student, setStudent] = useState<SearchComboboxCandidate | null>(null);
  const [parent, setParent] = useState<SearchComboboxCandidate | null>(null);
  const [relationship, setRelationship] = useState<RelationshipType | "">("");
  const [note, setNote] = useState("");
  const [studentQ, setStudentQ] = useState("");
  const [parentQ, setParentQ] = useState("");

  const studentDebounced = useDebounced(studentQ);
  const parentDebounced = useDebounced(parentQ);

  // Enabled while no selection is made — so opening a combobox shows an initial
  // candidate list immediately (better UX than a blank list), and typing then
  // refines it server-side (debounced). Disabled once a candidate is chosen.
  const studentEnabled = !student;
  const parentEnabled = !parent;

  const studentQuery = useQuery({
    queryKey: parentLinksKeys.studentSearch(studentDebounced),
    queryFn: () => onSearchStudents(studentDebounced),
    enabled: studentEnabled,
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const parentQuery = useQuery({
    queryKey: parentLinksKeys.parentSearch(parentDebounced),
    queryFn: () => onSearchParents(parentDebounced),
    enabled: parentEnabled,
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Reset every time the dialog opens (only `open` is a dependency by design —
  // the setters are stable).
  useEffect(() => {
    if (open) {
      setStudent(null);
      setParent(null);
      setRelationship("");
      setNote("");
      setStudentQ("");
      setParentQ("");
    }
  }, [open]);

  const studentCandidates = useMemo(
    () =>
      (studentQuery.data ?? []).map((c) =>
        toCandidate(
          c,
          c.className ? t("classPrefix", { class: c.className }) : undefined,
        ),
      ),
    [studentQuery.data, t],
  );
  const parentCandidates = useMemo(
    () => (parentQuery.data ?? []).map((c) => toCandidate(c, c.phone)),
    [parentQuery.data],
  );

  const parentFieldError = submitError?.fieldErrors?.find(
    (f) => f.field === "parentId",
  );
  const studentFieldError = submitError?.fieldErrors?.find(
    (f) => f.field === "studentId",
  );
  const parentInvalid =
    submitError?.kind === "already-linked" || Boolean(parentFieldError);
  const parentInlineMessage =
    submitError?.kind === "already-linked"
      ? submitError.message
      : parentFieldError?.message;

  const canSubmit =
    Boolean(student) && Boolean(parent) && relationship !== "" && !isSubmitting;

  const handleSubmit = () => {
    if (!student || !parent || relationship === "") return;
    onSubmit({
      studentId: student.id,
      parentId: parent.id,
      relationship,
      note: note.trim() ? note.trim() : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-w-118">
        <DialogHeader>
          <div className="flex items-start gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12">
              <Link2 className="size-4 text-primary" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>{t("createDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("createDialog.subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <SearchCombobox
            label={t("createDialog.studentLabel")}
            placeholder={t("createDialog.studentPlaceholder")}
            value={student}
            onValueChange={setStudent}
            query={studentQ}
            onQueryChange={setStudentQ}
            candidates={studentCandidates}
            status={comboStatus(studentEnabled, studentQuery)}
            errorMessage={t("errors.searchNetwork")}
            onRetry={() => studentQuery.refetch()}
            emptyMessage={t("createDialog.noResults")}
            loadingMessage={t("createDialog.searching")}
            clearSelectionAriaLabel={t("createDialog.clearSelection")}
            listboxAriaLabel={t("createDialog.studentListboxLabel")}
            retryLabel={t("errors.retry")}
            invalid={Boolean(studentFieldError)}
          />

          <div>
            <SearchCombobox
              label={t("createDialog.parentLabel")}
              placeholder={t("createDialog.parentPlaceholder")}
              value={parent}
              onValueChange={setParent}
              query={parentQ}
              onQueryChange={setParentQ}
              candidates={parentCandidates}
              status={comboStatus(parentEnabled, parentQuery)}
              errorMessage={t("errors.searchNetwork")}
              onRetry={() => parentQuery.refetch()}
              emptyMessage={t("createDialog.noResults")}
              loadingMessage={t("createDialog.searching")}
              clearSelectionAriaLabel={t("createDialog.clearSelection")}
              listboxAriaLabel={t("createDialog.parentListboxLabel")}
              retryLabel={t("errors.retry")}
              invalid={parentInvalid}
              describedById={parentInvalid ? parentErrorId : undefined}
            />
            {parentInvalid && parentInlineMessage && (
              <p
                id={parentErrorId}
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 font-bold text-edu-error-dark text-xs"
              >
                <AlertTriangle className="size-3" aria-hidden="true" />
                {parentInlineMessage}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="font-bold text-edu-text-secondary text-xs">
              {t("createDialog.relationshipLabel")}
            </p>
            <Select
              value={relationship}
              onValueChange={(v) => setRelationship(v as RelationshipType)}
            >
              <SelectTrigger aria-label={t("createDialog.relationshipLabel")}>
                <SelectValue
                  placeholder={t("createDialog.relationshipPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`relationshipLabels.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="pl-create-note"
              className="font-bold text-edu-text-secondary text-xs"
            >
              {t("createDialog.noteLabel")}
            </label>
            <Textarea
              id="pl-create-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("createDialog.notePlaceholder")}
            />
          </div>

          {submitError?.kind === "network-error" && (
            <p
              role="alert"
              className="flex items-center gap-1.5 font-bold text-edu-error-dark text-xs"
            >
              <AlertTriangle className="size-3" aria-hidden="true" />
              {submitError.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t("createDialog.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Link2 className="size-4" aria-hidden="true" />
            )}
            {t("createDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
