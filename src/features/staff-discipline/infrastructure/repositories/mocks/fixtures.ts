import type { StaffRosterEntry } from "../../../domain/entities/staff-roster.entity";
import type { StaffConductNoteResponseDto } from "../../dtos/staff-conduct-note-response.dto";
import type { StaffViolationResponseDto } from "../../dtos/staff-violation-response.dto";

/**
 * Deterministic mock fixtures (US-E09.5, spec §6 "Required fixtures").
 * Adapted from `design_src/edu/staff-discipline.jsx` (`SD_STAFF_ROSTER`,
 * `SD_SEED_VIOLATIONS`, `SD_SEED_CONDUCT_NOTES`, `SD_CURRENT_ADMIN`,
 * `SD_OTHER_ADMIN`, `SD_TERMS`, `SD_SELF_STAFF_ID`). Names/departments/notes are
 * mock DATA, not i18n copy.
 *
 * Anti-demo rule: nothing here is random or time-dependent — every
 * security-relevant fixture is reachable through a NAMED const so the lock /
 * self-approved / forbidden assertions are reproducible.
 */

/** The signed-in BGH/`principal` persona (author + usual approver). */
export const SD_CURRENT_ADMIN_ID = "admin-1";
/** A second BGH member — used only to build the non-self approval fixtures. */
export const SD_OTHER_ADMIN_ID = "admin-2";
/** The staff member the `teacher` self-view is scoped to. */
export const SD_SELF_STAFF_ID = "staff-1";

/**
 * Term picklist. Labels are DATA (a real BE would return term names), not i18n
 * copy — so they intentionally live here and not in `messages/*.json`.
 */
export const SD_TERMS = [
  { id: "HK1-2025-2026", label: "Học kỳ 1 — 2025–2026" },
  { id: "HK2-2024-2025", label: "Học kỳ 2 — 2024–2025" },
] as const;

export const SD_TERM_IDS: readonly string[] = SD_TERMS.map((t) => t.id);
export const SD_DEFAULT_TERM_ID = SD_TERMS[0].id;

export const SD_STAFF_ROSTER: readonly StaffRosterEntry[] = [
  {
    staffMemberId: "staff-1",
    staffName: "Nguyễn Thị Hương",
    department: "Tổ Toán",
    initials: "NH",
  },
  {
    staffMemberId: "staff-2",
    staffName: "Trần Văn Minh",
    department: "Tổ Lý-Hoá",
    initials: "TM",
  },
  {
    staffMemberId: "staff-3",
    staffName: "Lê Thị Hoa",
    department: "Tổ Lý-Hoá",
    initials: "LH",
  },
  {
    staffMemberId: "staff-4",
    staffName: "Đỗ Thị Mai",
    department: "Tổ Ngoại Ngữ",
    initials: "DM",
  },
  {
    staffMemberId: "staff-5",
    staffName: "Phạm Quốc Bảo",
    department: "Tổ Văn-Sử",
    initials: "PB",
  },
] as const;

// --- Named, security-relevant fixture handles -------------------------------

/** SUBMITTED violation — the approve/reject happy-path target. */
export const MOCK_SUBMITTED_VIOLATION_ID = "sv-001";
/** DRAFT violation authored by SD_CURRENT_ADMIN — the submit happy-path target. */
export const MOCK_DRAFT_VIOLATION_ID = "sv-002";
/** APPROVED violation with approver === author → `selfApproved: true`. */
export const MOCK_SELF_APPROVED_VIOLATION_ID = "sv-003";
/** REJECTED violation carrying a populated `rejectionReason`. */
export const MOCK_REJECTED_VIOLATION_ID = "sv-005";
/** DRAFT violation authored by the OTHER admin — submit must be forbidden. */
export const MOCK_FOREIGN_DRAFT_VIOLATION_ID = "sv-006";

/**
 * The dedicated APPROVED conduct-note key used to reproduce
 * `STAFF_CONDUCT_NOTE_LOCKED` (409) deterministically (NFR-009 / AC-009.6).
 * A named const, never a random/toggled state.
 */
