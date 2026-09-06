import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { attendanceKeys } from "./attendance-query-keys";

/**
 * US-E24.14 AC: switching the summary tab's range must not refetch or
 * invalidate the Today/History tabs. That is a property of the KEY FAMILIES,
 * so it is proved against a real `QueryClient` rather than by eyeballing the
 * literals.
 */
describe("attendanceKeys — summary is an independent family", () => {
  function seeded() {
    const qc = new QueryClient();
    qc.setQueryData(attendanceKeys.history("c-1", "2026-06-01", "2026-06-07"), [
      "history",
    ]);
    qc.setQueryData(attendanceKeys.summary("c-1", "2026-04-01", "2026-04-30"), [
      "summary-april",
    ]);
    qc.setQueryData(attendanceKeys.terms(), ["terms"]);
    return qc;
  }

  const isInvalidated = (qc: QueryClient, key: readonly unknown[]) =>
    qc.getQueryState(key)?.isInvalidated === true;

  it("does not share a prefix with the history family", () => {
    expect(attendanceKeys.summary("c-1", "a", "b")[0]).not.toBe(
      attendanceKeys.history("c-1", "a", "b")[0],
    );
    expect(attendanceKeys.summary("c-1", "a", "b")[0]).not.toBe(
      attendanceKeys.historyPrefix("c-1")[0],
    );
  });

  it("invalidating a summary range leaves History and the terms cache alone", async () => {
    const qc = seeded();

    await qc.invalidateQueries({
      queryKey: attendanceKeys.summary("c-1", "2026-04-01", "2026-04-30"),
    });

    expect(
      isInvalidated(
        qc,
        attendanceKeys.history("c-1", "2026-06-01", "2026-06-07"),
      ),
    ).toBe(false);
    expect(isInvalidated(qc, attendanceKeys.terms())).toBe(false);
  });

  it("a save's history-prefix invalidation never touches the summary cache", async () => {
    const qc = seeded();

    // Exactly what `AttendanceScreen.onSave` fires today (unchanged by E24.14).
    await qc.invalidateQueries({
      queryKey: attendanceKeys.historyPrefix("c-1"),
    });

    expect(
      isInvalidated(
        qc,
        attendanceKeys.summary("c-1", "2026-04-01", "2026-04-30"),
      ),
    ).toBe(false);
  });

  it("switching range gives a NEW key, so the previous range stays cached", () => {
    const qc = seeded();
    const may = attendanceKeys.summary("c-1", "2026-05-01", "2026-05-31");

    expect(qc.getQueryData(may)).toBeUndefined();
    expect(
      qc.getQueryData(
        attendanceKeys.summary("c-1", "2026-04-01", "2026-04-30"),
      ),
    ).toEqual(["summary-april"]);
  });

  it("keys the terms read once, independent of class and range", () => {
    expect(attendanceKeys.terms()).toEqual(["attendance-summary-terms"]);
  });
});
