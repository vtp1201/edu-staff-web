"use client";

import { ExternalLink, Link as LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActiveItemVm } from "./course-player.i-vm";
import { embedSourceFor } from "./embed-source";
import { hostOf, isSafeHref } from "./safe-href";

export interface BodyDocumentProps {
  item: Extract<ActiveItemVm, { kind: "document" }>;
}

/**
 * A DOCUMENT: an outbound link plus, when the origin is allowlisted, an
 * embedded preview.
 *
 * The anchor carries `rel="noopener noreferrer"` — the target is a foreign
 * origin chosen by whoever authored the item, so it must never get a handle on
 * `window.opener` nor our URL as a referrer.
 *
 * A `url` that is not http(s) (`javascript:`, `data:`, free text) is treated as
 * NO url at all — same branch as a missing one — rather than rendered as an
 * anchor and left to React to neutralise (`safe-href.ts`).
 */
export function BodyDocument({ item }: BodyDocumentProps) {
  const t = useTranslations("courses.player");
  const url = item.url !== null && isSafeHref(item.url) ? item.url : null;
  const embed = url === null ? null : embedSourceFor(url);
  const host = url === null ? null : hostOf(url);

  return (
    <div className="flex flex-col gap-3.5 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-[11px] bg-edu-teal/15"
        >
          <LinkIcon className="size-5 text-edu-teal-text" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="font-extrabold text-foreground text-sm">{item.title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {host === null
              ? t("document.externalLabel")
              : `${t("document.externalLabel")} · ${host}`}
          </p>
        </div>
        {url !== null && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-edu-teal/55 bg-edu-teal-light px-3.5 py-2 font-bold text-edu-teal-text text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <ExternalLink
              className="size-3.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {t("document.open")}
          </a>
        )}
      </div>

      {item.description !== null && (
        <p className="text-edu-text-secondary text-sm leading-relaxed">
          {item.description}
        </p>
      )}

      {url === null ? (
        <p className="text-edu-text-secondary text-sm">
          {t("document.noLink")}
        </p>
      ) : (
        <section className="rounded-[10px] border border-border bg-edu-bg">
          <h2 className="px-4 pt-3.5 font-extrabold text-[11px] text-muted-foreground uppercase tracking-[0.07em]">
            {t("document.previewLabel")}
          </h2>
          {embed ? (
            <div className="p-3">
              <iframe
                src={embed.embedUrl}
                title={t("document.previewTitle", { title: item.title })}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="no-referrer"
                allowFullScreen
                className="aspect-video w-full rounded-lg border-0 bg-edu-media-surface"
              />
            </div>
          ) : (
            <p className="px-4 py-3.5 text-edu-text-secondary text-sm leading-relaxed">
              {t("document.noPreview")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
