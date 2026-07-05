/**
 * US-E17.12 (DR-011 §UX-06) — contextual "send now" toast.
 *
 * Pure helpers kept outside the component so the fallback/contextual branch
 * and the locale-dependent time format are unit-testable without mounting
 * the drawer (Vitest runs `node` env here — no @testing-library/react).
 */

export interface SendToastParams {
  key: "sendToastContext" | "sendToast";
  values?: { recipientCount: number; time: string };
  duration: number;
}

/**
 * `recipientCount` is the client-side estimate computed from the selected
 * audience (`AnnouncementDrawer`'s `recipientEstimate`). Falls back to the
 * generic toast when it is `undefined` or `0` — the wording would otherwise
 * read "sent to 0 recipients", which the generic fallback avoids.
 */
export function resolveSendToastParams(
  recipientCount: number | undefined,
  time: string,
): SendToastParams {
  if (recipientCount && recipientCount > 0) {
    return {
      key: "sendToastContext",
      values: { recipientCount, time },
      duration: 4000,
    };
  }
  return { key: "sendToast", duration: 2000 };
}

/**
 * FR-006 — vi: 24h `HH:mm`; en: 12h `h:mm a`. Any other/unknown locale falls
 * back to the vi 24h format.
 */
export function formatSendToastTime(locale: string, date: Date): string {
  if (locale === "en") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
