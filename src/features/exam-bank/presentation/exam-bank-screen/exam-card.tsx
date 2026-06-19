"use client";

import { FileText, MoreVertical, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExamCardVM } from "./exam-bank-screen.i-vm";

type ExamCardProps = {
  exam: ExamCardVM;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ExamCard({ exam, onPublish, onDelete }: ExamCardProps) {
  const t = useTranslations("examBank");
  const hasMenu = exam.canEdit || exam.canDelete || exam.canPublish;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--edu-radius-card)] border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-bold text-card-foreground text-sm">
          {exam.title}
        </h3>

        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 min-h-11 min-w-11 shrink-0"
                aria-label={t("card.menuAriaLabel")}
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exam.canEdit && (
                <DropdownMenuItem asChild>
                  <Link href={exam.editPath}>
                    <Pencil className="size-4" aria-hidden="true" />
                    {t("card.edit")}
                  </Link>
                </DropdownMenuItem>
              )}
              {exam.canPublish && (
                <DropdownMenuItem onSelect={() => onPublish(exam.id)}>
                  <Send className="size-4" aria-hidden="true" />
                  {t("card.publish")}
                </DropdownMenuItem>
              )}
              {exam.canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(exam.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("card.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{exam.subjectName}</Badge>
        <StatusBadge tone={exam.status === "published" ? "success" : "warning"}>
          {t(`status.${exam.status}`)}
        </StatusBadge>
      </div>

      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <FileText className="size-3.5" aria-hidden="true" />
        <span>{t("card.questionCount", { count: exam.totalQuestions })}</span>
      </div>

      <time
        dateTime={exam.createdAtDisplay}
        className="text-muted-foreground text-xs"
      >
        {t("card.createdAt", { date: exam.createdAtDisplay })}
      </time>
    </div>
  );
}
