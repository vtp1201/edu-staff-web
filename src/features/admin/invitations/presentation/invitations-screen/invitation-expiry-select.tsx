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
}: InvitationExpirySelectProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v) as ExpiryDays)}
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
