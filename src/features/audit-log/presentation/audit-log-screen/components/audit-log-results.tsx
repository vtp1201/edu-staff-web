"use client";

import type { AuditEvent } from "../../../domain/entities/audit-event.entity";
import type { AuditLogFailure } from "../../../domain/failures/audit-log.failure";
import { EmptyState } from "./empty-state";
import { ErrorBanner } from "./error-banner";
import { LoadingSkeletonRows } from "./loading-skeleton-rows";
import { LogTable } from "./log-table";

export type AuditLogResultsStatus = "loading" | "error" | "empty" | "success";

export interface AuditLogResultsProps {
  status: AuditLogResultsStatus;
  events: AuditEvent[];
  errorKey: AuditLogFailure["type"] | null;
  onRetry: () => void;
}

/**
 * Renders exactly one of loading / error / empty / success for the results
 * region (US-E12.12). No own state — driven by the container-derived status.
 */
export function AuditLogResults({
  status,
  events,
  errorKey,
  onRetry,
}: AuditLogResultsProps) {
  if (status === "loading") return <LoadingSkeletonRows />;
  if (status === "error") {
    return <ErrorBanner errorKey={errorKey ?? "unknown"} onRetry={onRetry} />;
  }
  if (status === "empty") return <EmptyState />;
  return <LogTable events={events} />;
}
