import { getTranslations } from "next-intl/server";

/** Route-level Suspense fallback (Decision A): Next wraps `page.tsx` in this
 *  skeleton for the initial navigation, so the caller never sees a blank screen
 *  while the membership list resolves (NFR-003). Purely decorative shimmer
 *  (`aria-hidden`) + one sr-only aria-live status for screen readers. */
export default async function SelectTenantLoading() {
  const t = await getTranslations("tenant.switch.postLogin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <output aria-live="polite" className="sr-only">
        {t("loadingLabel")}
      </output>
      <div aria-hidden="true" className="w-full max-w-120">
        <div className="mb-8 flex flex-col items-center">
          <span className="mb-4 size-15 rounded-[var(--edu-radius-role-icon)] bg-muted motion-safe:animate-pulse" />
          <span className="mb-2 h-6 w-56 rounded-md bg-muted motion-safe:animate-pulse" />
          <span className="h-4 w-72 rounded-md bg-muted motion-safe:animate-pulse" />
        </div>

        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex min-h-20 items-center gap-3.5 rounded-[var(--edu-radius-card)] border border-border bg-card px-4 py-3"
            >
              <span className="size-14 shrink-0 rounded-[var(--edu-radius-role-icon)] bg-muted motion-safe:animate-pulse" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="h-4 w-1/2 rounded bg-muted motion-safe:animate-pulse" />
                <span className="h-3 w-3/4 rounded bg-muted motion-safe:animate-pulse" />
                <span className="h-5 w-20 rounded-full bg-muted motion-safe:animate-pulse" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
