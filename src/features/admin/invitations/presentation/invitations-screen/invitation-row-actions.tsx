import { Copy, Loader2, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InvitationRowVM } from "./invitations-screen.i-vm";

export interface InvitationRowActionsProps {
  actions: InvitationRowVM["actions"];
  isRowMutating: boolean;
  /** aria-labels (already interpolate the row email). */
  copyLabel: string;
  resendLabel: string;
  revokeLabel: string;
  /** aria-label for the actions group (interpolates email). */
  groupLabel: string;
  onCopyLink: () => void;
  onResend: () => void;
  onRevokeRequest: () => void;
}

/**
 * Row action buttons — copy-link (pending) / resend (expired) / revoke
 * (pending). Gating is driven by the VM's `actions` booleans, never re-derived
 * from status. Each icon-only button carries a Vietnamese `aria-label`. Buttons
 * are ≥44px on mobile (card list <820px) for touch (accessibility.md).
 */
export function InvitationRowActions({
  actions,
  isRowMutating,
  copyLabel,
  resendLabel,
  revokeLabel,
  groupLabel,
  onCopyLink,
  onResend,
  onRevokeRequest,
}: InvitationRowActionsProps) {
  const hasAny = actions.copyLink || actions.resend || actions.revoke;
  if (!hasAny) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return (
    <fieldset
      aria-label={groupLabel}
      className="m-0 inline-flex items-center gap-1.5 border-0 p-0"
    >
      {actions.copyLink && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={copyLabel}
          disabled={isRowMutating}
          onClick={onCopyLink}
          className="size-9 max-[820px]:size-11"
        >
          <Copy className="size-4" aria-hidden="true" />
        </Button>
      )}
      {actions.resend && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={resendLabel}
          aria-busy={isRowMutating}
          disabled={isRowMutating}
          onClick={onResend}
          className="size-9 max-[820px]:size-11"
        >
          {isRowMutating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCw className="size-4" aria-hidden="true" />
          )}
        </Button>
      )}
      {actions.revoke && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={revokeLabel}
          disabled={isRowMutating}
          onClick={onRevokeRequest}
          className="size-9 text-edu-error-dark hover:text-edu-error-dark max-[820px]:size-11"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      )}
    </fieldset>
  );
}
