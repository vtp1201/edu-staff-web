"use client";

import { Globe, MessageSquare, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/shared/utils";
import type { FeedPostEntity } from "../../../domain/entities/feed-post.entity";
import type { ReactionType } from "../../../domain/entities/reaction.entity";
import type { MenuVisibility } from "../../../domain/policies/menu-visibility";
import { FeedComments, type FeedCommentsProps } from "./feed-comments";
import { FeedImageGrid } from "./feed-image-grid";
import { FeedMenu } from "./feed-menu";
import { FeedPinBadge } from "./feed-pin-badge";
import { FeedReactionBar } from "./feed-reaction-bar";
import { feedRoleTone } from "./feed-role-tone";
import { formatAbsoluteTime, formatRelativeTime } from "./feed-time";

const TONE_TEXT: Record<string, string> = {
  primary: "text-primary",
  success: "text-edu-success-text",
  warning: "text-edu-warning-foreground",
  purple: "text-edu-purple",
};

const LONG_TEXT = 320;

export interface FeedPostCardProps {
  post: FeedPostEntity;
  menuVisibility: MenuVisibility;
  reactionLabels: Record<ReactionType, string>;
  onReact: (reactionType: ReactionType) => void;
  onTogglePin: () => void;
  onReport: () => void;
  onRemove: () => void;
  reactionDisabled?: boolean;
  commentsProps: Omit<FeedCommentsProps, "postId">;
  now?: number;
}

export function FeedPostCard({
  post,
  menuVisibility,
  reactionLabels,
  onReact,
  onTogglePin,
  onReport,
  onRemove,
  reactionDisabled,
  commentsProps,
  now,
}: FeedPostCardProps) {
  const t = useTranslations("feed");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const bodyId = useId();

  const tone = feedRoleTone(post.authorRole);
  const long = post.content.length > LONG_TEXT;
  const scopeLabel =
    post.scope === "school"
      ? t("post.wholeSchool")
      : t("post.inClass", { className: post.classId ?? "" });

  return (
    <article
      className={cn(
        "rounded-[var(--edu-radius-card)] border bg-card p-5",
        post.pinned ? "border-primary/30" : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarFallback className={TONE_TEXT[tone]}>
            {post.authorAvatarInitials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[13.5px] text-foreground">
              {post.authorName}
            </span>
            <StatusBadge tone={tone}>
              {t(`roles.${post.authorRole}`)}
            </StatusBadge>
            {post.pinned && (
              <FeedPinBadge
                label={t("pin.badge")}
                notPersistedLabel={t("pin.notPersisted")}
              />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-edu-text-secondary">
            <time
              dateTime={post.createdAt}
              title={formatAbsoluteTime(post.createdAt, locale)}
            >
              {formatRelativeTime(post.createdAt, locale, now)}
            </time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {post.scope === "school" ? (
                <Globe aria-hidden="true" className="size-3" />
              ) : (
                <Users aria-hidden="true" className="size-3" />
              )}
              {scopeLabel}
            </span>
          </div>
        </div>
        <FeedMenu
          ariaLabel={t("menu.postOptions", { author: post.authorName })}
          canReport={menuVisibility.canReport}
          onReport={onReport}
          reportLabel={t("menu.report")}
          pin={
            menuVisibility.canPin
              ? {
                  pinned: post.pinned,
                  label: post.pinned ? t("menu.unpin") : t("menu.pin"),
                  onToggle: onTogglePin,
                }
              : undefined
          }
          remove={
            menuVisibility.canRemove
              ? { label: t("menu.remove"), onRemove }
              : undefined
          }
        />
      </div>

      {/* Body */}
      <div className="mt-3">
        <p
          id={bodyId}
          className={cn(
            "whitespace-pre-line text-[13.5px] text-foreground leading-relaxed",
            long && !expanded && "line-clamp-5",
          )}
        >
          {post.content}
        </p>
        {long && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 font-bold text-[12.5px] text-primary"
          >
            {expanded ? t("post.showLess") : t("post.seeMore")}
          </button>
        )}
        <FeedImageGrid images={post.attachments} />
      </div>

      {/* Footer */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <FeedReactionBar
          reactions={post.reactions}
          reactionLabels={reactionLabels}
          ariaLabel={(label, count) =>
            t("reactions.ariaLabel", { reaction: label, count })
          }
          addReactionAriaLabel={t("reactions.add")}
          onReact={onReact}
          disabled={reactionDisabled}
        />
        <button
          type="button"
          aria-expanded={showComments}
          onClick={() => setShowComments((s) => !s)}
          aria-label={t("post.toggleComments", { author: post.authorName })}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold text-[12.5px]",
            showComments
              ? "bg-primary/12 text-primary"
              : "text-edu-text-secondary hover:bg-muted",
          )}
        >
          <MessageSquare aria-hidden="true" className="size-3.5" />
          {t("post.comments")}
          {post.commentCount > 0 ? ` · ${post.commentCount}` : ""}
        </button>
      </div>

      {showComments && (
        <FeedComments
          postId={post.postId}
          {...commentsProps}
          onPostGone={() => {
            setShowComments(false);
            commentsProps.onPostGone();
          }}
          now={now}
        />
      )}
    </article>
  );
}
