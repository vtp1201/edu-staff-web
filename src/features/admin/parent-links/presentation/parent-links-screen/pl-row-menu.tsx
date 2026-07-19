import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
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
          <DropdownMenuItem onSelect={onViewDetail}>
            <ExternalLink
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            {viewDetailLabel}
          </DropdownMenuItem>
        )}
        {canUnlink && (
          <DropdownMenuItem
            onSelect={onUnlinkRequest}
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
