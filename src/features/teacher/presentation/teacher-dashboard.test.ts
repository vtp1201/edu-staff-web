import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * US-E24.8 deep-link assembly. The dashboard's RSC wrapper is the only place
 * the "Tiết sắp dạy" / "Bài chờ chấm" rows become class-hub links, and the tab
 * differs per list (a period goes to the timetable, a grading task to the
 * roster). A row whose entity carries no `classId` (the real repo ships none
 * yet) must get NO href — a dead link is worse than plain text.
 */

const exec = vi.fn();

vi.mock("@/bootstrap/di/teacher-dashboard.di", () => ({
  makeGetTeacherDashboardUseCase: async () => ({ execute: exec }),
}));

const STATS = {
  totalStudents: 140,
  totalClasses: 4,
  classesToday: 3,
  pendingGradesCount: 23,
  pendingApprovalCount: 4,
  newMessagesCount: 5,
};

async function renderDashboard() {
  const { TeacherDashboard } = await import("./teacher-dashboard");
  const el = (await TeacherDashboard({
    locale: "vi",
    tenant: "t1",
  })) as unknown as {
    props: {
      vm: {
        scheduleItems: Array<{ classHref?: string }>;
        pendingGradeItems: Array<{ classHref?: string }>;
      };
    };
  };
  return el.props.vm;
}

beforeEach(() => vi.clearAllMocks());

describe("TeacherDashboard — class-hub deep links (US-E24.8)", () => {
  it("a schedule row with a classId links to the TIMETABLE tab", async () => {
    exec.mockResolvedValue({
      ok: true,
      data: {
        stats: STATS,
        scheduleItems: [
          {
            period: 3,
            subject: "Toán học",
            className: "11B2",
            room: "P.203",
            status: "live",
            classId: "cls-11b2",
          },
        ],
        pendingGradeItems: [],
        notifications: [],
      },
    });

    const vm = await renderDashboard();
    expect(vm.scheduleItems[0].classHref).toBe(
      "/vi/t/t1/teacher/classes/cls-11b2?tab=timetable",
    );
  });

  it("a pending-grade row with a classId links to the STUDENTS tab (different tab, same class)", async () => {
    exec.mockResolvedValue({
      ok: true,
      data: {
        stats: STATS,
        scheduleItems: [],
        pendingGradeItems: [
          {
            studentName: "Nguyễn Văn An",
            assessmentType: "KT 15 phút",
            className: "10A1",
            classId: "cls-10a1",
          },
        ],
        notifications: [],
      },
    });

    const vm = await renderDashboard();
    expect(vm.pendingGradeItems[0].classHref).toBe(
      "/vi/t/t1/teacher/classes/cls-10a1?tab=students",
    );
  });

  it("rows without a classId (today's real repo) carry NO href — no dead links", async () => {
    exec.mockResolvedValue({
      ok: true,
      data: {
        stats: STATS,
        scheduleItems: [
          {
            period: 1,
            subject: "Toán học",
            className: "10A1",
            room: "P.201",
            status: "done",
          },
        ],
        pendingGradeItems: [
          {
            studentName: "Trần Thị Bình",
            assessmentType: "Bài tập",
            className: "11B2",
          },
        ],
        notifications: [],
      },
    });

    const vm = await renderDashboard();
    expect(vm.scheduleItems[0].classHref).toBeUndefined();
    expect(vm.pendingGradeItems[0].classHref).toBeUndefined();
  });

  it("a failed dashboard read still renders an empty VM (no crash, no links)", async () => {
    exec.mockResolvedValue({ ok: false, error: { type: "network-error" } });
    const vm = await renderDashboard();
    expect(vm.scheduleItems).toEqual([]);
    expect(vm.pendingGradeItems).toEqual([]);
  });
});
