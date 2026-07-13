"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge/status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { ReportDetailEntity } from "../../../domain/entities/report-detail.entity";
import type { ModerationFailure } from "../../../domain/failures/moderation.failure";
import { DuplicateReportList } from "./duplicate-report-list";
import { formatReportTimestamp } from "./format-report-row";
import { ReportErrorBanner } from "./report-error-banner";
import { ReportStatusBadge } from "./report-status-badge";

export type DetailSheetStatus =
  | "loading"
  | "error-not-found"
  | "error-transient"
  | "success";

export interface ReportDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: DetailSheetStatus;
  detail: ReportDetailEntity | null;
  viewerRole: UserRole;
  onDismiss: () => void;
  dismissPending: boolean;
  dismissErrorKey: ModerationFailure["type"] | null;
  onRemove: () => void;
  onRetry: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-bold text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ReportDetailSheet({
  open,
  onOpenChange,
  status,
  detail,
  viewerRole,
  onDismiss,
  dismissPending,
  dismissErrorKey,
  onRemove,
  onRetry,
}: ReportDetailSheetProps) {
  const t = useTranslations("moderation");
  const tDetail = useTranslations("moderation.detail");
  const tReason = useTranslations("moderation.reportDialog.reasons");
  const tErrors = useTranslations("moderation.errors");

  // No-stale-render rule (AC-1925.4): content sections render ONLY on success.
  const showContent = status === "success" && detail !== null;
  const isPending = showContent && detail.status === "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[440px]"
      >
        <SheetHeader className="border-border border-b">
          <SheetTitle>{tDetail("title")}</SheetTitle>
          <SheetDescription className="sr-only">
            {tDetail("contentSection")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {status === "loading" && (
            <output aria-busy="true" className="flex flex-col gap-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
            </output>
          )}

          {status === "error-not-found" && (
            <ReportErrorBanner
              title={t("errorTitle")}
              message={tErrors("not-found")}
              showRetry={false}
            />
          )}

          {status === "error-transient" && (
            <ReportErrorBanner
              title={t("errorTitle")}
              message={tErrors("network-error")}
              showRetry
              retryLabel={t("retry")}
              onRetry={onRetry}
            />
          )}

          {showContent && (
            <>
              <div className="flex items-center gap-2">
                <ReportStatusBadge status={detail.status} />
                <StatusBadge tone="muted">{tReason(detail.reason)}</StatusBadge>
              </div>

              <Section title={tDetail("contentSection")}>
                <p className="font-medium text-foreground text-sm">
                  {detail.authorName}
                </p>
                <p className="whitespace-pre-wrap text-edu-text-secondary text-sm">
                  {detail.fullContent}
                </p>
              </Section>

              {detail.context.length > 0 && (
                <Section title={tDetail("contextSection")}>
                  <ul className="flex flex-col gap-1.5">
                    {detail.context.map((c) => (
                      <li
                        key={`${c.authorName}:${c.text}`}
                        className={
                          c.highlighted
                            ? "rounded-[var(--edu-radius-btn)] border border-edu-warning/40 bg-edu-warning/10 px-3 py-2 text-sm"
                            : "rounded-[var(--edu-radius-btn)] bg-muted/50 px-3 py-2 text-sm"
                        }
                      >
                        <span className="font-medium text-foreground">
                          {c.authorName}:{" "}
                        </span>
                        <span className="text-edu-text-secondary">
                          {c.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title={tDetail("reportSection")}>
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {tDetail("reporter")}:{" "}
                  </span>
                  <span className="text-foreground">{detail.reporterName}</span>
                </p>
                {detail.note && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">
                      {tDetail("note")}:{" "}
                    </span>
                    <span className="text-foreground">{detail.note}</span>
                  </p>
                )}
              </Section>

              <DuplicateReportList duplicates={detail.duplicateReports} />

              {detail.status !== "pending" && (
                <Section title={tDetail("resolveSection")}>
                  {detail.resolvedBy && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        {tDetail("resolvedBy")}:{" "}
                      </span>
                      <span className="text-foreground">
                        {detail.resolvedBy}
                      </span>
                    </p>
                  )}
                  {detail.resolvedAt && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        {tDetail("resolvedAt")}:{" "}
                      </span>
                      <span className="text-foreground">
                        {formatReportTimestamp(detail.resolvedAt)}
                      </span>
                    </p>
                  )}
                  {detail.resolveNote && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">
                        {tDetail("resolveNote")}:{" "}
                      </span>
                      <span className="text-foreground">
                        {detail.resolveNote}
                      </span>
                    </p>
                  )}
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer actions render ONLY for a pending report (AC-1925.2/1926.3). */}
        {isPending && (
          <div className="flex flex-col gap-2 border-border border-t bg-muted/50 p-4">
            {dismissErrorKey && (
              <p role="alert" className="text-edu-error-text text-sm">
                {tErrors(dismissErrorKey)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDismiss}
                disabled={dismissPending}
                aria-busy={dismissPending}
              >
                {tDetail("dismiss")}
              </Button>
              {/* Remove entry point — principal ONLY (AC-1928.1 defense-in-depth).
                  Also feeds-only: INT-191-05 removes posts/comments, not messages. */}
              {viewerRole === "principal" && detail.kind !== "message" && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onRemove}
                >
                  {tDetail("remove")}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
