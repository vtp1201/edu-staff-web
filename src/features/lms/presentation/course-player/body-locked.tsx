"use client";

import { Lock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ActiveItemVm } from "./course-player.i-vm";

export interface BodyLockedProps {
  item: Extract<ActiveItemVm, { kind: "locked" }>;
}

/**
 * An item BE has not released yet. On a student read this is only ever an EXAM
 * (D7) — every other type is simply absent from the response until it opens.
 *
 * The opening time is VISIBLE text, never a hover tooltip, and `null` is a real
 * case (BE may hide an item with no announced release time) with its own copy
 * rather than an empty sentence.
 */
export function BodyLocked({ item }: BodyLockedProps) {
  const t = useTranslations("courses.player");
  const format = useFormatter();

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center sm:px-5">
      <span
        aria-hidden="true"
        className="flex size-15 items-center justify-center rounded-2xl bg-edu-info-light"
      >
        <Lock className="size-6 text-foreground" strokeWidth={1.9} />
      </span>
      <h2 className="font-extrabold text-foreground text-sm">{item.title}</h2>
      <p className="text-edu-text-secondary text-xs">
        {item.opensAt === null
          ? t("locked.opensAtUnknown")
          : t("locked.opensAt", {
              date: format.dateTime(new Date(item.opensAt), {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
      </p>
    </div>
  );
}