export const MOCK_LOCKED_CONDUCT_NOTE_KEY = {
  termId: "HK1-2025-2026",
  staffMemberId: "staff-1",
} as const;

/** APPROVED conduct note whose approver === author → `selfApproved: true`. */
export const MOCK_SELF_APPROVED_CONDUCT_NOTE_KEY = {
  termId: "HK1-2025-2026",
  staffMemberId: "staff-5",
} as const;

/** DRAFT conduct note — submit / overwrite happy-path target. */
export const MOCK_DRAFT_CONDUCT_NOTE_KEY = {
  termId: "HK1-2025-2026",
  staffMemberId: "staff-4",
} as const;

/** SUBMITTED conduct note — approve/reject happy-path target. */
export const MOCK_SUBMITTED_CONDUCT_NOTE_KEY = {
  termId: "HK1-2025-2026",
  staffMemberId: "staff-2",
} as const;

// --- Seeds -------------------------------------------------------------------

/** Fresh copies per call so each `new MockStaffDisciplineRepository()` is clean. */
export function seedStaffViolations(): StaffViolationResponseDto[] {
  return [
    {
      recordId: MOCK_SUBMITTED_VIOLATION_ID,
      staffMemberId: "staff-4",
      category: "Đi làm muộn / vắng không phép",
      description:
        "Vào lớp trễ 20 phút không báo trước, không có giáo viên dạy thay.",
      severity: "MODERATE",
      occurredAt: "2026-05-04",
      state: "SUBMITTED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      createdAt: "2026-05-04T09:10:00Z",
      updatedAt: "2026-05-04T09:10:00Z",
    },
    {
      recordId: MOCK_DRAFT_VIOLATION_ID,
      staffMemberId: "staff-2",
      category: "Vi phạm quy chế chuyên môn",
      description:
        "Không nộp giáo án đúng hạn quy định 2 lần liên tiếp trong tháng.",
      severity: "MINOR",
      occurredAt: "2026-04-28",
      state: "DRAFT",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      createdAt: "2026-04-29T08:00:00Z",
      updatedAt: "2026-04-29T08:00:00Z",
    },
    {
      // selfApproved: true (author === approver) — ADR 0073 common case.
      recordId: MOCK_SELF_APPROVED_VIOLATION_ID,
      staffMemberId: SD_SELF_STAFF_ID,
      category: "Vi phạm quy định trang phục/tác phong",
      description:
        "Trang phục không đúng quy định trong buổi lễ chào cờ đầu tuần.",
      severity: "MINOR",
      occurredAt: "2026-04-14",
      state: "APPROVED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      approverMemberId: SD_CURRENT_ADMIN_ID,
      createdAt: "2026-04-14T07:40:00Z",
      updatedAt: "2026-04-15T08:00:00Z",
    },
    {
      recordId: "sv-004",
      staffMemberId: "staff-5",
      category: "Ứng xử không đúng mực với HS/PH",
      description:
        "Phụ huynh phản ánh thái độ chưa đúng mực khi trao đổi qua điện thoại.",
      severity: "SEVERE",
      occurredAt: "2026-04-02",
      state: "APPROVED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      approverMemberId: SD_OTHER_ADMIN_ID,
      createdAt: "2026-04-02T15:20:00Z",
      updatedAt: "2026-04-05T09:00:00Z",
    },
    {
      recordId: MOCK_REJECTED_VIOLATION_ID,
      staffMemberId: "staff-3",
      category: "Đi làm muộn / vắng không phép",
      description: "Đến muộn tiết coi thi giữa kỳ 15 phút.",
      severity: "MODERATE",
      occurredAt: "2026-03-20",
      state: "REJECTED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      approverMemberId: SD_OTHER_ADMIN_ID,
      rejectionReason:
        "Có xác nhận của bảo vệ trường về sự cố tắc đường bất khả kháng — không tính vi phạm.",
      createdAt: "2026-03-20T07:50:00Z",
      updatedAt: "2026-03-21T08:10:00Z",
    },
    {
      // DRAFT authored by the OTHER admin → the signed-in principal must NOT be
      // offered (or allowed) a submit on it (AC-003.2 + server backstop).
      recordId: MOCK_FOREIGN_DRAFT_VIOLATION_ID,
      staffMemberId: "staff-3",
      category: "Khác",
      description: "Ghi nhận nháp do thành viên BGH khác lập, chờ hoàn thiện.",
      severity: "MINOR",
      occurredAt: "2026-05-06",
      state: "DRAFT",
      authorMemberId: SD_OTHER_ADMIN_ID,
      createdAt: "2026-05-06T08:00:00Z",
      updatedAt: "2026-05-06T08:00:00Z",
    },
  ];
}

