import { describe, expect, it } from "vitest";
import type { AuditEntityType } from "../../../domain/entities/audit-event.entity";
import { auditBadgeTone } from "./audit-badge-tone";

describe("auditBadgeTone", () => {
  it("maps entity type → tone for non-delete actions", () => {
    expect(auditBadgeTone("grade", "UPDATE")).toBe("success");
    expect(auditBadgeTone("conduct", "UPDATE")).toBe("warning");
    expect(auditBadgeTone("record", "SEAL")).toBe("primary");
    expect(auditBadgeTone("setting", "CREATE")).toBe("info");
  });

  it("always returns error for DELETE regardless of entity type", () => {
    const types: AuditEntityType[] = ["grade", "conduct", "record", "setting"];
    for (const t of types) {
      expect(auditBadgeTone(t, "DELETE")).toBe("error");
    }
  });
});
