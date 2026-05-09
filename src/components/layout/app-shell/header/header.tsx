"use client";

import { Bell, LogOut, Menu, Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Role } from "../sidebar/nav-config";
import { RoleSwitcher } from "./role-switcher";

type HeaderProps = {
  role: Role;
  userName?: string;
  onMenuClick?: () => void;
  onRoleChange?: (role: Role) => void;
};

export function Header({
  role,
  userName = "User",
  onMenuClick,
  onRoleChange,
}: HeaderProps) {
  const t = useTranslations("shell.header");
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 sm:px-6"
      style={{ height: "var(--edu-header-height, 64px)" }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <RoleSwitcher currentRole={role} onChange={onRoleChange} />

        <Button
          variant="ghost"
          size="icon"
          aria-label={t("notifications")}
          className="relative"
        >
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-edu-error" />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="size-9 rounded-full p-0"
              aria-label="User menu"
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{userName}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              {t("profile")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="mr-2 size-4" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
