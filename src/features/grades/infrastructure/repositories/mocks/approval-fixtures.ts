import type { GradeApprovalBatch } from "../../../domain/entities/grade-approval-batch.entity";
import type {
  BatchScorePreviewRowDto,
  GradeApprovalBatchDto,
} from "../../dtos/grade-approval-batch-response.dto";

export const MOCK_BATCHES: GradeApprovalBatch[] = [
  {
    id: "batch-001",
    className: "10A1",
    subjectName: "Toán",
    teacherName: "Nguyễn Văn A",
    term: "HK1",
    studentCount: 30,
    status: "PENDING_APPROVAL",
    updatedAt: "2025-05-01T10:00:00Z",
  },
  {
    id: "batch-002",
    className: "10A2",
    subjectName: "Ngữ văn",
    teacherName: "Trần Thị B",
    term: "HK1",
    studentCount: 28,
    status: "PUBLISHED",
    updatedAt: "2025-04-28T09:00:00Z",
  },
  {
    id: "batch-003",
    className: "11B1",
    subjectName: "Hóa học",
    teacherName: "Lê Văn C",
    term: "HK1",
    studentCount: 32,
    status: "LOCKED",
    updatedAt: "2025-04-20T08:00:00Z",
  },
  {
    id: "batch-004",
    className: "11B2",
    subjectName: "Vật lý",
    teacherName: "Phạm Thị D",
    term: "HK1",
    studentCount: 25,
    status: "PENDING_APPROVAL",
    updatedAt: "2025-05-03T11:00:00Z",
  },
];

/** Per-batch detail preview rows, keyed by batch id. */
export const MOCK_BATCH_PREVIEW: Record<string, BatchScorePreviewRowDto[]> = {
  "batch-001": [
    { studentName: "Nguyễn Văn An", studentCode: "HS001", average: 8.6 },
    { studentName: "Trần Thị Bình", studentCode: "HS002", average: 7.2 },
    { studentName: "Lê Hoàng Cường", studentCode: "HS003", average: 9.2 },
  ],
  "batch-004": [
    { studentName: "Đỗ Văn Em", studentCode: "HS010", average: 6.5 },
    { studentName: "Vũ Thị Phương", studentCode: "HS011", average: 4.2 },
  ],
};

export const MOCK_BATCH_AVERAGE: Record<string, number | null> = {
  "batch-001": 8.2,
  "batch-002": 7.4,
  "batch-003": 6.9,
  "batch-004": 5.3,
};

export function batchToDto(batch: GradeApprovalBatch): GradeApprovalBatchDto {
  return { ...batch };
}
