import { describe, expect, it } from "vitest";
import { GetWeekPeriodLogsUseCase } from "../get-week-period-logs.use-case";
import { GetWeekPeriodPrepsUseCase } from "../get-week-period-preps.use-case";
import { makeSpyRepo } from "./fake-repo";

describe("GetWeekPeriodLogsUseCase", () => {
  it("passes the range through and returns the rows", async () => {
    const repo = makeSpyRepo();
    repo.listPeriodLogs.mockResolvedValue([{ periodNumber: 1 }]);

    const result = await new GetWeekPeriodLogsUseCase(repo).execute(
      "c-1",
      "2026-09-07",
      "2026-09-12",
    );

    expect(result).toEqual({ ok: true, data: [{ periodNumber: 1 }] });
    expect(repo.listPeriodLogs.mock.calls[0]).toEqual([
      "c-1",
      "2026-09-07",
      "2026-09-12",
    ]);
  });

  it("an empty week is a success, not a failure", async () => {
    const repo = makeSpyRepo();

    const result = await new GetWeekPeriodLogsUseCase(repo).execute(
      "c-1",
      "2026-09-07",
      "2026-09-12",
    );

    expect(result).toEqual({ ok: true, data: [] });
  });

  it("maps a transport failure to network-error", async () => {
    const repo = makeSpyRepo();
    repo.listPeriodLogs.mockRejectedValue(new Error("offline"));

    const result = await new GetWeekPeriodLogsUseCase(repo).execute(
      "c-1",
      "2026-09-07",
      "2026-09-12",
    );

    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});

describe("GetWeekPeriodPrepsUseCase", () => {
  it("passes the range through", async () => {
    const repo = makeSpyRepo();
    repo.listPeriodPreps.mockResolvedValue([]);

    const result = await new GetWeekPeriodPrepsUseCase(repo).execute(
      "c-1",
      "2026-09-07",
      "2026-09-12",
    );

    expect(result).toEqual({ ok: true, data: [] });
    expect(repo.listPeriodPreps).toHaveBeenCalledTimes(1);
  });

  it("maps a typed failure through unchanged", async () => {
    const repo = makeSpyRepo();
    repo.listPeriodPreps.mockRejectedValue({ type: "validation" });

    const result = await new GetWeekPeriodPrepsUseCase(repo).execute(
      "c-1",
      "2026-09-07",
      "2026-09-12",
    );

    expect(result).toEqual({ ok: false, error: { type: "validation" } });
  });
});
