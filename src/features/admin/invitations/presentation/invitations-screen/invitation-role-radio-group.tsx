import {
  BookOpen,
  type LucideIcon,
  School,
  Settings2,
  UserCheck,
  Users,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/shared/utils";
import type { InviteRoleOption } from "../../domain/entities/invitation.entity";

const ROLE_ICON: Record<InviteRoleOption, LucideIcon> = {
  teacher: UserCheck,
  student: BookOpen,
  parent: Users,
  manager: School,
  admin: Settings2,
};

/** Per-role checked tint (border+bg+text) — overrides the segmented variant's
 *  default primary fill. Text uses AA-safe tokens on each tint. */
const ROLE_CHECKED: Record<InviteRoleOption, string> = {
  teacher:
    "data-[state=checked]:bg-primary/15 data-[state=checked]:text-edu-text-primary",
  student:
    "data-[state=checked]:bg-edu-warning/20 data-[state=checked]:text-edu-warning-text",
  parent:
    "data-[state=checked]:bg-edu-purple/15 data-[state=checked]:text-edu-text-primary",
  manager:
    "data-[state=checked]:bg-edu-success/15 data-[state=checked]:text-edu-success-text",
  admin:
    "data-[state=checked]:bg-edu-error/15 data-[state=checked]:text-edu-error-text",
};

export interface InvitationRoleRadioGroupProps {
  value: InviteRoleOption;
  options: { value: InviteRoleOption; label: string }[];
  groupLabel: string;
  onChange: (value: InviteRoleOption) => void;
}

/**
 * Role selector — reuses the shared `segmented` RadioGroup variant (US-E03.1,
 * the canonical pill-toggle radio) with a per-role checked tint. Radix keeps
 * `role="radiogroup"`/`radio` + arrow-key nav; each pill IS the control (no
 * extra label needed for a11y). `flex-wrap` lets the 5 pills wrap on mobile.
 */
export function InvitationRoleRadioGroup({
  value,
  options,
  groupLabel,
  onChange,
}: InvitationRoleRadioGroupProps) {
  return (
    <RadioGroup
      variant="segmented"
      value={value}
      onValueChange={(v) => onChange(v as InviteRoleOption)}
      aria-label={groupLabel}
      className="flex-wrap"
    >
      {options.map((opt) => {
        const Icon = ROLE_ICON[opt.value];
        return (
          <RadioGroupItem
            key={opt.value}
            variant="segmented"
            value={opt.value}
            className={cn("gap-1.5", ROLE_CHECKED[opt.value])}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {opt.label}
          </RadioGroupItem>
        );
      })}
    </RadioGroup>
  );
}
