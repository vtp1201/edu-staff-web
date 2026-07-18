import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpiryDays } from "../../domain/entities/invitation.entity";

export interface InvitationExpirySelectProps {
  value: ExpiryDays;
  options: { value: ExpiryDays; label: string }[];
  triggerAriaLabel: string;
  onChange: (value: ExpiryDays) => void;
  /**
   * Controlled open state (DEF-1, US-E21.1). Radix's `Select` listbox renders
   * in a portal outside the parent `Dialog`'s DOM subtree, so pressing
   * Escape to close JUST the listbox was ALSO closing the whole Dialog
   * (discarding in-progress chips) — two independent Escape handlers reacting
   * to the same keydown with no coordination between them. The caller now
   * owns this popover's open state and force-closes it itself (via a
   * document-level capture-phase Escape listener that runs before either
   * handler), so both props here must be provided together.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Expiry-window select (7/14/30, default 14). UI-ONLY: the real wire has no
 * expiry field (ground-truth #2) — kept per AC-003.6/003.7 + design-spec; the
 * value never reaches a real request.
 */
export function InvitationExpirySelect({
  value,
  options,
  triggerAriaLabel,
  onChange,
  open,
  onOpenChange,
}: InvitationExpirySelectProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v) as ExpiryDays)}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SelectTrigger aria-label={triggerAriaLabel} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
