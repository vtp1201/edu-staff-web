"use client";

import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { FeedCommentEntity } from "../../../domain/entities/feed-comment.entity";
import { FeedMenu } from "./feed-menu";
import { feedRoleTone } from "./feed-role-tone";
import { formatAbsoluteTime, formatRelativeTime } from "./feed-time";

const TONE_TEXT: Record<string, string> = {
  primary: "text-primary",
  success: "text-edu-success-text",
  warning: "text-edu-warning-foreground",
  purple: "text-edu-purple",
};

export interface FeedCommentItemProps {
  comment: FeedCommentEntity;
  /** Report-only (§0.3) — true unless the viewer authored this comment. */
  canReport: boolean;
  onReport: () => void;
  /** Injectable clock for deterministic stories/tests. */
  now?: number;
}

/** A single comment row. Menu is report-ONLY (comments never pin/remove, §0.3). */
export function FeedCommentItem({
  comment,
  canReport,
  onReport,
  now,
}: FeedCommentItemProps) {
  const t = useTranslations("feed");
  const locale = useLocale();
  const tone = feedRoleTone(comment.authorRole);

  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="size-7">
        <AvatarFallback className={TONE_TEXT[tone]}>
          {comment.authorAvatarInitials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 rounded-[10px] bg-muted px-3 py-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-bold text-[12.5px] text-foreground">
            {comment.authorName}
          </span>
          <time
            dateTime={comment.createdAt}
            title={formatAbsoluteTime(comment.createdAt, locale)}
            className="text-[11px] text-edu-text-secondary"
          >
            {formatRelativeTime(comment.createdAt, locale, now)}
          </time>
        </div>
        <p className="mt-0.5 text-[13px] text-foreground leading-relaxed">
          {comment.content}
        </p>
      </div>
      <FeedMenu
        ariaLabel={t("menu.commentOptions", { author: comment.authorName })}
        canReport={canReport}
        onReport={onReport}
        reportLabel={t("menu.report")}
      />
    </div>
  );
}
