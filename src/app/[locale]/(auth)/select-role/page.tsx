import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getPendingRolesCookie } from "@/bootstrap/lib/auth-token.server";
import { ROLE_PRESENTATION } from "@/features/auth/presentation/role-select/role-meta.presentation";
import { RoleSelectContainer } from "@/features/auth/presentation/role-select/role-select";
import type { RoleCardVM } from "@/features/auth/presentation/role-select/role-select.i-vm";
import { backToLoginAction, selectRoleAction } from "./actions";

export default async function SelectRolePage() {
  const pending = await getPendingRolesCookie();
  if (!pending) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  // One card per (roleEnum, tenant) entry the user actually holds — the cookie
  // now carries the raw BE enum (ADR 0036), so a user with two enums collapsing
  // to one appRole, or the same appRole across tenants, gets a card each.
  const cards: RoleCardVM[] = pending.roles
    .map((r): RoleCardVM | null => {
      const presentation = ROLE_PRESENTATION[r.roleEnum];
      if (!presentation) return null; // unknown BE enum → skip defensively
      return {
        roleEnum: r.roleEnum,
        appRole: r.role,
        labelKey: presentation.labelKey,
        icon: presentation.icon,
        colorVar: presentation.colorVar,
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        tenantCode: r.tenantCode,
      };
    })
    .filter((c): c is RoleCardVM => c !== null);

  return (
    <RoleSelectContainer
      userName={pending.userName}
      roleCount={cards.length}
      cards={cards}
      onSelectRole={selectRoleAction}
      onBack={backToLoginAction}
    />
  );
}
