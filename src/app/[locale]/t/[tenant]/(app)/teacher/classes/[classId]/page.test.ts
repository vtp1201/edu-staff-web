import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TeacherClass } from "@/features/teacher/domain/entities/teacher-class.entity";

/**
 * US-E24.8 class-hub shell — the RSC route owns every AC that cannot be seen
 * from a component in isolation: role → tab set, `?tab=` resolution (incl. the
 * forbidden-homeroom fallback), which tab BODY is actually rendered, and the
 * notFound() gate for a class that is not mine (and only that — a
 * transport failure must stay distinguishable from "no such class").
 */

const classExec = vi.fn();
const studentsExec = vi.fn();

vi.mock("@/bootstrap/di/teacher-class.di", () => ({
  makeGetMyClassUseCase: async () => ({ execute: classExec }),
  makeGetTeacherClassStudentsUseCase: async () => ({ execute: studentsExec }),
}));

// US-E24.9: the timetable tab body assembles its own VM from four reads. The
// builder is exercised by its own tests; here we only prove the ROUTE picks it
// (and passes `?week=` through) instead of a placeholder.
const buildTimetableTabVm = vi.fn();
vi.mock("./timetable-vm", () => ({
  buildTimetableTabVm: (input: unknown) => buildTimetableTabVm(input),
}));
// US-E24.11: same shape for the homeroom tab — the builder has its own tests;
// here we only prove the ROUTE picks it (and only for a GVCN).
const buildHomeroomTabVm = vi.fn();
vi.mock("./homeroom-vm", () => ({
  buildHomeroomTabVm: (input: unknown) => buildHomeroomTabVm(input),
}));
vi.mock("./actions", () => ({
  approveLeaveAction: vi.fn(),
  rejectLeaveAction: vi.fn(),
  savePeriodLogAction: vi.fn(),
  deletePeriodLogAction: vi.fn(),
  savePeriodPrepAction: vi.fn(),
  deletePeriodPrepAction: vi.fn(),
  saveDailyEntryAction: vi.fn(),
  submitDailyEntryAction: vi.fn(),
  reviseDailyEntryAction: vi.fn(),
}));

function cls(overrides: Partial<TeacherClass> = {}): TeacherClass {
  return {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    studentCount: 36,
    isHomeroom: true,
    roles: ["homeroom", "subject"],
    subjects: [{ id: "sub-math", name: "Toán" }],
    academicYearLabel: "2025–2026",
    ...overrides,
  };
}

interface ErrorVm {
  status: string;
  errorKey: string;
}

interface Rendered {
  props: {
    header: {
      className: string;
      studentCount: number;
      roles: string[];
      classesHref: string;
    };
    tabs: {
      activeTab: string;
      tabs: Array<{ id: string; href: string }>;
    };
    children: { props: Record<string, unknown> };
  };
}

async function renderPage(
  tab?: string,
  classId = "cls-10a1",
  week?: string,
): Promise<{ el: Rendered | null; notFound: boolean }> {
  const { default: Page } = await import("./page");
  try {
    const query: { tab?: string; week?: string } = {};
    if (tab !== undefined) query.tab = tab;
    if (week !== undefined) query.week = week;
    const el = (await Page({
      params: Promise.resolve({ locale: "vi", tenant: "t1", classId }),
      searchParams: Promise.resolve(query),
    })) as unknown as Rendered;
    return { el, notFound: false };
  } catch (err) {
    const digest = (err as { digest?: string } | null)?.digest ?? "";
    if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) {
      return { el: null, notFound: true };
    }
    throw err;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  studentsExec.mockResolvedValue({ ok: true, data: [] });
  buildTimetableTabVm.mockResolvedValue({ classId: "cls-10a1", days: [] });
  buildHomeroomTabVm.mockResolvedValue({
    classId: "cls-10a1",
    attendance: { ok: true, data: {} },
    violations: { ok: true, data: {} },
    leave: { ok: true, data: { requests: [] } },
  });
});

describe("ClassHubPage — tabs by role (US-E24.8 AC)", () => {
  it("GVCN + GVBM class → 4 tabs, default tab `students`", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    const { el } = await renderPage();
    expect(el?.props.tabs.tabs.map((x) => x.id)).toEqual([
      "students",
      "timetable",
      "course",
      "homeroom",
    ]);
    expect(el?.props.tabs.activeTab).toBe("students");
  });

  it("GVBM-only class → 3 tabs (no homeroom)", async () => {
    classExec.mockResolvedValue({
      ok: true,
      data: cls({ isHomeroom: false, roles: ["subject"] }),
    });
    const { el } = await renderPage();
    expect(el?.props.tabs.tabs.map((x) => x.id)).toEqual([
      "students",
      "timetable",
      "course",
    ]);
  });

  it("pure-GVCN class defaults to the `homeroom` tab", async () => {
    classExec.mockResolvedValue({
      ok: true,
      data: cls({ roles: ["homeroom"], subjects: [] }),
    });
    const { el } = await renderPage();
    expect(el?.props.tabs.activeTab).toBe("homeroom");
    // …and lands on the REAL body, not a placeholder.
    expect(el?.props.children.props.vm).toBeDefined();
    expect(el?.props.children.props.tab).toBeUndefined();
  });

  it("AC: ?tab=homeroom on a class I do NOT own falls back to the default tab AND its body", async () => {
    classExec.mockResolvedValue({
      ok: true,
      data: cls({ isHomeroom: false, roles: ["subject"] }),
    });
    const { el } = await renderPage("homeroom");
    expect(el?.props.tabs.activeTab).toBe("students");
    // The roster body rendered — not a homeroom placeholder.
    expect(el?.props.children.props.embedded).toBe(true);
    expect(studentsExec).toHaveBeenCalledWith("cls-10a1");
  });

  it("tab hrefs are absolute, locale+tenant scoped, and carry ?tab=", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    const { el } = await renderPage();
    expect(el?.props.tabs.tabs[1]).toEqual({
      id: "timetable",
      href: "/vi/t/t1/teacher/classes/cls-10a1?tab=timetable",
    });
    expect(el?.props.header.classesHref).toBe("/vi/t/t1/teacher/classes");
  });
});

