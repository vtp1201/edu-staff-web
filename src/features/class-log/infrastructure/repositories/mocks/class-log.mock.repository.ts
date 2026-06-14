import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { HomeroomEntry } from "../../../domain/entities/homeroom-entry.entity";
import type { ClassLogFailure } from "../../../domain/failures/class-log.failure";
import type {
  IClassLogRepository,
  ListEntriesParams,
  ListEntriesResult,
} from "../../../domain/repositories/i-class-log.repository";
import { MOCK_ENTRIES } from "./fixtures";

const genId = () => `e-${Math.random().toString(36).slice(2, 10)}`;

// Module-level mutable in-memory state (reset on each `new` for determinism).
let _entries: HomeroomEntry[] = structuredClone(MOCK_ENTRIES);

function nowIso(): string {
  return new Date().toISOString();
}

export class MockClassLogRepository implements IClassLogRepository {
  constructor() {
    _entries = structuredClone(MOCK_ENTRIES);
  }

  private find(classId: string, entryId: string): HomeroomEntry {
    const entry = _entries.find(
      (e) => e.entryId === entryId && e.classId === classId,
    );
    if (!entry) {
      const failure: ClassLogFailure = { type: "not-found" };
      throw failure;
    }
    return entry;
  }

  async createEntry(
    classId: string,
    entryDate: string,
    summary: string,
    notableEvents?: string,
  ): Promise<HomeroomEntry> {
    await mockDelay();
    const entry: HomeroomEntry = {
      entryId: genId(),
      classId,
      entryDate,
      summary,
      notableEvents,
      status: "DRAFT",
      authorMemberId: "mock-teacher-1",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    _entries = [entry, ..._entries];
    return entry;
  }

  async listEntries(params: ListEntriesParams): Promise<ListEntriesResult> {
    await mockDelay();
    const { fromDate, toDate } = params;
    let entries = _entries.filter((e) => e.classId === params.classId);
    if (fromDate) {
      entries = entries.filter((e) => e.entryDate >= fromDate);
    }
    if (toDate) {
      entries = entries.filter((e) => e.entryDate <= toDate);
    }
    entries = [...entries].sort((a, b) =>
      b.entryDate.localeCompare(a.entryDate),
    );
    return { entries, hasMore: false };
  }

  async submitEntry(classId: string, entryId: string): Promise<HomeroomEntry> {
    await mockDelay();
    const entry = this.find(classId, entryId);
    if (entry.status === "SUBMITTED" || entry.status === "APPROVED") {
      const failure: ClassLogFailure = { type: "already-submitted" };
      throw failure;
    }
    entry.status = "SUBMITTED";
    entry.updatedAt = nowIso();
    return structuredClone(entry);
  }

  async approveEntry(classId: string, entryId: string): Promise<HomeroomEntry> {
    await mockDelay();
    const entry = this.find(classId, entryId);
    if (entry.status !== "SUBMITTED") {
      const failure: ClassLogFailure = { type: "not-submitted" };
      throw failure;
    }
    entry.status = "APPROVED";
    entry.decidedBy = "mock-principal-1";
    entry.decidedAt = nowIso();
    entry.updatedAt = nowIso();
    return structuredClone(entry);
  }

  async rejectEntry(
    classId: string,
    entryId: string,
    reason?: string,
  ): Promise<HomeroomEntry> {
    await mockDelay();
    const entry = this.find(classId, entryId);
    if (entry.status !== "SUBMITTED") {
      const failure: ClassLogFailure = { type: "not-submitted" };
      throw failure;
    }
    entry.status = "REJECTED";
    entry.decidedBy = "mock-principal-1";
    entry.decidedAt = nowIso();
    entry.reason = reason;
    entry.updatedAt = nowIso();
    return structuredClone(entry);
  }
}
