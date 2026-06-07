import { getTranslations } from "next-intl/server";

/**
 * Guarded tenant workspace home (US-E05.1). Reachable only when the active
 * token's `tenantId` claim matches `[tenant]` (enforced in middleware) — a
 * cross-tenant URL is redirected to `/select-tenant`. The role dashboards move
 * under this segment in a follow-up (route-move); for now this confirms the
 * tenant context is live.
 */
export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const t = await getTranslations("tenant.home");

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("body")}</p>
      <p className="mt-4 font-mono text-xs text-muted-foreground">{tenant}</p>
    </div>
  );
}
