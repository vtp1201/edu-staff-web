import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  AnnouncementEntity,
  AnnouncementRecipient,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../../../domain/entities/announcement.entity";
import type { AnnouncementFailure } from "../../../domain/failures/announcement.failure";
import type {
  AnnouncementListFilter,
  IAnnouncementRepository,
} from "../../../domain/repositories/i-announcement.repository";
import {
  mapAnnouncement,
  mapRecipient,
} from "../../mappers/announcement.mapper";
import { MOCK_ANNOUNCEMENTS, MOCK_RECIPIENTS } from "./fixtures";

function fail(type: AnnouncementFailure["type"]): never {
  const failure: AnnouncementFailure = { type };
  throw failure;
}

/** Static recipient-estimate table for the create drawer (mock copy). */
const RECIPIENT_ESTIMATE: Record<string, number> = {
  all: 1280,
  teachers: 42,
  parents: 768,
  students: 480,
};

function estimateRecipients(audience: string[]): number {
  if (audience.includes("all")) return RECIPIENT_ESTIMATE.all;
  return audience.reduce((sum, a) => sum + (RECIPIENT_ESTIMATE[a] ?? 0), 0);
}

function seed(): AnnouncementEntity[] {
  return MOCK_ANNOUNCEMENTS.map(mapAnnouncement);
}

// Module-level mutable state for deterministic in-process mutation.
let _items: AnnouncementEntity[] = seed();
let _seq = 100;

export class MockAnnouncementRepository implements IAnnouncementRepository {
  constructor() {
    // Reset to fixture state on each instantiation (per-request DI factory).
    _items = seed();
  }

  async listAnnouncements(
    filter: AnnouncementListFilter,
  ): Promise<AnnouncementEntity[]> {
    await mockDelay(200);
    if (filter === "all") return [..._items];
    return _items.filter((i) => i.status === filter);
  }

  async createAnnouncement(
    input: CreateAnnouncementInput,
  ): Promise<AnnouncementEntity> {
    await mockDelay(250);
    const now = new Date();
    const isScheduled = input.sendMode === "scheduled";
    const entity: AnnouncementEntity = {
      id: `anc-${++_seq}`,
      title: input.title,
      body: input.body,
      priority: input.priority,
      status: isScheduled ? "scheduled" : "sent",
      audience: input.audience,
      gradeFilter: input.gradeFilter,
      recipientCount: estimateRecipients(input.audience),
      readCount: 0,
      scheduledAt: isScheduled ? input.scheduledAt : null,
      sentAt: isScheduled
        ? null
        : now.toISOString().slice(0, 16).replace("T", " "),
      createdAt: now.toISOString().slice(0, 16).replace("T", " "),
      authorName: "Quản trị viên",
    };
    _items = [entity, ..._items];
    return entity;
  }

  async updateAnnouncement(
    input: UpdateAnnouncementInput,
  ): Promise<AnnouncementEntity> {
    await mockDelay(250);
    const idx = _items.findIndex((i) => i.id === input.id);
    const isScheduled = input.sendMode === "scheduled";
    const base = idx >= 0 ? _items[idx] : undefined;
    const status: AnnouncementEntity["status"] =
      base?.status === "sent" ? "sent" : isScheduled ? "scheduled" : "draft";
    const entity: AnnouncementEntity = {
      id: input.id,
      title: input.title,
      body: input.body,
      priority: input.priority,
      status,
      audience: input.audience,
      gradeFilter: input.gradeFilter,
      recipientCount: estimateRecipients(input.audience),
      readCount: base?.readCount ?? 0,
      scheduledAt: isScheduled ? input.scheduledAt : null,
      sentAt: base?.sentAt ?? null,
      createdAt:
        base?.createdAt ??
        new Date().toISOString().slice(0, 16).replace("T", " "),
      authorName: base?.authorName ?? "Quản trị viên",
    };
    if (idx >= 0) {
      _items = _items.map((i, n) => (n === idx ? entity : i));
    } else {
      _items = [entity, ..._items];
    }
    return entity;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await mockDelay(200);
    const idx = _items.findIndex((i) => i.id === id);
    if (idx < 0) fail("not-found");
    _items = _items.filter((i) => i.id !== id);
  }

  async getRecipients(id: string): Promise<AnnouncementRecipient[]> {
    await mockDelay(200);
    if (!_items.some((i) => i.id === id)) fail("not-found");
    return MOCK_RECIPIENTS.map(mapRecipient);
  }

  async sendReminder(id: string): Promise<{ unreadCount: number }> {
    await mockDelay(200);
    if (!_items.some((i) => i.id === id)) fail("not-found");
    const unreadCount = MOCK_RECIPIENTS.filter((r) => r.readAt === null).length;
    return { unreadCount };
  }
}
