import type {
  ClassOption,
  SealBatchStatus,
  SealedStudentOption,
  TenantAdminSummary,
  UnsealRequest,
} from "../../../domain/entities/seal-batch.entity";

/**
 * US-E14.6 seal/unseal mock fixtures — ported from
 * `design_src/edu/academic-records.jsx` (AR_* seed data). Mock/seed data is NOT
 * i18n copy (names, subjects, class codes stay verbatim per i18n.md).
 */

export const MOCK_TENANT_ADMINS: TenantAdminSummary[] = [
  { id: "admin-1", name: "Trần Minh Quân" },
  { id: "admin-2", name: "Lê Thị Mai" },
  { id: "admin-3", name: "Phạm Quốc Bảo" },
];

export const MOCK_SEAL_BATCHES: SealBatchStatus[] = [
  {
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    subjectLabel: "Toán",
    allLocked: true,
    totalStudents: 5,
    unlockedStudents: 0,
    unlockedSubjectNames: [],
    status: "SEALED",
    sealedAt: "2026-01-15T14:32:00.000Z",
    sealedBy: "Trần Minh Quân",
    resealCount: 1, // US-E18.13 — already sealed once; idempotent reseal still allowed (< cap 5)
  },
  {
    classId: "11B2",
    term: "HK1",
    year: "2025-2026",
    subjectLabel: "Toán",
    allLocked: true,
    totalStudents: 6,
    unlockedStudents: 0,
    unlockedSubjectNames: [],
    status: "PENDING",
    sealedAt: null,
    sealedBy: null,
  },
  {
    classId: "10A1",
    term: "HK1",
    year: "2025-2026",
    subjectLabel: "Toán",
    allLocked: false,
    totalStudents: 8,
    unlockedStudents: 3,
    unlockedSubjectNames: ["Toán", "Ngữ văn", "Tiếng Anh"],
    status: "PENDING",
    sealedAt: null,
    sealedBy: null,
  },
  {
    classId: "10A2",
    term: "HK1",
    year: "2025-2026",
    subjectLabel: "Toán",
    allLocked: false,
    totalStudents: 5,
    unlockedStudents: 2,
    unlockedSubjectNames: ["Toán", "Vật lý"],
    status: "PENDING",
    sealedAt: null,
    sealedBy: null,
  },
];

export const MOCK_CLASS_OPTIONS: ClassOption[] = [
  { classId: "10A1", className: "Lớp 10A1" },
  { classId: "10A2", className: "Lớp 10A2" },
  { classId: "11B2", className: "Lớp 11B2" },
  { classId: "12C1", className: "Lớp 12C1" },
];

export const MOCK_SEALED_STUDENTS: SealedStudentOption[] = [
  {
    studentId: "s-12C1-1",
    studentName: "Lê Hoàng Nhật",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    sealedAt: "2026-01-15T14:32:00.000Z",
  },
  {
    studentId: "s-12C1-2",
    studentName: "Đinh Thị Quỳnh",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    sealedAt: "2026-01-15T14:32:00.000Z",
  },
  {
    studentId: "s-12C1-3",
    studentName: "Phạm Hữu Phúc",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    sealedAt: "2026-01-15T14:32:00.000Z",
  },
  {
    studentId: "s-12C1-4",
    studentName: "Vũ Khánh Linh",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    sealedAt: "2026-01-15T14:32:00.000Z",
  },
  {
    studentId: "s-12C1-5",
    studentName: "Bùi Tuấn Kiệt",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    sealedAt: "2026-01-15T14:32:00.000Z",
  },
];

export const MOCK_UNSEAL_REQUESTS: UnsealRequest[] = [
  {
    id: "ur-1",
    studentId: "s-12C1-3",
    studentName: "Phạm Hữu Phúc",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    reason:
      "Sai sót khi nhập điểm Văn cuối kỳ — giáo viên đã rà soát và xác nhận điểm đúng là 7.5 thay vì 5.5. Cần mở học bạ để cập nhật giá trị chính xác.",
    requestedById: "admin-1",
    requestedByName: "Trần Minh Quân",
    requestedAt: "2026-02-19T10:22:00.000Z",
    status: "PENDING",
    coSignerId: null,
    coSignerName: null,
    confirmedAt: null,
    selfApproved: false,
  },
  {
    id: "ur-2",
    studentId: "s-11B2-9",
    studentName: "Nguyễn Hoàng Nam",
    classId: "11B2",
    term: "HK1",
    year: "2025-2026",
    reason:
      "Học sinh chuyển trường vào giữa kỳ. Cần cập nhật học bạ với điểm từ trường cũ theo công văn 142/SGD ngày 12/02/2026.",
    requestedById: "admin-2",
    requestedByName: "Lê Thị Mai",
    requestedAt: "2026-02-22T08:45:00.000Z",
    status: "PENDING",
    coSignerId: null,
    coSignerName: null,
    confirmedAt: null,
    selfApproved: false,
  },
  {
    id: "ur-3",
    studentId: "s-11B2-3",
    studentName: "Trần Quốc Việt",
    classId: "11B2",
    term: "HK1",
    year: "2025-2026",
    reason:
      "Phụ huynh khiếu nại điểm Toán giữa kỳ. Sau khi BGH rà soát biên bản và đối chiếu bài kiểm tra, cần điều chỉnh từ 6.0 → 7.0.",
    requestedById: "admin-1",
    requestedByName: "Trần Minh Quân",
    requestedAt: "2026-02-10T16:30:00.000Z",
    status: "APPROVED",
    coSignerId: "admin-2",
    coSignerName: "Lê Thị Mai",
    confirmedAt: "2026-02-11T09:00:00.000Z",
    selfApproved: false,
  },
];

export const MOCK_SEAL_AUDIT_TRAIL_SEED = [
  {
    id: "au-1",
    classId: "12C1",
    term: "HK1" as const,
    year: "2025-2026",
    actorName: "Trần Minh Quân",
    action: "SEAL" as const,
    occurredAt: "2026-01-15T14:32:00.000Z",
  },
  {
    id: "au-2",
    classId: "11B2",
    term: "HK1" as const,
    year: "2025-2026",
    actorName: "Lê Thị Mai",
    action: "UNSEAL" as const,
    occurredAt: "2026-02-11T09:00:00.000Z",
  },
];
