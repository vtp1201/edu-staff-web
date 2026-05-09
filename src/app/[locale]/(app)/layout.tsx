import { AppShell, type Role } from "@/components/layout/app-shell";

// TODO Phase 1.5: replace hardcoded role bằng cookies().get('eduportal_role') + RoleGuard
const HARDCODED_ROLE: Role = "teacher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role={HARDCODED_ROLE} userName="Nguyen Van A">
      {children}
    </AppShell>
  );
}
