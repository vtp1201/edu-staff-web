"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/utils";
import type { GradeApprovalBatchDetail } from "../../../domain/entities/grade-approval-batch.entity";
import { getScoreColorClass } from "../../grade-entry-screen/score-color";
import { BatchStatusBadge } from "./batch-status-badge";
import { GradeDistributionChart } from "./grade-distribution-chart";

const SCALE_MAX = 10;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: GradeApprovalBatchDetail | null;
  isLoading: boolean;
  isApproving: boolean;
  isRequestingRevision: boolean;
  onApprove: () => void;
  onRequestRevision: () => void;
};

export function BatchReviewSheet({
  open,
  onOpenChange,
  detail,
  isLoading,
  isApproving,
  isRequestingRevision,
  onApprove,
  onRequestRevision,
}: Props) {
  const t = useTranslations("gradeApproval");
  const tSheet = useTranslations("gradeApproval.detailSheet");

  const canAct = detail?.status === "PENDING_APPROVAL";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{tSheet("title")}</SheetTitle>
          <SheetDescription>
            {detail
              ? `${detail.subjectName} · ${detail.className} · ${detail.term}`
              : t("loading")}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !detail ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2
              className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-label={t("loading")}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-5 px-4">
            <div className="flex items-center justify-between">
              <BatchStatusBadge status={detail.status} />
              <span className="text-sm text-muted-foreground">
                {tSheet("averageScore")}:{" "}
                <span
                  className={cn(
                    "font-bold",
                    getScoreColorClass(detail.averageScore, SCALE_MAX),
                  )}
                >
                  {detail.averageScore ?? "—"}
                </span>
              </span>
            </div>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {tSheet("distribution")}
              </h3>
              <GradeDistributionChart distribution={detail.distribution} />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {tSheet("previewTable")}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tSheet("colStudent")}</TableHead>
                    <TableHead>{tSheet("colCode")}</TableHead>
                    <TableHead className="text-right">
                      {tSheet("colAverage")}
                    </TableHead>
                    <TableHead className="text-right">
                      {tSheet("colGradeLabel")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.previewRows.map((row) => (
                    <TableRow key={row.studentCode}>
                      <TableCell>{row.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.studentCode}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          getScoreColorClass(row.average, SCALE_MAX),
                        )}
                      >
                        {row.average ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.gradeLabel}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </div>
        )}

        {canAct ? (
          <SheetFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onRequestRevision}
              disabled={isApproving || isRequestingRevision}
            >
              {t("actionRequestRevision")}
            </Button>
            <Button
              type="button"
              onClick={onApprove}
              disabled={isApproving || isRequestingRevision}
            >
              {t("actionApprove")}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
