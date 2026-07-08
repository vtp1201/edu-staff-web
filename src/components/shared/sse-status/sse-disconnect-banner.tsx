"use client";

import { Loader2, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SseStatus } from "@/bootstrap/realtime/use-realtime-events";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

export interface SseDisconnectBannerProps {
  /**
   * `undefined` (or omit) → render nothing. The caller (AppShell, via the
   * hook's derived `showBanner`) owns the "don't show on first connect"
   * suppression — this component only ever receives `connecting` for a real
   * post-disconnect reconnect attempt, never on first mount.
   */
  status?: Extract<SseStatus, "connecting" | "disconnected">;
  /** Manual reconnect trigger (AC-2). Wired unconditionally by the container. */
  onReconnect: () => void;
  className?: string;
}

/**
 * Full-width, in-flow notice below the header showing that the realtime (SSE)
 * connection dropped (US-E08.6). Presentational only — no hooks beyond
 * translations; visibility is entirely prop-driven. Motion is gated globally
 * under `prefers-reduced-motion` (decision 0013), so `animate-in` needs no
 * extra `motion-safe:` prefix.
 */
export function SseDisconnectBanner({
  status,
  onReconnect,
  className,
}: SseDisconnectBannerProps) {
  const t = useTranslations("shell.sseStatus");

  if (!status) return null;

  const isReconnecting = status === "connecting";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 border-edu-warning border-b bg-edu-warning-light px-4 py-2.5 text-edu-warning-text sm:px-6",
        "animate-in slide-in-from-top-2 fade-in",
        className,
      )}
    >
      {isReconnecting ? (
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      ) : (
        <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm">
          {isReconnecting ? t("reconnectingTitle") : t("disconnectedTitle")}
        </p>
        {!isReconnecting && (
          <p className="text-edu-warning-text/90 text-xs">
            {t("disconnectedBody")}
          </p>
        )}
      </div>

      {!isReconnecting && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onReconnect}
          className="shrink-0 border-edu-warning bg-edu-warning-light text-edu-warning-text hover:bg-edu-warning/15"
        >
          {t("reconnectButton")}
        </Button>
      )}
    </div>
  );
}
