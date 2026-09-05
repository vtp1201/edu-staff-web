"use client";

import { useTranslations } from "next-intl";
import { TextContent } from "../course-timeline/text-content";
import type { ActiveItemVm } from "./course-player.i-vm";
import { embedSourceFor } from "./embed-source";
import { extractFirstUrl } from "./extract-first-url";

export interface BodyLessonProps {
  item: Extract<ActiveItemVm, { kind: "lesson" }>;
}

/**
 * A LESSON: plain-text body, optionally preceded by an embedded player (D4).
 *
 * The video frame is NOT the default state — BE stores lesson content as text,
 * so a 16:9 letterbox only appears when the body actually mentions a link that
 * survives `embedSourceFor`'s allowlist. Anything else (no link, a link to a
 * non-allowlisted origin, an unparseable one) falls back to text alone rather
 * than to a broken player.
 */
export function BodyLesson({ item }: BodyLessonProps) {
  const t = useTranslations("courses.player");
  const embed = embedSourceFor(extractFirstUrl(item.content) ?? "");

  return (
    <div>
      {embed && (
        <div className="aspect-video w-full bg-edu-media-surface">
          <iframe
            // Every attribute below is a fixed literal — only `src` varies, and
            // it is the rewritten URL from the allowlist, never raw input.
            src={embed.embedUrl}
            title={t("lesson.videoTitle", { title: item.title })}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="no-referrer"
            allowFullScreen
            className="size-full border-0"
          />
        </div>
      )}
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <h2 className="font-extrabold text-[11px] text-muted-foreground uppercase tracking-[0.07em]">
          {t("lesson.contentLabel")}
        </h2>
        {item.content.trim() === "" ? (
          <p className="text-edu-text-secondary text-sm">{t("lesson.empty")}</p>
        ) : (
          <TextContent content={item.content} />
        )}
      </div>
    </div>
  );
}
