import { cn } from "@/shared/utils";

/**
 * US-E17.3 — mobile single-pane slide + a11y helpers.
 *
 * At mobile viewports (< md) both panes are ALWAYS rendered and stacked
 * (`absolute inset-0`) inside the `relative overflow-hidden` parent; the visible
 * pane is chosen purely by `transform: translateX(...)`, never by `display:none`
 * — so the 250ms slide actually animates (AC-05/06/10/14/15). The transition and
 * its reduced-motion guard are pure CSS (`motion-reduce:transition-none` →
 * `@media (prefers-reduced-motion: reduce) { transition: none }`), so no JS
 * `matchMedia` is used for the animation (AC-17).
 *
 * At >= md every pane resets to the original side-by-side flow (`md:static`,
 * `md:translate-x-0`, list `md:w-[300px]`, chat `md:flex-1`); `md:static`
 * overrides `absolute`, so the desktop layout is untouched (FR-1 / AC-19/20).
 */

export type MobilePane = "list" | "chat";

/** Permanent slide-transition classes shared by both pane wrappers. */
const PANE_TRANSITION =
  "transition-transform duration-[250ms] ease-in-out motion-reduce:transition-none";

/**
 * Base classes shared by both panes: on mobile each is an always-rendered flex
 * column absolutely stacked over the parent; at `md:` it returns to static flow.
 */
const PANE_BASE =
  "absolute inset-0 flex md:static md:inset-auto md:translate-x-0";

/**
 * Conversation-list pane wrapper classes.
 * - active list → visible at `translate-x-0`.
 * - active chat → list slides out left (`-translate-x-full`).
 * - desktop (`md:`) resets to a static 300px column.
 */
export function listPaneClass(mobilePane: MobilePane): string {
  return cn(
    PANE_BASE,
    "w-full md:w-[300px]",
    PANE_TRANSITION,
    mobilePane === "chat" ? "-translate-x-full" : "translate-x-0",
  );
}

/**
 * Chat pane wrapper classes.
 * - active chat → visible at `translate-x-0`.
 * - active list → chat slides off-screen right (`translate-x-full`).
 * - desktop (`md:`) resets to a static flex-1 column.
 */
export function chatPaneClass(mobilePane: MobilePane): string {
  return cn(
    PANE_BASE,
    "w-full md:flex-1",
    PANE_TRANSITION,
    mobilePane === "list" ? "translate-x-full" : "translate-x-0",
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
 * `inert` for the off-screen pane. Because both panes stay in the DOM (no
 * `display:none`) so the slide can animate, `aria-hidden` alone does not reliably
 * pull the hidden pane's focusable children out of the tab order. `inert`
 * (React 19 native boolean prop) guarantees keyboard/AT can't reach them
 * (AC-04/AC-13). Same mobile gate as `paneAriaHidden`.
 */
export function paneInert(
  isMobile: boolean,
  mobilePane: MobilePane,
  pane: MobilePane,
): boolean | undefined {
  return paneAriaHidden(isMobile, mobilePane, pane) === "true"
    ? true
    : undefined;
}

/**
 * Chat-window back button. Grown to a >= 44x44 hit area (AC-11) while the icon
 * itself stays `size-5`; mobile-only affordance (`md:hidden`).
 */
export const BACK_BUTTON_CLASS =
  "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden";
