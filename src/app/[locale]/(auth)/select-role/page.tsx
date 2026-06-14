import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getPendingRolesCookie } from "@/bootstrap/lib/auth-token.server";
import {
  appRoleOf,
  ROLE_ENUM_TO_APP,
} from "@/features/auth/domain/entities/role-meta";
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

  // Build a card per enum the user holds. The cookie carries appRoles; expand
  // back to the BE enums that map onto each appRole so the right icon/label/
  // tenant code shows. One enum per held appRole (the canonical enum).
  const heldAppRoles = new Set(pending.roles.map((r) => r.role));
  const cards: RoleCardVM[] = Object.entries(ROLE_ENUM_TO_APP)
    .filter(([enumKey, app]) => {
      // canonical enum = the first enum that maps to this appRole
      const canonical = Object.entries(ROLE_ENUM_TO_APP).find(
        ([, a]) => a === app,
      )?.[0];
      return heldAppRoles.has(app) && enumKey === canonical;
    })
    .map(([enumKey, app]) => {
      const tenant = pending.roles.find((r) => r.role === app);
      const presentation = ROLE_PRESENTATION[enumKey];
      return {
        roleEnum: enumKey,
        appRole: app,
        labelKey: presentation.labelKey,
        icon: presentation.icon,
        colorVar: presentation.colorVar,
        tenantId: tenant?.tenantId ?? "",
        tenantName: tenant?.tenantName ?? "",
        tenantCode: tenant?.tenantCode,
      } satisfies RoleCardVM;
    })
    .filter((c) => appRoleOf(c.roleEnum) !== null && c.tenantId !== "");

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
