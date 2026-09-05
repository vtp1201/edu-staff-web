import { describe, expect, it } from "vitest";
import { isoDate, MOCK_PERIOD_CLASS_ID, mondayOf } from "./fixtures";
import { MockPeriodLogRepository } from "./period-log.mock.repository";

const MONDAY = mondayOf(new Date());
const FROM = isoDate(MONDAY);
const TO = isoDate(new Date(MONDAY.getTime() + 5 * 86_400_000));
const CTX = { termId: "term-mock", academicYearId: "year-mock" };

describe("MockPeriodLogRepository", () => {
  it("lists the seeded week ordered by (date, periodNumber)", async () => {
    const repo = new MockPeriodLogRepository();

    const rows = await repo.listPeriodLogs(MOCK_PERIOD_CLASS_ID, FROM, TO);

    expect(rows.length).toBeGreaterThan(0);
    const keys = rows.map((r) => `${r.date}#${r.periodNumber}`);
    expect([...keys].sort()).toEqual(keys);
  });

  it("filters by class and by range", async () => {
    const repo = new MockPeriodLogRepository();

    expect(await repo.listPeriodLogs("other-class", FROM, TO)).toEqual([]);
    expect(
      await repo.listPeriodLogs(
        MOCK_PERIOD_CLASS_ID,
        "1999-01-01",
        "1999-01-07",
      ),
    ).toEqual([]);
  });

  it("round-trips a save → list → delete", async () => {
    const repo = new MockPeriodLogRepository();

    const saved = await repo.savePeriodLog(MOCK_PERIOD_CLASS_ID, FROM, 9, CTX, {
      lessonTitle: "Tiết mới",
      remark: "",
      grade: "C",
      absentCount: 4,
    });
    expect(saved.lessonTitle).toBe("Tiết mới");
    expect(saved.termId).toBe("term-mock");

    const after = await repo.listPeriodLogs(MOCK_PERIOD_CLASS_ID, FROM, TO);
    expect(after.some((r) => r.periodNumber === 9)).toBe(true);

    await repo.deletePeriodLog(MOCK_PERIOD_CLASS_ID, FROM, 9, CTX);
    const gone = await repo.listPeriodLogs(MOCK_PERIOD_CLASS_ID, FROM, TO);
    expect(gone.some((r) => r.periodNumber === 9)).toBe(false);
  });

  it("prep save is a FULL REPLACE of materials, never a merge", async () => {
    const repo = new MockPeriodLogRepository();

    await repo.savePeriodPrep(MOCK_PERIOD_CLASS_ID, FROM, 8, CTX, {
      note: "a",
      materials: [
        { title: "one", url: "https://a.test" },
        { title: "two", url: "https://b.test" },
      ],
    });
    const replaced = await repo.savePeriodPrep(
      MOCK_PERIOD_CLASS_ID,
      FROM,
      8,
      CTX,
      { note: "b", materials: [{ title: "three", url: "https://c.test" }] },
    );

    expect(replaced.materials).toEqual([
      { title: "three", url: "https://c.test" },
    ]);
    expect(replaced.note).toBe("b");
    await repo.deletePeriodPrep(MOCK_PERIOD_CLASS_ID, FROM, 8, CTX);
  });

  it("an unset lessonPlanId is stored as null (wire shape), not undefined", async () => {
    const repo = new MockPeriodLogRepository();

    const saved = await repo.savePeriodPrep(
      MOCK_PERIOD_CLASS_ID,
      FROM,
      7,
      CTX,
      { materials: [] },
    );

    expect(saved.lessonPlanId).toBeNull();
    await repo.deletePeriodPrep(MOCK_PERIOD_CLASS_ID, FROM, 7, CTX);
  });
});
