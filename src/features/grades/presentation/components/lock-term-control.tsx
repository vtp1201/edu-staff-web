"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  DestructiveConfirmDialog,
  type DestructiveConfirmErrorSlot,
} from "@/components/shared/destructive-confirm-dialog";
import { Button } from "@/components/ui/button";
import type { GradesFailure } from "../../domain/failures/grades.failure";

/** Result shape of the bound `lockTermAction` Server Action. */
export type LockTermResult =
  | { ok: true; lockedCount?: number }
  | { ok: false; errorKey: GradesFailure["type"] };

export interface LockTermControlProps {
  /**
   * PRESENT ONLY for an ADMIN/MANAGER viewer — the host gates rendering this
   * whole control on the action's presence, so authorization stays owned by the
   * RSC/DI layer (belt-and-suspenders with `core`'s own 403).
   */
  action: () => Promise<LockTermResult>;
  /** false while the target term/class-subject has no lockable (PUBLISHED) cell */
  enabled: boolean;
  /** names the target unambiguously in the confirm body */
  context: { className: string; subjectName: string; term: string };
  /** host renders the success banner (it owns the page's status region) */
  onLocked: (lockedCount: number) => void;
}

/**
 * Irreversible term lock (US-E18.12, ADR 0054 §3.2/§4), extracted in US-E18.44
 * so it has ONE canonical home while being rendered by the screen that actually
 * hosts the admin/manager grade view. Behaviour is unchanged from the original
 * inline implementation in `grade-book-screen.tsx`, including A11Y-102: a
 * failure keeps the dialog OPEN and surfaces the reason through the dialog's own
 * `errorSlot` (forbidden ⇒ no retry, transient ⇒ retry) instead of closing and
 * forcing a re-open/re-confirm cycle.
 */
export function LockTermControl({
  action,
  enabled,
  context,
  onLocked,
}: LockTermControlProps) {
  const t = useTranslations("gradeBook");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<GradesFailure["type"] | null>(null);

  function failureMessage(key: GradesFailure["type"]): string {
    if (key === "forbidden" || key === "teacher-not-assigned") {
      return t("errorForbidden");
    }
    if (key === "network-error") return t("errorNetworkError");
    return t("errorUnknown");
  }

  async function confirm() {
    setPending(true);
    setErrorKey(null);
    const result = await action();
    setPending(false);
    if (result.ok) {
      setOpen(false);
      onLocked(result.lockedCount ?? 0);
      return;
    }
    setErrorKey(result.errorKey);
  }

  const errorSlot: DestructiveConfirmErrorSlot | undefined = (() => {
    if (!errorKey) return undefined;
    if (errorKey === "forbidden" || errorKey === "teacher-not-assigned") {
      return { tone: "forbidden", message: failureMessage(errorKey) };
    }
    return {
      tone: "transient",
      message: failureMessage(errorKey),
      onRetry: confirm,
    };
  })();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setErrorKey(null);
          setOpen(true);
        }}
        disabled={!enabled}
      >
        {t("lockTermButton")}
      </Button>

      <DestructiveConfirmDialog
        open={open}
        title={t("lockTermConfirmTitle")}
        body={t("lockTermConfirmBody", {
          className: context.className,
          subjectName: context.subjectName,
          term: context.term,
        })}
        confirmLabel={t("lockTermConfirmOk")}
        isLoading={pending}
        errorSlot={errorSlot}
        onConfirm={confirm}
        onCancel={() => {
          setOpen(false);
          setErrorKey(null);
        }}
      />
    </>
  );
}
