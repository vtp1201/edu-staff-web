import { describe, expect, it } from "vitest";
import type {
  GradeApprovalBatchDetailDto,
  GradeApprovalBatchDto,
} from "../dtos/grade-approval-batch-response.dto";
import {
  gradeBandKey,
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

describe("gradeBandKey", () => {
  it("maps boundary values to the correct band key", () => {
    expect(gradeBandKey(10)).toBe("excellent");
    expect(gradeBandKey(8.5)).toBe("excellent");
    expect(gradeBandKey(8.49)).toBe("good");
    expect(gradeBandKey(7)).toBe("good");
    expect(gradeBandKey(6.99)).toBe("average");
    expect(gradeBandKey(5)).toBe("average");
    expect(gradeBandKey(4.9)).toBe("weak");
    expect(gradeBandKey(3.5)).toBe("weak");
    expect(gradeBandKey(3.49)).toBe("poor");
    expect(gradeBandKey(0)).toBe("poor");
  });

  it("returns poor for null", () => {
    expect(gradeBandKey(null)).toBe("poor");
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
      detail.distribution.map((d) => [d.key, d.count]),
    );
    expect(counts.excellent).toBe(1);
    expect(counts.good).toBe(1);
    expect(counts.average).toBe(1);
    expect(counts.weak).toBe(0);
    expect(counts.poor).toBe(0);

    expect(detail.previewRows[0]?.gradeBandKey).toBe("excellent");
    expect(detail.previewRows[3]?.gradeBandKey).toBe("poor");
  });
});
