import { AppShell, type Role } from "@/components/layout/app-shell";

// TODO role-guard (separate story): derive role from the tenant-scoped token's
// `memberRoles` claim instead of hardcoding. Tenant scope itself is enforced in
// middleware (US-E05.1).
const HARDCODED_ROLE: Role = "teacher";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  return (
    <AppShell tenantId={tenant} role={HARDCODED_ROLE} userName="Nguyen Van A">
      {children}
    </AppShell>
  );
}
