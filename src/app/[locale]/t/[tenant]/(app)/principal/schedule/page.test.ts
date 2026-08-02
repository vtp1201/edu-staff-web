/**
 * RSC composition — principal schedule page (US-E15.3). Asserted through the
 * returned element's props (no DOM): the page's whole job is picking the seed
 * state and wiring the picker, and each branch is a distinct AC.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import type {
  TeacherListActionResult,
  TimetableActionResult,
  TimetableViewProps,
} from "@/features/timetable/presentation/timetable-view/timetable-view.i-vm";

const { getTeachers, getTimetable } = vi.hoisted(() => ({
  getTeachers: vi.fn(),
  getTimetable: vi.fn(),
}));

vi.mock("./actions", () => ({
  getPrincipalTeacherListAction: getTeachers,
  getMemberTimetableAction: getTimetable,
}));

const TEACHER: PrincipalTeacher = {
  teacherId: "t-1",
  displayName: "Cô Nguyễn Thanh Hà",
  email: "ha@example.edu.vn",
  primarySubjectName: "Toán",
  homeroomClassId: "c-10a1",
  homeroomClassName: "10A1",
  subjectAssignments: [],
  status: "ACTIVE",
};

const WEEK = { classId: "t-1", className: "", slots: {} };

async function renderPage(): Promise<{ props: TimetableViewProps }> {
  const { default: Page } = await import("./page");
  return (await Page()) as unknown as { props: TimetableViewProps };
}

beforeEach(() => vi.clearAllMocks());

describe("PrincipalSchedulePage", () => {
  it("seeds the FIRST teacher's week and wires the picker", async () => {
    getTeachers.mockResolvedValue({
      ok: true,
      data: [TEACHER, { ...TEACHER, teacherId: "t-2" }],
    } satisfies TeacherListActionResult);
    getTimetable.mockResolvedValue({
      ok: true,
      data: WEEK,
    } satisfies TimetableActionResult);

    const el = await renderPage();

    expect(getTimetable).toHaveBeenCalledWith("t-1");
    expect(el.props.viewerRole).toBe("principal");
    expect(el.props.initialTeacherId).toBe("t-1");
    expect(el.props.teacherList).toHaveLength(2);
    expect(el.props.initialState).toEqual({
      status: "success",
      timetable: WEEK,
    });
    // The switch-teacher re-fetch is the SAME action, handed down as a prop.
    expect(el.props.fetchMemberTimetable).toBe(getTimetable);
  });

  it("shows the empty state and skips the timetable fetch when there are no teachers", async () => {
    getTeachers.mockResolvedValue({
      ok: true,
      data: [],
    } satisfies TeacherListActionResult);

    const el = await renderPage();

    expect(getTimetable).not.toHaveBeenCalled();
    expect(el.props.initialState).toEqual({ status: "empty" });
  });

  it("surfaces the roster errorKey when the teacher list fails", async () => {
    getTeachers.mockResolvedValue({
      ok: false,
      errorKey: "forbidden",
    } satisfies TeacherListActionResult);

    const el = await renderPage();

    expect(getTimetable).not.toHaveBeenCalled();
    expect(el.props.initialState).toEqual({
      status: "error",
      errorKey: "forbidden",
    });
  });

  it("collapses a not-found week into the 'not published yet' empty state", async () => {
    getTeachers.mockResolvedValue({
      ok: true,
      data: [TEACHER],
    } satisfies TeacherListActionResult);
    getTimetable.mockResolvedValue({
      ok: false,
      errorKey: "not-found",
    } satisfies TimetableActionResult);

    const el = await renderPage();

    expect(el.props.initialState).toEqual({ status: "empty" });
  });
});