export function seedStaffConductNotes(): StaffConductNoteResponseDto[] {
  return [
    {
      // APPROVED → the deterministic LOCKED fixture (NFR-009).
      ...MOCK_LOCKED_CONDUCT_NOTE_KEY,
      rating: "SATISFACTORY",
      note: "Hoàn thành tốt nhiệm vụ chuyên môn, tích cực tham gia hoạt động tổ bộ môn.",
      state: "APPROVED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      approverMemberId: SD_OTHER_ADMIN_ID,
      createdAt: "2026-01-10T09:00:00Z",
      updatedAt: "2026-01-20T10:00:00Z",
    },
    {
      ...MOCK_SUBMITTED_CONDUCT_NOTE_KEY,
      rating: "NEEDS_IMPROVEMENT",
      note: "Chậm tiến độ nộp báo cáo chuyên môn 2/3 kỳ; đã nhắc nhở trực tiếp.",
      state: "SUBMITTED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      createdAt: "2026-05-01T09:00:00Z",
      updatedAt: "2026-05-02T09:00:00Z",
    },
    {
      ...MOCK_DRAFT_CONDUCT_NOTE_KEY,
      rating: "SATISFACTORY",
      note: "Đáp ứng tốt yêu cầu công việc, chủ động hỗ trợ đồng nghiệp.",
      state: "DRAFT",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      createdAt: "2026-05-03T11:15:00Z",
      updatedAt: "2026-05-03T11:15:00Z",
    },
    {
      // selfApproved: true + UNSATISFACTORY rating tier.
      ...MOCK_SELF_APPROVED_CONDUCT_NOTE_KEY,
      rating: "UNSATISFACTORY",
      note: "Vi phạm nội quy tác phong nhiều lần trong kỳ, đã lập biên bản 2 lần.",
      state: "APPROVED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      approverMemberId: SD_CURRENT_ADMIN_ID,
      createdAt: "2026-01-05T09:00:00Z",
      updatedAt: "2026-01-18T14:00:00Z",
    },
    {
      // 2nd term represented (SD_TERMS[1]) + REJECTED with a reason.
      termId: "HK2-2024-2025",
      staffMemberId: "staff-3",
      rating: "NEEDS_IMPROVEMENT",
      note: "Cần chủ động hơn trong hoạt động chuyên môn của tổ.",
      state: "REJECTED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      approverMemberId: SD_OTHER_ADMIN_ID,
      rejectionReason: "Cần bổ sung minh chứng cụ thể trước khi phê duyệt.",
      createdAt: "2025-05-10T09:00:00Z",
      updatedAt: "2025-05-12T09:00:00Z",
    },
    {
      // 2nd term, own record for the teacher self-view.
      termId: "HK2-2024-2025",
      staffMemberId: SD_SELF_STAFF_ID,
      rating: "SATISFACTORY",
      note: "Giữ vững chất lượng giảng dạy, phối hợp tốt với phụ huynh.",
      state: "APPROVED",
      authorMemberId: SD_CURRENT_ADMIN_ID,
      approverMemberId: SD_CURRENT_ADMIN_ID,
      createdAt: "2025-05-02T09:00:00Z",
      updatedAt: "2025-05-06T09:00:00Z",
    },
  ];
}
