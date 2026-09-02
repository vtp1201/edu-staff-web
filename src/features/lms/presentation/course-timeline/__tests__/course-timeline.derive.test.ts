import { describe, expect, it } from "vitest";
import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import { toParagraphs, toWeekVms } from "../course-timeline.derive";

function item(over: Partial<CourseItem>): CourseItem {
  return {
    id: "i1",
    courseId: "c1",
    itemType: "LESSON",
    refId: "i1",
    title: "Bài 1",
    description: null,
    url: null,
    position: 0,
    startAt: null,
    dueAt: null,
    state: "OPEN",
    createdBy: "t1",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    exam: null,
    ...over,
  };
}

describe("toWeekVms", () => {
  it("groups into week sections and keeps the BE order of each week", () => {
    const weeks = toWeekVms([
      item({ id: "b", startAt: "2026-04-21T07:00:00Z" }),
      item({ id: "a", startAt: "2026-04-20T07:00:00Z" }),
      item({ id: "always", startAt: null }),
    ]);

    expect(weeks.map((w) => w.key)).toEqual(["always", "2026-W17"]);
    expect(weeks[1]?.items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(weeks[1]?.weekStart).toBe("2026-04-20");
  });

  it("flattens only the fields a row draws, nulling the type-specific ones", () => {
    const [week] = toWeekVms([
      item({
        id: "d",
        itemType: "DOCUMENT",
        refId: null,
        url: "https://x.test/a",
        description: "Mô tả",
      }),
      item({
        id: "e",
        itemType: "EXAM",
        exam: {
          examId: "e",
          scheduledDate: null,
          durationMinutes: 45,
          examUrl: "https://x.test/e",
        },
      }),
    ]);

    const [doc, exam] = week?.items ?? [];
    expect(doc?.url).toBe("https://x.test/a");
    expect(doc?.examUrl).toBeNull();
    expect(exam?.examUrl).toBe("https://x.test/e");
    expect(exam?.examDurationMinutes).toBe(45);
    expect(exam?.url).toBeNull();
  });

  it("locks an UPCOMING_HIDDEN item and exposes its opening instant", () => {
    const weeks = toWeekVms([
      item({
        id: "ex",
        itemType: "EXAM",
        state: "UPCOMING_HIDDEN",
        startAt: "2026-05-08T02:00:00Z",
      }),
      item({ id: "open", state: "OPEN" }),
      item({ id: "closed", state: "CLOSED" }),
    ]);
    const byId = Object.fromEntries(
      weeks.flatMap((w) => w.items).map((i) => [i.id, i]),
    );

    expect(byId.ex?.locked).toBe(true);
    expect(byId.ex?.opensAt).toBe("2026-05-08T02:00:00Z");
    // Only an unreleased item is locked — CLOSED stays readable for revision.
    expect(byId.open?.locked).toBe(false);
    expect(byId.closed?.locked).toBe(false);
    expect(byId.open?.opensAt).toBeNull();
  });

  it("keeps `opensAt` null when BE released nothing to open at", () => {
    const [week] = toWeekVms([
      item({
        id: "ex",
        itemType: "EXAM",
        state: "UPCOMING_HIDDEN",
        startAt: null,
      }),
    ]);
    expect(week?.items[0]?.locked).toBe(true);
    expect(week?.items[0]?.opensAt).toBeNull();
  });

  it("passes the BE state through untouched and yields [] for no items", () => {
    const [week] = toWeekVms([item({ state: "CLOSED", dueAt: null })]);
    expect(week?.items[0]?.state).toBe("CLOSED");
    expect(toWeekVms([])).toEqual([]);
  });
});

describe("toParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(
      toParagraphs("Một.\n\n  Hai.  \n\n\nBa.").map((p) => p.text),
    ).toEqual(["Một.", "Hai.", "Ba."]);
  });

  it("keeps a single-line body as one paragraph", () => {
    expect(toParagraphs("Chỉ một dòng").map((p) => p.text)).toEqual([
      "Chỉ một dòng",
    ]);
  });

  it("gives repeated paragraph text distinct render keys", () => {
    const ids = toParagraphs("Giống nhau.\n\nGiống nhau.").map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("yields nothing for an empty/whitespace body", () => {
    expect(toParagraphs("")).toEqual([]);
    expect(toParagraphs("   \n\n  ")).toEqual([]);
  });
});
