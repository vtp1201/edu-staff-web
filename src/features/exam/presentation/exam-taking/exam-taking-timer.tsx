"use client";

import { Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/shared/utils";

const ANNOUNCE_AT = [600, 300, 120, 60];

export function colorClass(remainingSec: number): string {
  if (remainingSec > 600) return "text-edu-success-text";
  if (remainingSec > 300) return "text-edu-warning-foreground";
  return "text-edu-error-text";
}

function format(remainingSec: number): string {
  const safe = Math.max(0, remainingSec);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export interface ExamTakingTimerProps {
  /** Deterministic start time (ms). */
  startedAt: number;
  durationMinutes: number;
  onExpire: () => void;
  /** Inject a clock for tests; defaults to Date.now. */
  now?: () => number;
}

export function ExamTakingTimer({
  startedAt,
  durationMinutes,
  onExpire,
  now = Date.now,
}: ExamTakingTimerProps) {
  const t = useTranslations("exam");
  const endsAt = startedAt + durationMinutes * 60 * 1000;

  const [remaining, setRemaining] = useState(() =>
    Math.round((endsAt - now()) / 1000),
  );
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const tick = () => Math.round((endsAt - now()) / 1000);
    if (tick() <= 0) {
      onExpire();
      return;
    }
    const id = setInterval(() => {
      const next = tick();
      setRemaining(next);
      if (ANNOUNCE_AT.includes(next)) {
        setAnnouncement(t("taking.timerAnnounce", { time: format(next) }));
      }
      if (next <= 0) {
        clearInterval(id);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
    // endsAt/onExpire/now are stable for the lifetime of a mounted exam.
  }, [endsAt, onExpire, now, t]);

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-bold tabular-nums",
          colorClass(remaining),
        )}
      >
        <Timer className="size-4" aria-hidden="true" />
        <span>{format(remaining)}</span>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
