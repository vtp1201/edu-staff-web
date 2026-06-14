"use client";

import { useTranslations } from "next-intl";

const ADMIN_EMAIL = "admin@school.edu.vn";

/**
 * Account Requests card (left sidebar). Purely informational — deactivation /
 * deletion is an admin-only operation, so the only affordance is a mailto link.
 * No write API call (AC-5).
 */
export function AccountRequestsCard() {
  const t = useTranslations("profile.accountRequests");
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <h2 className="font-bold text-[12px] uppercase tracking-wider text-muted-foreground">
        {t("title")}
      </h2>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        {t("description")}
      </p>
      <a
        href={`mailto:${ADMIN_EMAIL}`}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-4 font-bold text-[12px] text-edu-text-secondary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        {t("contact")}
      </a>
    </div>
  );
}
