import { describe, expect, it } from "vitest";
import type {
  GradeApprovalBatchDetailDto,
  GradeApprovalBatchDto,
} from "../dtos/grade-approval-batch-response.dto";
import {
  gradeLabel,
  mapBatch,
  mapBatchDetail,
} from "./grade-approval-batch.mapper";

const BATCH_DTO: GradeApprovalBatchDto = {
  id: "batch-001",
  className: "10A1",
  subjectName: "Toán",
  teacherName: "Nguyễn Văn A",
  term: "HK1",
  studentCount: 30,
  status: "PENDING_APPROVAL",
  updatedAt: "2025-05-01T10:00:00Z",
};

describe("gradeLabel", () => {
  it("maps boundary values to the correct band", () => {
    expect(gradeLabel(10)).toBe("Giỏi");
    expect(gradeLabel(8.5)).toBe("Giỏi");
    expect(gradeLabel(8.49)).toBe("Khá");
    expect(gradeLabel(7)).toBe("Khá");
    expect(gradeLabel(6.99)).toBe("Trung bình");
    expect(gradeLabel(5)).toBe("Trung bình");
    expect(gradeLabel(4.9)).toBe("Yếu");
    expect(gradeLabel(3.5)).toBe("Yếu");
    expect(gradeLabel(3.49)).toBe("Kém");
    expect(gradeLabel(0)).toBe("Kém");
  });

  it("returns dash for null", () => {
    expect(gradeLabel(null)).toBe("—");
  });
});

describe("mapBatch", () => {
  it("maps dto to entity and casts status", () => {
    const batch = mapBatch(BATCH_DTO);
    expect(batch.id).toBe("batch-001");
    expect(batch.className).toBe("10A1");
    expect(batch.status).toBe("PENDING_APPROVAL");
    expect(batch.studentCount).toBe(30);
  });
});

describe("mapBatchDetail", () => {
  it("computes distribution counts per band and labels preview rows", () => {
    const dto: GradeApprovalBatchDetailDto = {
      ...BATCH_DTO,
      studentCount: 4,
      averageScore: 7.5,
      previewRows: [
        { studentName: "An", studentCode: "HS001", average: 9 }, // Giỏi
        { studentName: "Bình", studentCode: "HS002", average: 7.2 }, // Khá
        { studentName: "Cường", studentCode: "HS003", average: 5.5 }, // Trung bình
        { studentName: "Dũng", studentCode: "HS004", average: null }, // excluded
      ],
    };

    const detail = mapBatchDetail(dto);

    expect(detail.averageScore).toBe(7.5);
    const counts = Object.fromEntries(
      detail.distribution.map((d) => [d.label, d.count]),
    );
    expect(counts.Giỏi).toBe(1);
    expect(counts.Khá).toBe(1);
    expect(counts["Trung bình"]).toBe(1);
    expect(counts.Yếu).toBe(0);
    expect(counts.Kém).toBe(0);

    expect(detail.previewRows[0]?.gradeLabel).toBe("Giỏi");
    expect(detail.previewRows[3]?.gradeLabel).toBe("—");
  });
});
