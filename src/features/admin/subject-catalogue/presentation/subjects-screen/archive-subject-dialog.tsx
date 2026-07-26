"use client";

import { Archive } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Subject } from "../../domain/entities/subject.entity";

/**
 * Archive affordance for a subject master, promoted out of
 * `subjects-screen.tsx` (US-E12.13) because it now has two consumers: the
 * Subjects table row and the full-page detail route
 * (`.claude/rules/component-organization.md`, decision `0026`).
 *
 * Deliberately NOT part of the shared editor body / the Sheet — see the story
 * packet §2 (Archive ownership).
 *
 * Blocked state stays keyboard reachable: an `aria-disabled` button inside a
 * Tooltip rather than a `disabled` one (a `disabled` button is not focusable,
 * so the reason would be unreachable for keyboard users).
 *
 * Both parts must be rendered inside a `TooltipProvider`.
 */
export function ArchiveSubjectButton({
  subject,
  onRequest,
  withLabel = false,
}: {
  subject: Subject;
  onRequest: (subject: Subject) => void;
  /** Full page shows the label; the dense table row stays icon-only. */
  withLabel?: boolean;
}) {
  const t = useTranslations("subjectCatalogue.subjects");

  if (subject.inUse) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-disabled="true"
            aria-label={t("archiveButton")}
            onClick={(e) => e.preventDefault()}
            className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-[var(--edu-radius-btn)] px-2 text-sm font-medium text-muted-foreground opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Archive aria-hidden="true" className="size-3.5" />
            {withLabel && t("archiveButton")}
          </button>
        </TooltipTrigger>
        <TooltipContent>{t("archiveBlockedTooltip")}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t("archiveButton")}
      className="text-edu-error-text hover:text-edu-error-text"
      onClick={() => onRequest(subject)}
    >
      <Archive aria-hidden="true" className="size-3.5" />
      {withLabel && t("archiveButton")}
    </Button>
  );
}

export function ArchiveSubjectDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  /** The subject pending confirmation; `null` closes the dialog. */
  target: Subject | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (subject: Subject) => void;
}) {
  const t = useTranslations("subjectCatalogue.subjects");

  return (
    <AlertDialog open={target !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("archiveConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {target ? t("archiveConfirmBody", { name: target.name }) : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-edu-error-text text-white hover:bg-edu-error-text/90"
            onClick={() => target && onConfirm(target)}
          >
            {t("archiveConfirmButton")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
