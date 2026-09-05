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
): Promise<{ el: Rendered | null; notFound: boolean }> {
  const { default: Page } = await import("./page");
  try {
    const el = (await Page({
      params: Promise.resolve({ locale: "vi", tenant: "t1", classId }),
      searchParams: Promise.resolve(tab === undefined ? {} : { tab }),
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
    expect(el?.props.children.props.tab).toBe("homeroom");
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

  it("the three not-yet-built tabs render their own placeholder and fetch NO roster", async () => {
    classExec.mockResolvedValue({ ok: true, data: cls() });
    for (const tab of ["timetable", "course", "homeroom"]) {
      vi.clearAllMocks();
      classExec.mockResolvedValue({ ok: true, data: cls() });
      const { el } = await renderPage(tab);
      expect(el?.props.tabs.activeTab).toBe(tab);
      expect(el?.props.children.props.tab).toBe(tab);
      expect(studentsExec).not.toHaveBeenCalled();
    }
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
