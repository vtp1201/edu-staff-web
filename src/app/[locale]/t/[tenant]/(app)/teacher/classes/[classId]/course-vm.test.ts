import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The course tab's VM builder (US-E24.10). Everything the screen can show is
 * decided here: which subject, which course, which mode, and — when there is no
 * course — WHY, since "you may not see it" and "there isn't one" are different
 * statements and the design gives them different copy.
 */
const listClassSubjects = vi.fn();
const listCourses = vi.fn();
const listItems = vi.fn();

vi.mock("@/bootstrap/di/lms.di", () => ({
  makeListClassSubjectsUseCase: async () => ({ execute: listClassSubjects }),
  makeListCoursesUseCase: async () => ({ execute: listCourses }),
  makeListCourseItemsUseCase: async () => ({ execute: listItems }),
}));

import { buildCourseTabVm } from "./course-vm";

const CLASS_SUBJECTS = {
  ok: true,
  data: [
    { subjectId: "sub-toan", subjectName: "Toán" },
    { subjectId: "sub-ly", subjectName: "Vật lý" },
  ],
};

function course(over: Record<string, unknown> = {}) {
  return {
    id: "co-toan",
    classId: "cls-1",
    subjectId: "sub-toan",
    title: "Toán 10",
    status: "PUBLISHED",
    isDefault: true,
    createdBy: "t1",
    updatedAt: "2026-08-01T00:00:00Z",
    publishedAt: "2026-08-01T00:00:00Z",
    ...over,
  };
}

const BASE = {
  classId: "cls-1",
  locale: "vi",
  tenant: "t1",
};

beforeEach(() => {
  vi.clearAllMocks();
  listClassSubjects.mockResolvedValue(CLASS_SUBJECTS);
  listCourses.mockResolvedValue({ ok: true, data: [course()] });
  listItems.mockResolvedValue({ ok: true, data: [] });
});

describe("subject resolution", () => {
  it("lands a GVBM on their OWN subject without asking for the class list", async () => {
    const vm = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: false,
    });

    expect(listClassSubjects).not.toHaveBeenCalled();
    expect(vm.selectedSubjectId).toBe("sub-toan");
    expect(listCourses).toHaveBeenCalledWith("cls-1", "sub-toan");
    expect(vm.mode).toBe("teacher");
  });

  it("gives a pure GVCN the whole class's subjects, read-only", async () => {
    listCourses.mockResolvedValue({
      ok: true,
      data: [course({ subjectId: "sub-toan" })],
    });

    const vm = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [],
      isHomeroom: true,
    });

    expect(vm.subjectOptions.map((o) => o.subjectId)).toEqual([
      "sub-toan",
      "sub-ly",
    ]);
    expect(vm.subjectOptions.every((o) => o.isMine)).toBe(false);
    expect(vm.mode).toBe("readonly");
  });

  it("honours ?subjectId= when the subject is actually on offer", async () => {
    await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: true,
      subjectIdParam: "sub-ly",
    });

    expect(listCourses).toHaveBeenCalledWith("cls-1", "sub-ly");
  });

  it("ignores a stale or forged ?subjectId= instead of breaking the tab", async () => {
    await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: true,
      subjectIdParam: "sub-not-offered",
    });

    expect(listCourses).toHaveBeenCalledWith("cls-1", "sub-toan");
  });

  it("keeps the tab usable when the wider class-subject read fails", async () => {
    listClassSubjects.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden" },
    });

    const vm = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: true,
    });

    // Losing the picker is a smaller failure than blanking the whole tab.
    expect(vm.subjectOptions).toEqual([
      { subjectId: "sub-toan", name: "Toán", isMine: true },
    ]);
    expect(vm.courseId).toBe("co-toan");
  });
});

describe("course resolution", () => {
  it("prefers the auto-provisioned default course over the first row", async () => {
    listCourses.mockResolvedValue({
      ok: true,
      data: [
        course({ id: "co-old", isDefault: false }),
        course({ id: "co-default", isDefault: true }),
      ],
    });

    const vm = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: false,
    });

    expect(vm.courseId).toBe("co-default");
  });

  it("distinguishes a REFUSED subject from one that simply has no course", async () => {
    listCourses.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden" },
    });
    const refused = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: false,
    });

    listCourses.mockResolvedValue({ ok: true, data: [] });
    const empty = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: false,
    });

    expect(refused.emptyReason).toBe("forbidden");
    expect(empty.emptyReason).toBe("no-course");
    expect(refused.emptyReason).not.toBe(empty.emptyReason);
    expect(refused.courseId).toBeNull();
    expect(empty.courseId).toBeNull();
  });

  it("says so when the class offers no subjects at all", async () => {
    listClassSubjects.mockResolvedValue({ ok: true, data: [] });

    const vm = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [],
      isHomeroom: true,
    });

    expect(vm.emptyReason).toBe("no-subjects");
    expect(listCourses).not.toHaveBeenCalled();
  });

  it("degrades a failed TIMELINE read without losing the course header", async () => {
    listItems.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });

    const vm = await buildCourseTabVm({
      ...BASE,
      teacherSubjects: [{ id: "sub-toan", name: "Toán" }],
      isHomeroom: false,
    });

    expect(vm.courseId).toBe("co-toan");
    expect(vm.courseName).toBe("Toán 10");
    expect(vm.items).toEqual([]);
    expect(vm.errorKey).toBe("network-error");
  });
});