describe("ClassHubPage — tab bodies", () => {
  it("`?tab=students` renders the existing roster screen WITHOUT its own breadcrumb (the shell owns it)", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    studentsExec.mockResolvedValue({
      ok: true,
      data: [
        {
          enrollmentId: "enr-1",
          displayName: "Nguyễn Minh Khoa",
          studentMemberId: "stu-1",
          status: "active",
        },
      ],
    });
    const { el } = await renderPage("students");
    const vm = el?.props.children.props.vm as {
      status: string;
      className: string;
      students: unknown[];
    };
    expect(el?.props.children.props.embedded).toBe(true);
    expect(vm.status).toBe("ready");
    expect(vm.className).toBe("10A1");
    expect(vm.students).toHaveLength(1);
  });

  it("a failed roster read still renders the shell with the roster's typed error VM (no crash, no notFound)", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    studentsExec.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });
    const { el, notFound } = await renderPage("students");
    expect(notFound).toBe(false);
    const vm = el?.props.children.props.vm as {
      status: string;
      errorKey: string;
    };
    expect(vm.status).toBe("error");
    expect(vm.errorKey).toBe("network-error");
  });

  it("`?tab=timetable` renders the real timetable body, not a placeholder, and fetches NO roster", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    const { el } = await renderPage("timetable", "cls-10a1", "2026-W36");

    expect(el?.props.tabs.activeTab).toBe("timetable");
    expect(el?.props.children.props.vm).toBeDefined();
    // The placeholder branch would have passed a `tab` prop instead.
    expect(el?.props.children.props.tab).toBeUndefined();
    expect(studentsExec).not.toHaveBeenCalled();
    expect(buildTimetableTabVm).toHaveBeenCalledWith({
      classId: "cls-10a1",
      isHomeroom: true,
      locale: "vi",
      tenant: "t1",
      weekParam: "2026-W36",
    });
  });

  it("passes an ABSENT ?week= through as undefined (the builder owns the default)", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    await renderPage("timetable");
    expect(buildTimetableTabVm.mock.calls[0][0].weekParam).toBeUndefined();
  });

  it("`?tab=homeroom` on a GVCN class renders the real homeroom body with BOTH leave actions bound", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    const { el } = await renderPage("homeroom");

    expect(el?.props.tabs.activeTab).toBe("homeroom");
    expect(buildHomeroomTabVm).toHaveBeenCalledWith({
      classId: "cls-10a1",
      locale: "vi",
      tenant: "t1",
    });
    const actions = el?.props.children.props.actions as Record<string, unknown>;
    expect(Object.keys(actions ?? {})).toEqual(["approveLeave", "rejectLeave"]);
    expect(el?.props.children.props.tab).toBeUndefined();
    expect(studentsExec).not.toHaveBeenCalled();
  });

  it("a GVBM deep-linking `?tab=homeroom` never even BUILDS the homeroom VM", async () => {
    classExec.mockResolvedValue({
      ok: true,
      data: cls({ isHomeroom: false, roles: ["subject"] }),
    });

    await renderPage("homeroom");

    expect(buildHomeroomTabVm).not.toHaveBeenCalled();
  });

  it("`course` is the last not-yet-built tab and renders its own placeholder, fetching NO roster", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    const { el } = await renderPage("course");
    expect(el?.props.tabs.activeTab).toBe("course");
    expect(el?.props.children.props.tab).toBe("course");
    expect(studentsExec).not.toHaveBeenCalled();
  });
});

describe("ClassHubPage — existence gate", () => {
  it("a class that is not in MY list → notFound()", async () => {
    classExec.mockResolvedValue({ ok: false, error: { type: "not-found" } });
    const { notFound } = await renderPage(undefined, "cls-someone-else");
    expect(notFound).toBe(true);
  });

  it("a transport failure is NOT a 404 — it renders the retryable error surface", async () => {
    classExec.mockResolvedValue({
      ok: false,
      error: { type: "network-error" },
    });
    const { el, notFound } = await renderPage();
    expect(notFound).toBe(false);
    const vm = (el as unknown as { props: { vm: ErrorVm } }).props.vm;
    expect(vm.status).toBe("error");
    expect(vm.errorKey).toBe("network-error");
  });

  it("an unauthorized read also gets the error surface (never a fake 404)", async () => {
    classExec.mockResolvedValue({ ok: false, error: { type: "unauthorized" } });
    const { el, notFound } = await renderPage();
    expect(notFound).toBe(false);
    const vm = (el as unknown as { props: { vm: ErrorVm } }).props.vm;
    expect(vm.errorKey).toBe("unauthorized");
  });
});
