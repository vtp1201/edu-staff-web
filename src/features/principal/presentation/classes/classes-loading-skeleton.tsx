"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLUMN_COUNT = 5;

export interface ClassesLoadingSkeletonProps {
  variant: "table" | "card";
  rowCount?: number;
  columnLabels?: {
    name: string;
    gradeLevel: string;
    homeroom: string;
    studentCount: string;
    status: string;
  };
}

/**
 * Initial-fetch skeleton. Table variant mirrors
 * `principal-teachers-screen.tsx`'s `LoadingRows()` (`aria-busy` container);
 * card variant is the mobile stacked equivalent. The sr-only `role="status"`
 * announcement is owned by the SCREEN, not by this component — both breakpoint
 * variants mount at once, so a live region here would announce twice.
 */
export function ClassesLoadingSkeleton({
  variant,
  rowCount = 4,
  columnLabels,
}: ClassesLoadingSkeletonProps) {
  const rows = Array.from({ length: rowCount });

  if (variant === "card") {
    return (
      <div
        aria-busy={true}
        className="flex flex-col gap-3"
        data-testid="classes-skeleton-card"
      >
        {rows.map((_, i) => (
          <div
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card"
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            key={`classes-card-skeleton-${i}`}
          >
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-busy={true}
      className="overflow-hidden rounded-card border border-border bg-card shadow-card"
      data-testid="classes-skeleton-table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columnLabels?.name}</TableHead>
            <TableHead>{columnLabels?.gradeLevel}</TableHead>
            <TableHead>{columnLabels?.homeroom}</TableHead>
            <TableHead className="text-right">
              {columnLabels?.studentCount}
            </TableHead>
            <TableHead>{columnLabels?.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody aria-hidden="true">
          {rows.map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            <TableRow key={`classes-row-skeleton-${i}`}>
              {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
                <TableCell key={`classes-cell-skeleton-${j}`}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
