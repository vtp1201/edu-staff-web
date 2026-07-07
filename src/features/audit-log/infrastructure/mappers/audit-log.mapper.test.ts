import { describe, expect, it } from "vitest";
import type { AuditEventResponseDto } from "../dtos/audit-event-response.dto";
import { toAuditEvent } from "./audit-log.mapper";

function makeDto(
  over: Partial<AuditEventResponseDto> = {},
): AuditEventResponseDto {
  return {
    id: "log-1041",
    occurredAt: "2026-06-13T09:42:11.000Z",
    actorId: "admin-1",
    actorName: "Trần Minh Quân",
    actorRole: "admin",
    action: "UPDATE",
    entityType: "grade",
    entityId: "gr-12c1-math-ck-001",
    entityLabel: "Toán · Cuối kỳ",
    beforeValue: "8.5",
    afterValue: "9.0",
    ...over,
  };
}

describe("toAuditEvent", () => {
  it("maps every field one-to-one for a well-formed dto", () => {
    const dto = makeDto();
    expect(toAuditEvent(dto)).toEqual({
      id: "log-1041",
      occurredAt: "2026-06-13T09:42:11.000Z",
      actorId: "admin-1",
      actorName: "Trần Minh Quân",
      actorRole: "admin",
      action: "UPDATE",
      entityType: "grade",
      entityId: "gr-12c1-math-ck-001",
      entityLabel: "Toán · Cuối kỳ",
      beforeValue: "8.5",
      afterValue: "9.0",
    });
  });

  it("keeps every known action verbatim", () => {
    for (const action of [
      "CREATE",
      "UPDATE",
      "DELETE",
      "APPROVE",
      "LOCK",
      "SEAL",
      "UNSEAL",
    ]) {
      expect(toAuditEvent(makeDto({ action })).action).toBe(action);
    }
  });

  it("falls back to UPDATE for an unknown action", () => {
    expect(toAuditEvent(makeDto({ action: "MYSTERY" })).action).toBe("UPDATE");
  });

  it("keeps every known entity type verbatim", () => {
    for (const entityType of ["grade", "conduct", "record", "setting"]) {
      expect(toAuditEvent(makeDto({ entityType })).entityType).toBe(entityType);
    }
  });

  it("falls back to setting for an unknown entity type", () => {
    expect(toAuditEvent(makeDto({ entityType: "widget" })).entityType).toBe(
      "setting",
    );
  });

  it("preserves null before/after values (state-only actions)", () => {
    const event = toAuditEvent(
      makeDto({ action: "SEAL", beforeValue: null, afterValue: null }),
    );
    expect(event.beforeValue).toBeNull();
    expect(event.afterValue).toBeNull();
  });

  it("preserves object before/after values without stringifying", () => {
    const event = toAuditEvent(
      makeDto({ beforeValue: { score: 5 }, afterValue: { score: 6 } }),
    );
    expect(event.beforeValue).toEqual({ score: 5 });
    expect(event.afterValue).toEqual({ score: 6 });
  });
});
