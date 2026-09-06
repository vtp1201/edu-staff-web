import { describe, expect, it } from "vitest";
import { notificationKeys } from "./notification-keys";

/**
 * US-E24.13 — the bell dropdown gets its OWN cache entry (8-row preview) so it
 * never collides with the centre's infinite `list` pages. Both must stay under
 * the shared `all` prefix so one `invalidateQueries({queryKey: all})` (and the
 * SSE `notification.new` handler) refreshes every notification surface.
 */
describe("notificationKeys.preview", () => {
  it("is scoped per filter under the notifications prefix", () => {
    expect(notificationKeys.preview("all")).toEqual([
      "notifications",
      "preview",
      "all",
    ]);
    expect(notificationKeys.preview("system")).toEqual([
      "notifications",
      "preview",
      "system",
    ]);
  });

  it("is distinct from the centre's list key for the same filter", () => {
    expect(notificationKeys.preview("unread")).not.toEqual(
      notificationKeys.list("unread"),
    );
  });

  it("sits under the shared `all` prefix", () => {
    expect(notificationKeys.preview("all").slice(0, 1)).toEqual([
      ...notificationKeys.all,
    ]);
  });
});
