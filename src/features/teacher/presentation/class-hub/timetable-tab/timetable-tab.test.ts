/**
 * US-E24.9 — week navigation must REMOUNT the client body.
 *
 * `TimetableTabBody` seeds its three shared maps (logs / preps / homeroom
 * entries) ONCE with `useState(initial)`. Navigating to `?week=` re-renders the
 * RSC with fresh props, but React reconciles the already-mounted client subtree
 * by position, so without a changing `key` the maps would keep LAST week's rows:
 * a period already logged would render as "chưa ghi", and the next save — a
 * full-replace PUT — would overwrite the previous week's work.
 *
 * The proof is structural (this is a node-env suite: there is no
 * @testing-library/react in this repo, so a real remount cannot be observed):
 * the element the tab returns must carry the week param as its `key`, and two
 * different weeks must produce two different keys. That is exactly the input
 * React reconciles on.
 */
import { describe, expect, it, vi } from "vitest";
import type { TimetableTabActions, TimetableTabVm } from "./timetable-tab.i-vm";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

const actions = {} as TimetableTabActions;

function vm(over: Partial<TimetableTabVm> = {}): TimetableTabVm {
  return {
    classId: "c-1",
    myMemberId: "m-1",
    isHomeroom: false,
    weekParam: "2026-W36",
    weekRangeLabel: "31/08 – 05/09",
    prevWeekHref: "?tab=timetable&week=2026-W35",
    nextWeekHref: "?tab=timetable&week=2026-W37",
    days: [],
    logs: [],
    preps: [],
    homeroomEntries: [],
    lessonPlans: [],
    upcoming: null,
    shortcuts: {
      teachingPlanHref: "/x",
      attendanceHref: "/y",
      classLogHref: "/z",
    },
    ...over,
  };
}

describe("TimetableTab — week-scoped client body", () => {
  it("keys the client body by the rendered week", async () => {
    const { TimetableTab } = await import("./timetable-tab");

    const element = await TimetableTab({ vm: vm(), actions });

    expect(element.key).toBe("2026-W36");
  });

  it("gives a different week a different key (forces a remount, no stale maps)", async () => {
    const { TimetableTab } = await import("./timetable-tab");

    const first = await TimetableTab({ vm: vm(), actions });
    const second = await TimetableTab({
      vm: vm({ weekParam: "2026-W37" }),
      actions,
    });

    expect(second.key).toBe("2026-W37");
    expect(second.key).not.toBe(first.key);
    // Same component identity — ONLY the key differs, which is what makes React
    // discard the old instance's state instead of reusing it.
    expect(second.type).toBe(first.type);
  });

  it("renders the single error surface (no body) when the week read failed", async () => {
    const { TimetableTab } = await import("./timetable-tab");

    const element = await TimetableTab({
      vm: vm({ errorKey: "network-error" }),
      actions,
    });

    expect(element.type).toBe("div");
  });
});
