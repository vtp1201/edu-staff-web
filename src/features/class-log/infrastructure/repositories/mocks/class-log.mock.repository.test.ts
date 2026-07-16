/**
 * Behaviour tests — MockClassLogRepository state machine (US-E18.10).
 * The mock must model the real BE transitions truthfully:
 *   DRAFT → SUBMITTED (submit) → APPROVED / REJECTED (approve/reject)
 *   REJECTED → SUBMITTED (revise)
 * and reject duplicate (classId, entryDate) creates. Any illegal transition
 * throws { type: "invalid-transition" }. Each `new` reseeds from fixtures.
 */
import { describe, expect, it } from "vitest";
import type { ClassLogFailure } from "../../../domain/failures/class-log.failure";
import { MockClassLogRepository } from "./class-log.mock.repository";

const CLASS = "11b2";
const DRAFT = "e-mock-1";
const SUBMITTED = "e-mock-2";
const APPROVED = "e-mock-3";
const REJECTED = "e-mock-4";

function expectFailure(err: unknown, type: ClassLogFailure["type"]) {
  expect((err as ClassLogFailure).type).toBe(type);
}

describe("MockClassLogRepository — createEntry", () => {
  it("throws already-exists for a duplicate (classId, entryDate)", async () => {
    const repo = new MockClassLogRepository();
    // e-mock-1 already occupies 2026-04-29 for class 11b2.
    await expect(
      repo.createEntry(CLASS, "2026-04-29", "Bài mới"),
    ).rejects.toMatchObject({ type: "already-exists" });
  });

  it("creates a DRAFT entry for a free date", async () => {
    const repo = new MockClassLogRepository();
    const entry = await repo.createEntry(CLASS, "2026-05-01", "Bài mới");
    expect(entry.status).toBe("DRAFT");
    expect(entry.entryDate).toBe("2026-05-01");
  });
});

describe("MockClassLogRepository — submitEntry (DRAFT only)", () => {
  it("submits a DRAFT entry", async () => {
    const repo = new MockClassLogRepository();
    const entry = await repo.submitEntry(CLASS, DRAFT);
    expect(entry.status).toBe("SUBMITTED");
  });

  it("throws invalid-transition submitting a non-DRAFT entry", async () => {
    const repo = new MockClassLogRepository();
    try {
      await repo.submitEntry(CLASS, SUBMITTED);
      throw new Error("expected throw");
    } catch (err) {
      expectFailure(err, "invalid-transition");
    }
  });
});

describe("MockClassLogRepository — reviseEntry (REJECTED only)", () => {
  it("revises a REJECTED entry back to SUBMITTED, clearing the decision", async () => {
    const repo = new MockClassLogRepository();
    const entry = await repo.reviseEntry(CLASS, REJECTED);
    expect(entry.status).toBe("SUBMITTED");
    expect(entry.decidedBy).toBeUndefined();
    expect(entry.decidedAt).toBeUndefined();
    expect(entry.reason).toBeUndefined();
  });

  it("throws invalid-transition revising a non-REJECTED entry", async () => {
    const repo = new MockClassLogRepository();
    try {
      await repo.reviseEntry(CLASS, DRAFT);
      throw new Error("expected throw");
    } catch (err) {
      expectFailure(err, "invalid-transition");
    }
  });
});

describe("MockClassLogRepository — approve/reject (SUBMITTED only)", () => {
  it("approves a SUBMITTED entry", async () => {
    const repo = new MockClassLogRepository();
    const entry = await repo.approveEntry(CLASS, SUBMITTED);
    expect(entry.status).toBe("APPROVED");
  });

  it("rejects a SUBMITTED entry with a reason", async () => {
    const repo = new MockClassLogRepository();
    const entry = await repo.rejectEntry(CLASS, SUBMITTED, "Thiếu");
    expect(entry.status).toBe("REJECTED");
    expect(entry.reason).toBe("Thiếu");
  });

  it("throws invalid-transition approving a non-SUBMITTED entry", async () => {
    const repo = new MockClassLogRepository();
    try {
      await repo.approveEntry(CLASS, APPROVED);
      throw new Error("expected throw");
    } catch (err) {
      expectFailure(err, "invalid-transition");
    }
  });

  it("throws invalid-transition rejecting a non-SUBMITTED entry", async () => {
    const repo = new MockClassLogRepository();
    try {
      await repo.rejectEntry(CLASS, DRAFT, "x");
      throw new Error("expected throw");
    } catch (err) {
      expectFailure(err, "invalid-transition");
    }
  });
});
