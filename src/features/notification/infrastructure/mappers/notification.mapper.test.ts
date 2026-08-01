/**
 * Unit tests for the notification mappers (US-E10.2, reshaped US-E18.25).
 *
 * Real wire = i18n key + scalar params (no locale branching anywhere in the
 * mapper — translation happens at presentation only, ADR 0066 / i18n.md).
 */
import { describe, expect, it } from "vitest";
import {
  isKnownBodyKey,
  isKnownTitleKey,
  UNKNOWN_BODY_KEY,
  UNKNOWN_TITLE_KEY,
} from "../../domain/entities/notification-message-key";
import type {
  MockNotificationResponseDto,
  NotificationResponseDto,
} from "../dtos/notification-response.dto";
import { mapMockNotification, mapNotification } from "./notification.mapper";

function makeDto(
  overrides: Partial<NotificationResponseDto> = {},
): NotificationResponseDto {
  return {
    id: "n-1",
    type: "discipline",
    titleKey: "notification_discipline_violation_title",
    titleParams: { severity: "MINOR" },
    bodyKey: "notification_discipline_violation_body",
    bodyParams: {
      severity: "MINOR",
      occurredAt: "2026-07-20T08:15:00Z",
      classId: "c-1",
      studentMemberId: "m-1",
      recordId: "r-1",
    },
    ts: "2025-11-01T08:00:00.000Z",
    read: false,
    ...overrides,
  };
}

function makeMockDto(
  overrides: Partial<MockNotificationResponseDto> = {},
): MockNotificationResponseDto {
  return {
    id: "n-1",
    type: "grade",
    titleVi: "Kết quả học tập",
    titleEn: "Academic results",
    bodyVi: "Điểm Toán đã cập nhật",
    bodyEn: "Math score updated",
    ts: "2025-11-01T08:00:00.000Z",
    read: false,
    ...overrides,
  };
}

describe("mapNotification (real)", () => {
  it("maps id, type, ts, read straight through", () => {
    const entity = mapNotification(makeDto({ read: true }));
    expect(entity.id).toBe("n-1");
    expect(entity.type).toBe("discipline");
    expect(entity.ts).toBe("2025-11-01T08:00:00.000Z");
    expect(entity.read).toBe(true);
  });

  it("maps titleKey/titleParams/bodyKey/bodyParams straight through (no locale branching)", () => {
    const entity = mapNotification(makeDto());
    expect(entity.titleKey).toBe("notification_discipline_violation_title");
    expect(entity.titleParams).toEqual({ severity: "MINOR" });
    expect(entity.bodyKey).toBe("notification_discipline_violation_body");
    expect(entity.bodyParams.severity).toBe("MINOR");
    expect(entity.bodyParams.occurredAt).toBe("2026-07-20T08:15:00Z");
  });

  it("defaults missing params to an empty object (never undefined)", () => {
    const dto = makeDto();
    // Simulate a wire row that omits the param maps entirely.
    const bare = {
      ...dto,
      titleParams: undefined,
      bodyParams: undefined,
    } as unknown as NotificationResponseDto;
    const entity = mapNotification(bare);
    expect(entity.titleParams).toEqual({});
    expect(entity.bodyParams).toEqual({});
  });

  it("maps known types correctly", () => {
    for (const type of [
      "grade",
      "attendance",
      "discipline",
      "announcement",
      "system",
    ] as const) {
      expect(mapNotification(makeDto({ type })).type).toBe(type);
    }
  });

  it("coerces unknown type to 'system'", () => {
    expect(mapNotification(makeDto({ type: "unknown_future_type" })).type).toBe(
      "system",
    );
  });

  it("passes an unknown titleKey through untouched (presentation owns the fallback)", () => {
    const entity = mapNotification(
      makeDto({ titleKey: "notification_future_unseen_title" }),
    );
    expect(entity.titleKey).toBe("notification_future_unseen_title");
    expect(isKnownTitleKey(entity.titleKey)).toBe(false);
  });
});

describe("mapMockNotification (mock)", () => {
  it("emits a known producer key-pair for each real-producer fixture type", () => {
    for (const type of ["grade", "attendance", "discipline"] as const) {
      const entity = mapMockNotification(makeMockDto({ type }));
      expect(isKnownTitleKey(entity.titleKey)).toBe(true);
      expect(isKnownBodyKey(entity.bodyKey)).toBe(true);
    }
  });

  it("falls back to the unknown key-pair for types with no real producer", () => {
    for (const type of ["announcement", "system"] as const) {
      const entity = mapMockNotification(makeMockDto({ type }));
      expect(entity.titleKey).toBe(UNKNOWN_TITLE_KEY);
      expect(entity.bodyKey).toBe(UNKNOWN_BODY_KEY);
    }
  });

  it("emits plausible scalar params and never the vi/en free-text fields", () => {
    const entity = mapMockNotification(makeMockDto({ type: "discipline" }));
    expect(entity.titleParams.severity).toBe("MINOR");
    expect(entity.bodyParams.occurredAt).toBe("2025-11-01T08:00:00.000Z");
    const serialised = JSON.stringify(entity);
    expect(serialised).not.toContain("Kết quả học tập");
    expect(serialised).not.toContain("Math score updated");
  });

  it("never emits a UUID-style param", () => {
    const entity = mapMockNotification(makeMockDto({ type: "discipline" }));
    for (const params of [entity.titleParams, entity.bodyParams]) {
      expect(Object.keys(params)).not.toContain("classId");
      expect(Object.keys(params)).not.toContain("studentMemberId");
      expect(Object.keys(params)).not.toContain("recordId");
    }
  });

  it("preserves id, type, ts, read", () => {
    const entity = mapMockNotification(makeMockDto({ read: true }));
    expect(entity.id).toBe("n-1");
    expect(entity.type).toBe("grade");
    expect(entity.ts).toBe("2025-11-01T08:00:00.000Z");
    expect(entity.read).toBe(true);
  });

  it("coerces unknown type to 'system'", () => {
    expect(mapMockNotification(makeMockDto({ type: "nope" })).type).toBe(
      "system",
    );
  });
});
