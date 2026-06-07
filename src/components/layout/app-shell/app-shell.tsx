"use client";

import { useState } from "react";
import { useRouter } from "@/bootstrap/i18n/routing";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Header } from "./header/header";
import type { Role } from "./sidebar/nav-config";
import { Sidebar } from "./sidebar/sidebar";
import { useSidebarCollapsed } from "./sidebar/use-sidebar-collapsed";

type AppShellProps = {
  role: Role;
  userName?: string;
  children: React.ReactNode;
};

export function AppShell({
  role: initialRole,
  userName,
  children,
}: AppShellProps) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();

  // Switch workspace via client navigation — no full reload. The new role's
  // home is its base segment (`/teacher`, `/principal`, …); the layout below
  // re-renders the shell with the new nav.
  function handleRoleChange(next: Role) {
    if (next === role) return;
    setRole(next);
    setMobileOpen(false);
    router.push(`/${next}`);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar role={role} collapsed={collapsed} onToggle={toggle} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">EduPortal</SheetTitle>
          <Sidebar role={role} className="border-r-0" />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          role={role}
          userName={userName}
          onMenuClick={() => setMobileOpen(true)}
          onRoleChange={handleRoleChange}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
