import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface PLRowMenuProps {
  viewDetailLabel: string;
  unlinkLabel: string;
  /** Interpolates student+parent name (never 20 identical "Hành động" labels). */
  triggerAriaLabel: string;
  canViewDetail: boolean;
  canUnlink: boolean;
  onViewDetail: () => void;
  onUnlinkRequest: () => void;
}

/**
 * Run `cb` only AFTER the dropdown's own content has fully unmounted (incl. its
 * exit animation). Opening a controlled dialog on the same tick (or a bare
 * `setTimeout(0)` that can fire before an animated close finishes) races the
 * menu's own close, so the dialog snapshots the wrong `activeElement` and focus
 * later falls to <body> instead of the trigger (A11Y-001). Polling for the
 * content's removal serialises the two.
 */
function afterMenuClosed(cb: () => void): void {
  const start = performance.now();
  const poll = () => {
    const stillOpen = document.querySelector(
      '[data-slot="dropdown-menu-content"]',
    );
    if (!stillOpen || performance.now() - start > 1000) cb();
    else requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}

/**
 * Row action menu — thin wrapper over shadcn DropdownMenu ("Xem chi tiết" /
 * "Gỡ liên kết" danger-styled). Radix supplies full keyboard semantics + focus
 * return to the trigger on close. Shared identically by table + card list
 * (UC-007 — no mobile-only interaction pattern).
 */
export function PLRowMenu({
  viewDetailLabel,
  unlinkLabel,
  triggerAriaLabel,
  canViewDetail,
  canUnlink,
  onViewDetail,
  onUnlinkRequest,
}: PLRowMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  // After the menu closes, explicitly put focus back on THIS trigger before
  // opening the dialog, so the dialog's return-focus snapshot captures the
  // trigger (not <body>) and restores focus here on close (A11Y-001, WCAG 2.4.3).
  const openAfterClose = (cb: () => void) =>
    afterMenuClosed(() => {
      triggerRef.current?.focus();
      cb();
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={triggerAriaLabel}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-42">
        {canViewDetail && (
          // Do NOT preventDefault — that keeps the menu open, and its dismissable
          // layer would then swallow the dialog's Escape.
          <DropdownMenuItem onSelect={() => openAfterClose(onViewDetail)}>
            <ExternalLink
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            {viewDetailLabel}
          </DropdownMenuItem>
        )}
        {canUnlink && (
          <DropdownMenuItem
            onSelect={() => openAfterClose(onUnlinkRequest)}
            className="text-edu-error-dark focus:text-edu-error-dark"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {unlinkLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
