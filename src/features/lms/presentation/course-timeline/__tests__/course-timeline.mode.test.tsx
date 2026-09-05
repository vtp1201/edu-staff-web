import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CourseTimeline } from "../course-timeline";
import type {
  CourseTimelineActions,
  CourseTimelineMode,
  CourseTimelineVm,
} from "../course-timeline.i-vm";

/**
 * The `mode` contract (US-E24.3 §6). `teacher`/`readonly` are declared today so
 * US-E24.10 inherits a complete union, but they are NOT implemented — the root
 * must fail loudly rather than render a student view to a teacher.
 *
 * Node-env render check: the repo has no `@testing-library/react`, and the
 * guard runs before any hook, so `renderToStaticMarkup` is enough to prove it.
 */
function vm(mode: CourseTimelineMode): CourseTimelineVm {
  return {
    courseId: "c1",
    courseName: "Toán 10",
    tone: "primary",
    openCount: 0,
    weeks: [],
    errorKey: null,
    mode,
  };
}

const actions: CourseTimelineActions = {
  retryListItems: vi.fn(),
};

describe("CourseTimeline — mode guard", () => {
  it.each([
    "teacher",
    "readonly",
  ] as const)("throws for the unimplemented %s mode", (mode) => {
    expect(() =>
      renderToStaticMarkup(
        <CourseTimeline
          vm={vm(mode)}
          actions={actions}
          itemHrefBase="/vi/t/demo/student/courses/c1/items"
        />,
      ),
    ).toThrow(/not implemented/i);
  });
});
