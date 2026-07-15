"use client";

import { Flag, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FeedMenuProps {
  /** "Tuỳ chọn cho bài viết của {author}" | "…bình luận…". */
  ariaLabel: string;
  canReport: boolean;
  onReport: () => void;
  /** Post variant only — omitted entirely for comment usage (§0.3). */
  pin?: { pinned: boolean; label: string; onToggle: () => void };
  remove?: { label: string; onRemove: () => void };
  reportLabel: string;
}

/**
 * ONE "…" menu for both post (up to 3 items) and comment (report-only)
 * variants — never two menu components (component-organization.md). Built on
 * Radix `DropdownMenu` with a REAL `DropdownMenuTrigger asChild` wrapping a
 * `<Button>`, so Escape / outside-click dismiss + focus-return-to-trigger are
 * native (AC-1905.6/.7) with no custom hook (§0.4). The trigger itself renders
 * `null` when zero items are entitled (AC-1905.5 — hidden, not an empty menu).
 */
export function FeedMenu({
  ariaLabel,
  canReport,
  onReport,
  pin,
  remove,
  reportLabel,
}: FeedMenuProps) {
  if (!canReport && !pin && !remove) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={ariaLabel}
          className="shrink-0 text-edu-text-secondary"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[190px]">
        {pin && (
          <DropdownMenuItem onSelect={pin.onToggle}>
            {pin.pinned ? (
              <PinOff aria-hidden="true" />
            ) : (
              <Pin aria-hidden="true" />
            )}
            {pin.label}
          </DropdownMenuItem>
        )}
        {canReport && (
          <DropdownMenuItem onSelect={onReport}>
            <Flag aria-hidden="true" />
            {reportLabel}
          </DropdownMenuItem>
        )}
        {remove && (
          <DropdownMenuItem variant="destructive" onSelect={remove.onRemove}>
            <Trash2 aria-hidden="true" />
            {remove.label}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
