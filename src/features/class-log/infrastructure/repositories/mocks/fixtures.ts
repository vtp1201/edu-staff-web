import "server-only";
import type { HomeroomEntry } from "../../../domain/entities/homeroom-entry.entity";

/**
 * Seed data for MockClassLogRepository (development fallback).
 * Mock/seed data is NOT i18n — these are data, not UI copy.
 * classId "11b2" mirrors the design source default class.
 */
export const MOCK_ENTRIES: HomeroomEntry[] = [
  {
    entryId: "e-mock-1",
    classId: "11b2",
    entryDate: "2026-04-29",
    summary: "Đạo hàm và ứng dụng — Bài 3: Cực trị hàm số",
    notableEvents: "Lớp tham gia sôi nổi, hoàn thành tốt bài tập tại lớp.",
    status: "DRAFT",
    authorMemberId: "mock-teacher-1",
    createdAt: "2026-04-29T01:00:00Z",
    updatedAt: "2026-04-29T01:00:00Z",
  },
  {
    entryId: "e-mock-2",
    classId: "11b2",
    entryDate: "2026-04-28",
    summary: "Hình học không gian — Quan hệ vuông góc",
    notableEvents: "Hai học sinh vắng có phép.",
    status: "SUBMITTED",
    authorMemberId: "mock-teacher-1",
    createdAt: "2026-04-28T01:00:00Z",
    updatedAt: "2026-04-28T02:00:00Z",
  },
  {
    entryId: "e-mock-3",
    classId: "11b2",
    entryDate: "2026-04-27",
    summary: "Nguyên hàm — Phương pháp đổi biến",
    status: "APPROVED",
    authorMemberId: "mock-teacher-1",
    decidedBy: "mock-principal-1",
    decidedAt: "2026-04-27T05:00:00Z",
    createdAt: "2026-04-27T01:00:00Z",
    updatedAt: "2026-04-27T05:00:00Z",
  },
  {
    entryId: "e-mock-4",
    classId: "11b2",
    entryDate: "2026-04-26",
    summary: "Tích phân — Bài tập tổng hợp",
    notableEvents: "Cần bổ sung nội dung bài tập về nhà.",
    status: "REJECTED",
    authorMemberId: "mock-teacher-1",
    decidedBy: "mock-principal-1",
    decidedAt: "2026-04-26T05:00:00Z",
    reason: "Thiếu nội dung bài tập về nhà, đề nghị bổ sung.",
    createdAt: "2026-04-26T01:00:00Z",
    updatedAt: "2026-04-26T05:00:00Z",
  },
];
