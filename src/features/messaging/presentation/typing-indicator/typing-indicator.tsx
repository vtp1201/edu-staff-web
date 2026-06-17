"use client";

import { avatarToneClasses } from "@/features/messaging/presentation/avatar-tone";
import { cn } from "@/shared/utils";

export interface TypingIndicatorProps {
  initials: string;
  color: string;
}

/** 3-dot typing animation. Motion is gated behind prefers-reduced-motion. */
export function TypingIndicator({ initials, color }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 py-1" aria-hidden="true">
      <span
        className={cn(
          "flex size-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          avatarToneClasses(color),
        )}
      >
        {initials}
      </span>
      <span className="flex items-center gap-1 rounded-[16px_16px_16px_4px] border border-border bg-card px-3.5 py-2">
        {[0, 0.15, 0.3].map((delay) => (
          <span
            key={delay}
            className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </span>
    </div>
  );
}
