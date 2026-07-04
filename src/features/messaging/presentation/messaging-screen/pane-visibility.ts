import { cn } from "@/shared/utils";

/**
 * US-E17.3 — mobile single-pane slide + a11y helpers.
 *
 * At mobile viewports (< md) the messaging screen shows one pane at a time; the
 * off-screen pane slides away via `transform: translateX(...)`. The transition
 * and its reduced-motion guard are pure CSS (`motion-reduce:transition-none` →
 * `@media (prefers-reduced-motion: reduce) { transition: none }`), so no JS
 * `matchMedia` is used for the animation (AC-17). At >= md both panes are always
 * visible side-by-side and every transform is reset (`md:translate-x-0`,
 * `md:flex`), leaving the desktop layout untouched (FR-1 / AC-19/20).
 */

export type MobilePane = "list" | "chat";

/** Permanent slide-transition classes shared by both pane wrappers. */
const PANE_TRANSITION =
  "transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none";

/**
 * Conversation-list pane wrapper classes.
 * - active list → visible at `translate-x-0`.
 * - active chat → list slides out left (`-translate-x-full`) and is `hidden`.
 * - desktop (`md:`) always resets to a visible 300px flex column.
 */
export function listPaneClass(mobilePane: MobilePane): string {
  return cn(
    "w-full md:flex md:w-[300px] md:translate-x-0",
    PANE_TRANSITION,
    mobilePane === "chat" ? "hidden -translate-x-full" : "flex translate-x-0",
  );
}

/**
 * Chat pane wrapper classes.
 * - active chat → visible at `translate-x-0`.
 * - active list → chat slides off-screen right (`translate-x-full`) and is `hidden`.
 * - desktop (`md:`) always resets to a visible flex-1 column.
 */
export function chatPaneClass(mobilePane: MobilePane): string {
  return cn(
    "w-full flex-1 md:flex md:translate-x-0",
    PANE_TRANSITION,
    mobilePane === "list" ? "hidden translate-x-full" : "flex translate-x-0",
  );
}

/**
 * `aria-hidden` for the off-screen pane. Only applies in mobile single-pane
 * mode: at desktop both panes are always visible, so neither may be hidden from
 * assistive tech (AC-19). The mobile gate must come from a real viewport check
 * (see `useIsMobile`) because `aria-hidden` is an HTML attribute that CSS media
 * queries cannot toggle.
 */
export function paneAriaHidden(
  isMobile: boolean,
  mobilePane: MobilePane,
  pane: MobilePane,
): "true" | undefined {
  if (!isMobile) return undefined;
  return mobilePane !== pane ? "true" : undefined;
}

/**
 * Chat-window back button. Grown to a >= 44x44 hit area (AC-11) while the icon
 * itself stays `size-5`; mobile-only affordance (`md:hidden`).
 */
export const BACK_BUTTON_CLASS =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden";
