"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import type { CourseTone } from "@/features/lms/domain/entities/course.entity";
import { cn } from "@/shared/utils";
import { TONE_BG } from "../tone";

const SEEK_STEP = 5;

export interface VideoPlayerProps {
  title: string;
  durationLabel: string;
  tone: CourseTone;
  labels: {
    lectureLabel: string;
    playAriaLabel: string;
    pauseAriaLabel: string;
    seekAriaLabel: string;
    playingAnnounce: string;
    pausedAnnounce: string;
  };
}

/**
 * Faux-chrome video player — no real `<video>` element (mock-first, no media
 * files). `isPlaying`/`seekPct` are pure component-local UI state. Keyboard:
 * Space toggles play/pause when the play button is focused; Left/Right adjust
 * the seek slider. A visually-hidden aria-live region announces state changes.
 */
export function VideoPlayer({
  title,
  durationLabel,
  tone,
  labels,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekPct, setSeekPct] = useState(0);
  // Gate the aria-live announcement so it stays silent until the user actually
  // toggles — otherwise SR reads "paused" on initial mount (nothing changed).
  const [hasToggled, setHasToggled] = useState(false);

  const toggle = () => {
    setHasToggled(true);
    setIsPlaying((p) => !p);
  };
  const PlayIcon = isPlaying ? Pause : Play;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-edu-media-surface">
      <div
        className={cn("absolute inset-0 opacity-20", TONE_BG[tone])}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <button
          type="button"
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === " " || e.code === "Space") {
              e.preventDefault();
              toggle();
            }
          }}
          aria-label={isPlaying ? labels.pauseAriaLabel : labels.playAriaLabel}
          className="flex size-16 items-center justify-center rounded-full border-2 border-edu-media-surface-foreground/30 bg-edu-media-surface-foreground/20 text-edu-media-surface-foreground backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-edu-media-surface-foreground"
        >
          <PlayIcon className="size-6" strokeWidth={2.2} aria-hidden="true" />
        </button>
        <p className="font-semibold text-edu-media-surface-foreground/75 text-xs">
          {labels.lectureLabel} · {durationLabel}
        </p>
      </div>

      {/* Faux player chrome */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-edu-media-surface/55 to-transparent px-4 py-3.5">
        <div
          role="slider"
          tabIndex={0}
          aria-label={labels.seekAriaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={seekPct}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              setSeekPct((v) => Math.min(100, v + SEEK_STEP));
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              setSeekPct((v) => Math.max(0, v - SEEK_STEP));
            }
          }}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-edu-media-surface-foreground/20 outline-none focus-visible:ring-2 focus-visible:ring-edu-media-surface-foreground"
        >
          <div
            className={cn("h-full rounded-full", TONE_BG[tone])}
            style={{ width: `${seekPct}%` }}
          />
        </div>
        <span className="font-bold text-edu-media-surface-foreground/75 text-[11px] tabular-nums">
          {durationLabel}
        </span>
      </div>

      <span className="sr-only" aria-live="polite">
        {hasToggled
          ? isPlaying
            ? labels.playingAnnounce
            : labels.pausedAnnounce
          : ""}
      </span>
      <span className="sr-only">{title}</span>
    </div>
  );
}
