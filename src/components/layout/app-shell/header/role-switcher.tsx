"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/shared/utils";
import type { Role } from "../sidebar/nav-config";

const ROLE_DOT: Record<Role, string> = {
  teacher: "bg-edu-role-teacher",
  principal: "bg-edu-role-principal",
  student: "bg-edu-role-student",
  parent: "bg-edu-role-parent",
  // No dedicated --edu-role-admin token yet (would need an ADR). Admin is a
  // platform/system role → reuse the brand primary token meanwhile.
  admin: "bg-edu-primary",
};

type RoleSwitcherProps = {
  currentRole: Role;
  availableRoles?: Role[];
  onChange?: (role: Role) => void;
};

export function RoleSwitcher({
  currentRole,
  availableRoles = ["teacher", "principal", "student"],
  onChange,
}: RoleSwitcherProps) {
  const t = useTranslations("shell");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className={cn("size-2 rounded-full", ROLE_DOT[currentRole])} />
          <span className="hidden sm:inline">{t(`roles.${currentRole}`)}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t("header.switchRole")}
        </div>
        {availableRoles.map((role) => {
          const isCurrent = role === currentRole;
          return (
            <button
              type="button"
              key={role}
              onClick={() => {
                onChange?.(role);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[var(--edu-radius-btn)] px-2 py-2 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isCurrent && "bg-accent text-accent-foreground",
              )}
            >
              <span className={cn("size-2 rounded-full", ROLE_DOT[role])} />
              <span className="flex-1 text-left">{t(`roles.${role}`)}</span>
              {isCurrent ? <Check className="size-4" /> : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
