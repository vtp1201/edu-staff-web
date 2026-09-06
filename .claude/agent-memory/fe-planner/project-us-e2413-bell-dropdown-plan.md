---
name: project-us-e2413-bell-dropdown-plan
description: US-E24.13 bell-dropdown plan — viewport-split trigger idiom, server-action-prop-cannot-be-a-wrapper-closure gotcha, NotificationRow promotion diff
metadata:
  type: project
---

US-E24.13 (header bell → 3-tab popover dropdown) plan written into
`docs/stories/epics/E24-learning-class-hub/US-E24.13-bell-dropdown/US-E24.13-bell-dropdown.md`
`## Plan` section (worktree `us-e24.13`, branch `feat/us-e24.13-bell-dropdown`).

Key findings, generalize beyond this story:

1. **Viewport-split trigger idiom**: this repo has no `matchMedia`/`useMediaQuery` hook precedent —
   the established pattern for "different component per breakpoint" is render-both +
   Tailwind `hidden`/`sm:hidden`/`sm:block` gating (same idiom `header.tsx` already uses for its
   search input and hamburger). Prefer this over inventing a JS viewport hook — avoids
   hydration-mismatch guards.
2. **Server Action prop cannot be a wrapper closure.** A plain arrow function that internally calls
   a `"use server"` action, defined in an RSC and passed down as a prop, does NOT itself cross the
   client/server boundary — only functions marked `"use server"` can. If a new callback prop needs a
   reshaped param signature vs. an existing exported action, either (a) give the prop's i-vm the
   *exact same* param shape as the existing action and pass it unwrapped, or (b) add a new exported
   `"use server"` function in the actions file. Don't wrap-and-hope.
   **Why:** almost introduced a broken wrapper for `onFetchNotificationsPreview`; caught by reading
   `(app)/layout.tsx`'s existing `onFetchUnreadCount={fetchUnreadCountAction}` direct-pass pattern.
3. **`NotificationRow` (centre, `notifications-center.tsx`) promotion diff** (full vs. compact,
   confirmed by reading both the component and `design_src/edu/ui.jsx` `NotifDropdown`): full =
   40px icon, 2-line body, type badge pill, left-border-stripe unread. Compact = 32px icon,
   title-only (no body line), no type badge, trailing dot for unread. `variant?: "full"|"compact"`
   prop, default `"full"` (centre call sites unchanged).
4. **SSE invalidation is prefix-based** (`queryClient.invalidateQueries({queryKey})` defaults
   `exact:false`, confirmed in `use-realtime-events.ts`) — a 2-segment key like
   `["notifications","preview"]` invalidates ALL `preview(filter)` variants in one line; no need to
   enumerate every filter value the way the older `list` keys do.
5. Domain/repo/mapper genuinely needed **zero code changes** beyond adding `"system"` to the
   `NotificationFilter` union — both real and mock repos already branch generically
   (`filter !== "all" ? queryParams.type = filter`). Always verify a packet's "use-case needs zero
   changes" claim by actually reading the use-case/repo, don't just trust the prose.
