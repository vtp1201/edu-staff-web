/**
 * Unit tests for NotificationMapper (US-E10.2).
 */
import { describe, expect, it } from "vitest";
import type { NotificationResponseDto } from "../dtos/notification-response.dto";
import { mapNotification } from "./notification.mapper";

function makeDto(
  overrides: Partial<NotificationResponseDto> = {},
): NotificationResponseDto {
  return {
    id: "n-1",
    type: "grade",
    titleVi: "Kết quả học tập",
    titleEn: "Academic results",
    bodyVi: "Điểm Toán kỳ 1 đã được cập nhật",
    bodyEn: "Math semester 1 score updated",
    ts: "2025-11-01T08:00:00.000Z",
    read: false,
    ...overrides,
  };
}

describe("mapNotification", () => {
  it("maps vi locale to Vietnamese title and body", () => {
    const entity = mapNotification(makeDto(), "vi");
    expect(entity.title).toBe("Kết quả học tập");
    expect(entity.body).toBe("Điểm Toán kỳ 1 đã được cập nhật");
  });

  it("maps en locale to English title and body", () => {
    const entity = mapNotification(makeDto(), "en");
    expect(entity.title).toBe("Academic results");
    expect(entity.body).toBe("Math semester 1 score updated");
  });

  it("falls back to vi title when en title is empty", () => {
    const entity = mapNotification(makeDto({ titleEn: "" }), "en");
    expect(entity.title).toBe("Kết quả học tập");
  });

  it("preserves id, type, ts, read flag", () => {
    const entity = mapNotification(makeDto({ read: true }), "vi");
    expect(entity.id).toBe("n-1");
    expect(entity.type).toBe("grade");
    expect(entity.ts).toBe("2025-11-01T08:00:00.000Z");
    expect(entity.read).toBe(true);
  });

  it("maps known types correctly", () => {
    for (const type of [
      "grade",
      "attendance",
      "discipline",
      "announcement",
      "system",
    ] as const) {
      const entity = mapNotification(makeDto({ type }), "vi");
      expect(entity.type).toBe(type);
    }
  });

  it("coerces unknown type to 'system'", () => {
    const entity = mapNotification(
      makeDto({ type: "unknown_future_type" }),
      "vi",
    );
    expect(entity.type).toBe("system");
  });
});
