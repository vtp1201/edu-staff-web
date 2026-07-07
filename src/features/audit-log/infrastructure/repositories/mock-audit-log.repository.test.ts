import { describe, expect, it } from "vitest";
import type {
  AuditLogPageResult,
  AuditLogResult,
} from "../../domain/repositories/i-audit-log.repository";
import { AUDIT_LOG_PAGE_SIZE } from "../../domain/repositories/i-audit-log.repository";
import {
  AUDIT_LOG_SEED,
  MockAuditLogRepository,
} from "./mock-audit-log.repository";

function unwrap(r: AuditLogResult<AuditLogPageResult>): AuditLogPageResult {
  if (!r.ok) throw new Error("expected ok result");
  return r.value;
}

describe("MockAuditLogRepository — seed", () => {
  it("seeds enough events across every entity type and action", () => {
    expect(AUDIT_LOG_SEED.length).toBeGreaterThanOrEqual(30);
    const types = new Set(AUDIT_LOG_SEED.map((e) => e.entityType));
    expect(types).toEqual(new Set(["grade", "conduct", "record", "setting"]));
    const actions = new Set(AUDIT_LOG_SEED.map((e) => e.action));
    for (const a of [
      "CREATE",
      "UPDATE",
      "DELETE",
      "APPROVE",
      "LOCK",
      "SEAL",
      "UNSEAL",
    ]) {
      expect(actions.has(a as never)).toBe(true);
    }
  });
});

describe("MockAuditLogRepository — ordering & pagination", () => {
  it("returns the first page newest-first, capped at the page size", async () => {
    const repo = new MockAuditLogRepository();
    const page = unwrap(await repo.getAuditLog({}, null, AUDIT_LOG_PAGE_SIZE));

    expect(page.events.length).toBe(AUDIT_LOG_PAGE_SIZE);
    // Newest-first: occurredAt is monotonically non-increasing.
    for (let i = 1; i < page.events.length; i++) {
      expect(page.events[i - 1].occurredAt >= page.events[i].occurredAt).toBe(
        true,
      );
    }
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).not.toBeNull();
  });

  it("walks every event across pages without gaps or overlaps", async () => {
    const repo = new MockAuditLogRepository();
    const seen: string[] = [];
    let cursor: string | null = null;
    // Guard against infinite loops.
    for (let guard = 0; guard < 20; guard++) {
      const page = unwrap(
        await repo.getAuditLog({}, cursor, AUDIT_LOG_PAGE_SIZE),
      );
      seen.push(...page.events.map((e) => e.id));
      if (!page.hasMore) {
        expect(page.nextCursor).toBeNull();
        break;
      }
      cursor = page.nextCursor;
    }
    expect(seen.length).toBe(AUDIT_LOG_SEED.length);
    expect(new Set(seen).size).toBe(AUDIT_LOG_SEED.length);
  });
});

describe("MockAuditLogRepository — filters", () => {
  it("filters by entity type", async () => {
    const repo = new MockAuditLogRepository();
    const page = unwrap(
      await repo.getAuditLog({ entityType: "conduct" }, null, 100),
    );
    expect(page.events.length).toBeGreaterThan(0);
    expect(page.events.every((e) => e.entityType === "conduct")).toBe(true);
  });

  it("filters by action", async () => {
    const repo = new MockAuditLogRepository();
    const page = unwrap(
      await repo.getAuditLog({ action: "DELETE" }, null, 100),
    );
    expect(page.events.length).toBeGreaterThan(0);
    expect(page.events.every((e) => e.action === "DELETE")).toBe(true);
  });

  it("filters by actor query (case-insensitive substring)", async () => {
    const repo = new MockAuditLogRepository();
    const all = unwrap(await repo.getAuditLog({}, null, 100));
    const sampleName = all.events[0].actorName;
    const fragment = sampleName.slice(0, 3).toLowerCase();
    const page = unwrap(
      await repo.getAuditLog({ actorQuery: fragment }, null, 100),
    );
    expect(page.events.length).toBeGreaterThan(0);
    expect(
      page.events.every((e) => e.actorName.toLowerCase().includes(fragment)),
    ).toBe(true);
  });

  it("filters by inclusive date range", async () => {
    const repo = new MockAuditLogRepository();
    const page = unwrap(
      await repo.getAuditLog(
        { from: "2026-06-10", to: "2026-06-12" },
        null,
        100,
      ),
    );
    expect(page.events.length).toBeGreaterThan(0);
    for (const e of page.events) {
      const day = e.occurredAt.slice(0, 10);
      expect(day >= "2026-06-10" && day <= "2026-06-12").toBe(true);
    }
  });

  it("combines filters (entity type + action)", async () => {
    const repo = new MockAuditLogRepository();
    const page = unwrap(
      await repo.getAuditLog(
        { entityType: "record", action: "SEAL" },
        null,
        100,
      ),
    );
    expect(
      page.events.every(
        (e) => e.entityType === "record" && e.action === "SEAL",
      ),
    ).toBe(true);
  });

  it("returns an empty page (no cursor) when nothing matches", async () => {
    const repo = new MockAuditLogRepository();
    const page = unwrap(
      await repo.getAuditLog({ actorQuery: "no-such-actor-zzz" }, null, 100),
    );
    expect(page.events).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});
