import { describe, expect, it, vi } from "vitest";
import type { TeacherDashboardStats } from "../entities/dashboard-stats.entity";
import type { NotificationItem } from "../entities/notification-item.entity";
import type { PendingGradeItem } from "../entities/pending-grade-item.entity";
import type { ScheduleItem } from "../entities/schedule-item.entity";
import type {
  ITeacherDashboardRepository,
  Result,
} from "../repositories/i-teacher-dashboard.repository";
import { GetTeacherDashboardUseCase } from "./get-teacher-dashboard.use-case";

const STATS: TeacherDashboardStats = {
  totalStudents: 0,
  classesToday: 3,
  pendingGradesCount: 23,
  pendingApprovalCount: 4,
  newMessagesCount: 5,
};
const SCHEDULE: ScheduleItem[] = [
  {
    period: 1,
    subject: "Toán",
    className: "10A1",
    room: "P.201",
    status: "done",
  },
];
const GRADES: PendingGradeItem[] = [
  {
    studentName: "Nguyễn Văn An",
    assessmentType: "KT 15 phút",
    className: "10A1",
  },
];
const NOTIFS: NotificationItem[] = [
  {
    icon: "calendar",
    color: "primary",
    message: "Họp",
    timeAgo: "30 phút trước",
  },
];

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

function makeRepo(
  over: Partial<ITeacherDashboardRepository> = {},
): ITeacherDashboardRepository {
  return {
    getTotalStudents: vi.fn().mockResolvedValue(ok(140)),
    getScheduleItems: vi.fn().mockResolvedValue(ok(SCHEDULE)),
    getPendingGradeItems: vi.fn().mockResolvedValue(ok(GRADES)),
    getDashboardStats: vi.fn().mockResolvedValue(ok(STATS)),
    getNotifications: vi.fn().mockResolvedValue(ok(NOTIFS)),
    ...over,
  };
}

describe("GetTeacherDashboardUseCase", () => {
  it("calls all five repository methods", async () => {
    const repo = makeRepo();
    await new GetTeacherDashboardUseCase(repo).execute();
    expect(repo.getTotalStudents).toHaveBeenCalledOnce();
    expect(repo.getScheduleItems).toHaveBeenCalledOnce();
    expect(repo.getPendingGradeItems).toHaveBeenCalledOnce();
    expect(repo.getDashboardStats).toHaveBeenCalledOnce();
    expect(repo.getNotifications).toHaveBeenCalledOnce();
  });

  it("returns composed data with totalStudents overriding stats", async () => {
    const repo = makeRepo();
    const res = await new GetTeacherDashboardUseCase(repo).execute();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.stats.totalStudents).toBe(140);
      expect(res.data.stats.classesToday).toBe(3);
      expect(res.data.scheduleItems).toEqual(SCHEDULE);
      expect(res.data.pendingGradeItems).toEqual(GRADES);
      expect(res.data.notifications).toEqual(NOTIFS);
    }
  });

  it("propagates the first failure when getTotalStudents fails", async () => {
    const repo = makeRepo({
      getTotalStudents: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "network-error" } }),
    });
    const res = await new GetTeacherDashboardUseCase(repo).execute();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("network-error");
  });

  it("propagates unauthorized failure from any method", async () => {
    const repo = makeRepo({
      getDashboardStats: vi
        .fn()
        .mockResolvedValue({ ok: false, error: { type: "unauthorized" } }),
    });
    const res = await new GetTeacherDashboardUseCase(repo).execute();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });
});
