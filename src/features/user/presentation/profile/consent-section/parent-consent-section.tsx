"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Lock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ChildConsentCard } from "./child-consent-card";
import { ConsentError } from "./consent-error";
import { ConsentSkeleton } from "./consent-skeleton";
import { PARENT_CONSENT_QUERY_KEY } from "./parent-consent.query-keys";
import type {
  ParentConsentFetchResult,
  ParentConsentToggleResult,
  UpdateConsentInput,
} from "./parent-consent-section.i-vm";

export interface ParentConsentSectionProps {
  onFetch: () => Promise<ParentConsentFetchResult>;
  onToggle: (input: UpdateConsentInput) => Promise<ParentConsentToggleResult>;
}

/**
 * Parent notification-consent section (US-E20.2), mounted in the Profile
 * identity column below `AccountRequestsCard` — parent role only (gated by the
 * VM/props one level up). Owns the section `useQuery` (no `initialData` — RSC
 * never awaits this, NFR-005) and dispatches loading/empty/error/success. Per-
 * toggle mutations live in `ChildConsentCard`.
 */
export function ParentConsentSection({
  onFetch,
  onToggle,
}: ParentConsentSectionProps) {
  const t = useTranslations("parentLinks.consentSection");

  const query = useQuery({
    queryKey: PARENT_CONSENT_QUERY_KEY,
    queryFn: async () => {
      const result = await onFetch();
      if (!result.success) throw new Error(result.errorKey);
      return result.children;
    },
    retry: false,
  });

  // Show the skeleton on the first load AND during a retry from the error state
  // (AC-003.3 "transitions through loading"): after an error, `status` stays
  // `"error"` while `refetch()` runs, so gate the error UI on !isFetching.
  const showLoading = query.isPending || (query.isError && query.isFetching);
  const showError = query.isError && !query.isFetching;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Bell className="size-[18px]" />
          </span>
          <h2 className="text-[15px] font-extrabold text-foreground">
            {t("title")}
          </h2>
        </div>

        {showLoading && (
          <ConsentSkeleton loadingAriaLabel={t("loadingAriaLabel")} />
        )}

        {showError && (
          <ConsentError
            title={t("error.title")}
            description={t("error.body")}
            retryLabel={t("error.retry")}
            onRetry={() => query.refetch()}
          />
        )}

        {query.isSuccess && query.data.length === 0 && (
          <EmptyState
            icon={Users}
            title={t("empty.title")}
            body={t("empty.body")}
          />
        )}

        {query.isSuccess && query.data.length > 0 && (
          <>
            <div className="space-y-4">
              {query.data.map((child) => (
                <ChildConsentCard
                  key={child.studentId}
                  child={child}
                  onToggle={onToggle}
                />
              ))}
            </div>
            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-edu-text-muted">
              <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              <span>{t("footnote")}</span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
