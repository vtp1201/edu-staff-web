"use client";

import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { runSwitchActivation } from "./switch-activation";
import { TenantCard } from "./tenant-card";
import type {
  SwitchTenantResult,
  TenantCardStatus,
  TenantCardViewModel,
} from "./tenant-card.i-vm";

export interface TenantSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberships: TenantCardViewModel[];
  onSwitchTenant: (
    tenantId: string,
    role: string,
  ) => Promise<SwitchTenantResult>;
  /**
   * Optional override for focus-restore on close. When the dialog is opened from
   * an overlay (e.g. a DropdownMenuItem) whose own focus-scope resets focus while
   * closing, the shared Dialog's auto-capture can miss the true invoker — pass a
   * handler that `preventDefault()`s and focuses the invoking control directly.
   */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * "Chọn trường" dialog (US-E23.1). Controlled `open`/`onOpenChange` only —
 * never self-manages open state (Risk B); the shared `Dialog` primitive already
 * restores focus to the invoking trigger on close (`useDialogReturnFocus`, §0).
 * Owns the single in-flight card state; dismiss is blocked while busy (FR-006).
 */
export function TenantSwitchDialog({
  open,
  onOpenChange,
  memberships,
  onSwitchTenant,
  onCloseAutoFocus,
}: TenantSwitchDialogProps) {
  const t = useTranslations("tenant.switch");
  const [loadingTenantId, setLoadingTenantId] = useState<string | null>(null);
  // Single-slot: only one card can be mid-flow at a time (disabled-while-busy),
  // so one error slot is sufficient. Only 403 lands here (FR-008, inline);
  // network/5xx are toast-only (FR-009).
  const [errorTenantId, setErrorTenantId] = useState<string | null>(null);

  function reset() {
    setLoadingTenantId(null);
    setErrorTenantId(null);
  }

  function handleOpenChange(next: boolean) {
    // FR-006: block Escape/backdrop dismiss while a switch is in flight.
    if (!next && loadingTenantId !== null) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function handleActivate(tenantId: string) {
    const target = memberships.find((m) => m.tenantId === tenantId);
    if (!target || target.isCurrent) return; // FR-005 no-op on current card
    if (loadingTenantId !== null) return; // guard double / concurrent activation
    setErrorTenantId(null);
    // runSwitchActivation rethrows a NEXT_REDIRECT (Risk A) — that propagates as
    // an unhandled rejection while Next performs the navigation; the component
    // tree unmounts, so no state cleanup is needed on the success path.
    void runSwitchActivation(tenantId, target.roles[0] ?? "", {
      onSwitchTenant,
      onLoading: setLoadingTenantId,
      onForbidden: (id) => setErrorTenantId(id),
      onGenericError: () => toast.error(t("errorGeneric")),
    });
  }

  function statusFor(tenantId: string): TenantCardStatus {
    if (loadingTenantId === tenantId) return { kind: "loading" };
    if (errorTenantId === tenantId)
      return { kind: "error", reason: "forbidden" };
    return { kind: "idle" };
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[440px]"
        // Only override the shared Dialog's default focus-restore when a handler
        // is provided; passing `undefined` would clobber it for other callers.
        {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
      >
        <DialogHeader>
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-[10px] bg-primary/15 text-primary"
          >
            <ArrowLeftRight className="size-4" />
          </span>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        {memberships.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {memberships.map((m) => (
              <li key={m.tenantId}>
                <TenantCard
                  viewModel={m}
                  status={statusFor(m.tenantId)}
                  onActivate={handleActivate}
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
