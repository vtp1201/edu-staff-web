import type { Locale } from "next-intl";
import { redirect } from "@/bootstrap/i18n/routing";

/**
 * Locale root (`/{locale}`) has no landing screen of its own — the workspace
 * lives under `/{locale}/t/{tenantId}/...` (US-E05.1) and the entry point is
 * the auth flow. Redirect to login; the login → select-tenant → tenant chain
 * takes over from there.
 */
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: "/login", locale });
}
