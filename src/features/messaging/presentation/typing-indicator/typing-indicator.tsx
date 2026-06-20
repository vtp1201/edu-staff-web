"use client";

import { useTranslations } from "next-intl";
import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";

export interface TypingIndicatorProps {
  initials: string;
  color: string;
}

/**
 * DR-009 US-E16.5 — typing dots. Per-dot stagger drives the `msg-typing`
 * keyframe (smooth ease-in-out lift, defined in globals.css), replacing
 * Tailwind's springy default. Reduced-motion is handled by the global reset.
 */
export const TYPING_DOT_CLASS =
  "msg-typing-dot size-1.5 rounded-full bg-muted-foreground/60";
export const TYPING_DOT_DELAYS = [0, 0.18, 0.36] as const;

/** 3-dot typing animation. Motion is gated behind prefers-reduced-motion. */
export function TypingIndicator({ initials, color }: TypingIndicatorProps) {
  const t = useTranslations("messaging");
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="sr-only">{t("chat.typing")}</span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          avatarToneClasses(color),
        )}
      >
        {initials}
      </span>
      <span
        aria-hidden="true"
        className="flex items-center gap-1 rounded-[16px_16px_16px_4px] border border-border bg-card px-3.5 py-2"
      >
        {TYPING_DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            className={TYPING_DOT_CLASS}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </span>
    </div>
  );
}
