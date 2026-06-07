import { getTranslations } from "next-intl/server";
import { makeListMyMembershipsUseCase } from "@/bootstrap/di/tenant.di";
import { switchTenantAction } from "./actions";
import { SelectTenant } from "./select-tenant";

export default async function SelectTenantPage() {
  const t = await getTranslations("tenant.select");
  const memberships = await (await makeListMyMembershipsUseCase()).execute();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-100">
        <h1 className="mb-1 text-2xl font-extrabold text-foreground">
          {t("title")}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("subtitle")}</p>
        <SelectTenant memberships={memberships} onSelect={switchTenantAction} />
      </div>
    </div>
  );
}
