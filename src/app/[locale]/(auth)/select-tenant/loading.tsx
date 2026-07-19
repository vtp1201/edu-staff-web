import { getTranslations } from "next-intl/server";
import { SelectTenantSkeleton } from "./select-tenant-skeleton";

/** Route-level Suspense fallback (Decision A): Next wraps `page.tsx` in this
 *  skeleton for the initial navigation, so the caller never sees a blank screen
 *  while the membership list resolves (NFR-003). */
export default async function SelectTenantLoading() {
  const t = await getTranslations("tenant.switch.postLogin");
  return <SelectTenantSkeleton loadingLabel={t("loadingLabel")} />;
}
