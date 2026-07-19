"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialogReturnFocus } from "@/shared/use-dialog-return-focus";
import type { ParentLinkRowVM } from "./parent-links-screen.i-vm";
import { PLConsentBadge } from "./pl-consent-badge";
import {
  PLConsentDetailSection,
  type PLConsentDetailSectionProps,
} from "./pl-consent-detail-section";
import { PLRelationBadge } from "./pl-relation-badge";

export interface PLDetailDialogProps {
  open: boolean;
  row: ParentLinkRowVM | null;
  consent: PLConsentDetailSectionProps;
  onClose: () => void;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 border-border border-b py-2.5 last:border-b-0">
      <div className="w-30 shrink-0 font-bold text-muted-foreground text-xs">
        {label}
      </div>
      <div className="min-w-0 flex-1 text-foreground text-sm">{children}</div>
    </div>
  );
}

function PersonInline({
  fullName,
  sub,
  avatarUrl,
}: {
  fullName: string;
  sub: string;
  avatarUrl?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar className="size-6 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="text-[10px]">
          {fullName.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <span className="font-bold">{fullName}</span>
      <span className="text-muted-foreground">· {sub}</span>
    </span>
  );
}

/**
 * Read-only link detail dialog (FR-006/FR-012). student/parent/relationship/
 * consent/linkedOn/note come from the already-fetched row (no fetch); the 3
 * consent categories lazy-load in a scoped sub-section (AC-004.3/.4). No edit
 * control anywhere (AC-004.5) — only Close (inherited from Dialog).
 */
export function PLDetailDialog({
  open,
  row,
  consent,
  onClose,
}: PLDetailDialogProps) {
  const t = useTranslations("parentLinks");
  // Capture the invoking control at the open TRANSITION and restore focus to it
  // on close (A11Y-001, WCAG 2.4.3). The shared DialogContent hardcodes
  // `useDialogReturnFocus(true)`, which — because this dialog stays mounted while
  // closed — snapshots the invoker at screen-mount (<body>) instead of at open.
  // Passing our own `onCloseAutoFocus` (spread after the default) overrides it.
  const returnFocus = useDialogReturnFocus(open);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-110" onCloseAutoFocus={returnFocus}>
        <DialogHeader>
          <DialogTitle>{t("detailDialog.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("detailDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {row && (
          <div className="flex flex-col">
            <DetailRow label={t("detailDialog.student")}>
              <PersonInline
                fullName={row.student.fullName}
                sub={row.student.className}
                avatarUrl={row.student.avatarUrl}
              />
            </DetailRow>
            <DetailRow label={t("detailDialog.parent")}>
              <PersonInline
                fullName={row.parent.fullName}
                sub={row.parent.phone}
                avatarUrl={row.parent.avatarUrl}
              />
            </DetailRow>
            <DetailRow label={t("detailDialog.relationship")}>
              <PLRelationBadge
                relationship={row.relationship}
                label={row.relationshipLabel}
              />
            </DetailRow>
            <DetailRow label={t("detailDialog.consent")}>
              <PLConsentBadge
                status={row.consentStatus}
                label={row.consentLabel}
              />
            </DetailRow>
            <DetailRow label={t("detailDialog.linkedOn")}>
              {row.linkedOnLabel}
            </DetailRow>
            {row.note && (
              <DetailRow label={t("detailDialog.note")}>{row.note}</DetailRow>
            )}

            <PLConsentDetailSection {...consent} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
