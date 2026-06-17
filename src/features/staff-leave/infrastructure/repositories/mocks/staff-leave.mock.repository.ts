import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  StaffLeaveRequestEntity,
  StaffLeaveStatus,
} from "../../../domain/entities/staff-leave-request.entity";
import type {
  IStaffLeaveRepository,
  StaffLeaveActionResult,
  StaffLeaveResult,
} from "../../../domain/repositories/i-staff-leave.repository";

const APPROVER_NAME = "Trần Minh Quân (BGH)";

/** "DD/MM/YYYY HH:mm" timestamp for the current moment (vi locale, 24h). */
function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Seed data adapted from design_src/edu/staff-leave.jsx (SL_SEED_REQUESTS).
 * Names / departments / reasons are mock *data* (not i18n copy). Avatar tones
 * map the design's palette refs to runtime CSS variables.
 */
function seed(): StaffLeaveRequestEntity[] {
  return [
    {
      id: "sl-001",
      staffId: "u-001",
      staffName: "Nguyễn Thị Hương",
      initials: "NH",
      avatarTone: "var(--edu-primary)",
      staffRole: "teacher",
      department: "Tổ Toán",
      leaveType: "sick",
      startDate: "03/05/2026",
      endDate: "03/05/2026",
      days: 1,
      reason:
        "Khám sức khoẻ định kỳ tại BV Bạch Mai theo lịch hẹn từ tuần trước. Có giấy hẹn đính kèm.",
      status: "pending",
      submittedAt: "29/04/2026 09:10",
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    {
      id: "sl-002",
      staffId: "u-002",
      staffName: "Đỗ Thị Mai",
      initials: "DM",
      avatarTone: "var(--edu-warning)",
      staffRole: "teacher",
      department: "Tổ Ngoại Ngữ",
      leaveType: "sick",
      startDate: "29/04/2026",
      endDate: "30/04/2026",
      days: 2,
      reason:
        "Bị cảm sốt từ tối qua, có giấy chứng nhận của phòng khám tư. Sẽ gửi đề thi thay thế qua email.",
      status: "pending",
      submittedAt: "29/04/2026 07:00",
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    {
      id: "sl-003",
      staffId: "u-003",
      staffName: "Hoàng Văn Trí",
      initials: "HT",
      avatarTone: "var(--edu-teal)",
      staffRole: "staff",
      department: "Bộ phận Bảo vệ",
      leaveType: "family",
      startDate: "05/05/2026",
      endDate: "06/05/2026",
      days: 2,
      reason: "Đám cưới em ruột tại quê. Đã sắp xếp người trực thay ca bảo vệ.",
      status: "pending",
      submittedAt: "24/04/2026 18:45",
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    {
      id: "sl-004",
      staffId: "u-004",
      staffName: "Trần Văn Minh",
      initials: "TM",
      avatarTone: "var(--edu-purple)",
      staffRole: "teacher",
      department: "Tổ Lý-Hoá",
      leaveType: "annual",
      startDate: "12/05/2026",
      endDate: "14/05/2026",
      days: 3,
      reason:
        "Tham dự hội thảo chuyên môn Vật Lý cấp tỉnh tại TP.HCM — có giấy mời từ Sở GD.",
      status: "approved",
      submittedAt: "20/04/2026 14:00",
      approvedBy: APPROVER_NAME,
      approvedAt: "21/04/2026 09:30",
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    {
      id: "sl-005",
      staffId: "u-005",
      staffName: "Lê Thị Hoa",
      initials: "LH",
      avatarTone: "var(--edu-success)",
      staffRole: "teacher",
      department: "Tổ Lý-Hoá",
      leaveType: "family",
      startDate: "30/04/2026",
      endDate: "01/05/2026",
      days: 2,
      reason:
        "Đám tang người thân — cần về quê gấp. Đã gửi giáo án và đề bài thay thế cho tổ trưởng.",
      status: "approved",
      submittedAt: "29/04/2026 06:20",
      approvedBy: APPROVER_NAME,
      approvedAt: "29/04/2026 06:45",
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    {
      id: "sl-006",
      staffId: "u-006",
      staffName: "Phạm Thị Nga",
      initials: "PN",
      avatarTone: "var(--edu-error)",
      staffRole: "staff",
      department: "Phòng Văn thư",
      leaveType: "personal",
      startDate: "02/05/2026",
      endDate: "02/05/2026",
      days: 1,
      reason: "Xử lý thủ tục hành chính cá nhân tại UBND phường.",
      status: "approved",
      submittedAt: "27/04/2026 11:00",
      approvedBy: APPROVER_NAME,
      approvedAt: "28/04/2026 08:15",
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
    },
    {
      id: "sl-007",
      staffId: "u-007",
      staffName: "Phạm Quốc Bảo",
      initials: "PB",
      avatarTone: "var(--edu-teal)",
      staffRole: "teacher",
      department: "Tổ Văn-Sử",
      leaveType: "annual",
      startDate: "02/05/2026",
      endDate: "04/05/2026",
      days: 3,
      reason:
        "Nghỉ phép năm theo lịch — đi du lịch cùng gia đình. Đã được tổ trưởng phê duyệt sơ bộ.",
      status: "rejected",
      submittedAt: "26/04/2026 11:00",
      approvedBy: null,
      approvedAt: null,
      rejectedBy: APPROVER_NAME,
      rejectedAt: "27/04/2026 10:00",
      rejectionReason:
        "Trùng lịch hội nghị giáo viên toàn trường (03/05). Vui lòng dời sang tuần sau.",
    },
    {
      id: "sl-008",
      staffId: "u-008",
      staffName: "Nguyễn Văn Lộc",
      initials: "NL",
      avatarTone: "var(--edu-warning)",
      staffRole: "staff",
      department: "Bộ phận Vệ sinh",
      leaveType: "sick",
      startDate: "28/04/2026",
      endDate: "28/04/2026",
      days: 1,
      reason: "Đau lưng cấp tính — đã đi khám và có đơn thuốc.",
      status: "rejected",
      submittedAt: "28/04/2026 07:00",
      approvedBy: null,
      approvedAt: null,
      rejectedBy: APPROVER_NAME,
      rejectedAt: "28/04/2026 07:30",
      rejectionReason:
        "Đơn nộp sau khi ca làm việc đã bắt đầu — cần nộp trước 06:00. Vui lòng tuân thủ quy trình.",
    },
  ];
}

export class MockStaffLeaveRepository implements IStaffLeaveRepository {
  // Module-instance mutable state; fresh on each `new` for determinism.
  private requests: StaffLeaveRequestEntity[] = seed();

  async listRequests(filter?: {
    status?: StaffLeaveStatus;
  }): Promise<StaffLeaveResult<StaffLeaveRequestEntity[]>> {
    await mockDelay();
    const value = filter?.status
      ? this.requests.filter((r) => r.status === filter.status)
      : this.requests;
    return { ok: true, value: value.map((r) => ({ ...r })) };
  }

  async approve(id: string): Promise<StaffLeaveActionResult> {
    await mockDelay();
    const req = this.requests.find((r) => r.id === id);
    if (!req) return { ok: false, error: { type: "not-found" } };
    if (req.status !== "pending") {
      return { ok: false, error: { type: "already-processed" } };
    }
    req.status = "approved";
    req.approvedBy = APPROVER_NAME;
    req.approvedAt = nowStamp();
    return { ok: true };
  }

  async reject(id: string, reason: string): Promise<StaffLeaveActionResult> {
    await mockDelay();
    const req = this.requests.find((r) => r.id === id);
    if (!req) return { ok: false, error: { type: "not-found" } };
    if (req.status !== "pending") {
      return { ok: false, error: { type: "already-processed" } };
    }
    req.status = "rejected";
    req.rejectedBy = APPROVER_NAME;
    req.rejectedAt = nowStamp();
    req.rejectionReason = reason;
    return { ok: true };
  }
}
