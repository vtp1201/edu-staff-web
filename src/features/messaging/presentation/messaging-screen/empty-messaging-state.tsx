"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

export interface EmptyMessagingStateProps {
  onStart?: () => void;
}

export function EmptyMessagingState({ onStart }: EmptyMessagingStateProps) {
  const t = useTranslations("messaging.empty");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/30 px-6 text-center">
      <MessageSquare
        className="size-12 text-border"
        strokeWidth={1.2}
        aria-hidden="true"
      />
      <p className="font-bold text-base text-foreground">{t("title")}</p>
      <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      {onStart && (
        <button
          type="button"
          onClick={onStart}
          className="mt-1 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground text-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("cta")}
        </button>
      )}
    </div>
  );
}
