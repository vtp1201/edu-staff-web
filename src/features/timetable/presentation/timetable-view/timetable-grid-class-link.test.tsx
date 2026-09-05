import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import { TimetableGrid } from "./timetable-grid";

/**
 * US-E24.8 — a teacher's weekly-schedule cell deep-links into that class's hub
 * (`?tab=timetable`). Node env (no jsdom): render to static markup and assert on
 * the emitted anchor. Three invariants:
 *  1. teacher view + class id + base → a real `<a>` with the tab-scoped href;
 *  2. no class id (mock/legacy path) → NO anchor (a dead link is worse);
 *  3. the class-scope view (student/parent) never links — the hub is teacher-only.
 */
function timetable(classId?: string): WeeklyTimetable {
  return {
    classId: "mem-1",
    className: "Cô Nguyễn Thị Hương",
    slots: {
      0: {
        1: {
          subjectId: "sub-math",
          subjectName: "Toán",
          subjectColorToken: "primary",
          className: "11A2",
          room: "P.302",
          ...(classId ? { classId } : {}),
        },
      },
    },
  };
}

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

describe("TimetableGrid — class-hub deep link (US-E24.8)", () => {
  it("teacher cell with a classId renders an anchor to the class hub timetable tab", () => {
    const html = render(
      <TimetableGrid
        timetable={timetable("cls-11a2")}
        cellVariant="teacher"
        classHrefBase="/vi/t/t1/teacher/classes"
      />,
    );
    expect(html).toContain(
      'href="/vi/t/t1/teacher/classes/cls-11a2?tab=timetable"',
    );
    // The subject stays inside the link (the whole cell is the target).
    expect(html).toMatch(/<a[^>]*href="[^"]*cls-11a2[^"]*"[^>]*>[\s\S]*?Toán/);
  });

  it("teacher cell WITHOUT a classId renders no anchor at all", () => {
    const html = render(
      <TimetableGrid
        timetable={timetable()}
        cellVariant="teacher"
        classHrefBase="/vi/t/t1/teacher/classes"
      />,
    );
    expect(html).not.toContain("<a ");
    expect(html).toContain("Toán");
  });

  it("teacher cell with a classId but no base (route did not opt in) renders no anchor", () => {
    const html = render(
      <TimetableGrid timetable={timetable("cls-11a2")} cellVariant="teacher" />,
    );
    expect(html).not.toContain("<a ");
  });

  it("class-scope view (student/parent) never links, even when the slot carries a classId", () => {
    const html = render(
      <TimetableGrid
        timetable={timetable("cls-11a2")}
        cellVariant="class"
        classHrefBase="/vi/t/t1/teacher/classes"
      />,
    );
    expect(html).not.toContain("<a ");
  });
});
