"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Workspace-wide error boundary: any RSC data-fetch failure inside the tenant
 * app shell (real-BE 403/5xx/network) renders a friendly retry state instead
 * of crashing to Next's generic error screen. `reset()` re-renders the segment
 * (re-runs the RSC fetch).
 */
export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("shell.error");

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span
        aria-hidden="true"
        className="grid size-15 place-items-center rounded-[var(--edu-radius-role-icon)] bg-edu-error/15 text-edu-error-text"
      >
        <RotateCw className="size-7" strokeWidth={1.5} />
      </span>
      <div role="alert">
        <h1 className="mb-1 text-lg font-extrabold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button onClick={reset}>
        <RotateCw className="size-4" aria-hidden="true" />
        {t("retry")}
      </Button>
    </main>
  );
}
