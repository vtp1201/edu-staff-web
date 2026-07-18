import type { Invitation } from "../../../domain/entities/invitation.entity";

/**
 * Seed invitations for the permanently-mocked admin invitations list
 * (US-E21.1). Covers all 4 statuses, all 5 role badge colours
 * (teacher/student/parent/manager/admin), and every expiry-countdown variant
 * (normal ≥3d, urgent <3d, expired, and not-applicable for accepted/revoked).
 *
 * NOTE (mock/seed data): invitee names/emails are fixture DATA, not UI copy —
 * not subject to i18n (`.claude/rules/i18n.md`).
 */
const DAY_MS = 86_400_000;
const isoFromNow = (days: number): string =>
  new Date(Date.now() + days * DAY_MS).toISOString();

export const MOCK_INVITATIONS: Invitation[] = [
  {
    invitationId: "inv-1",
    tenantId: "tenant-acme",
    email: "lan.pham@email.com",
    roles: ["teacher"],
    status: "pending",
    invitedBy: "Trần Minh Quân",
    sentAt: isoFromNow(-6),
    expiresAt: isoFromNow(8), // normal countdown
  },
  {
    invitationId: "inv-2",
    tenantId: "tenant-acme",
    email: "hoang.long@student.edu.vn",
    roles: ["student"],
    status: "pending",
    invitedBy: "Nguyễn Thị Hương",
    sentAt: isoFromNow(-12),
    expiresAt: isoFromNow(2), // urgent countdown (<3 days)
  },
  {
    invitationId: "inv-3",
    tenantId: "tenant-acme",
    email: "thu.trang@email.com",
    roles: ["parent"],
    status: "accepted",
    invitedBy: "Trần Minh Quân",
    sentAt: isoFromNow(-20),
    expiresAt: isoFromNow(-6),
  },
  {
    invitationId: "inv-4",
    tenantId: "tenant-acme",
    email: "van.minh@email.com",
    roles: ["teacher"],
    status: "expired",
    invitedBy: "Trần Minh Quân",
    sentAt: isoFromNow(-40),
    expiresAt: isoFromNow(-26),
  },
  {
    invitationId: "inv-5",
    tenantId: "tenant-acme",
    email: "quoc.huy@email.com",
    roles: ["manager"],
    status: "revoked",
    invitedBy: "Trần Minh Quân",
    sentAt: isoFromNow(-30),
    expiresAt: isoFromNow(-16),
  },
  {
    invitationId: "inv-6",
    tenantId: "tenant-acme",
    email: "gia.han@student.edu.vn",
    roles: ["student"],
    status: "expired",
    invitedBy: "Nguyễn Thị Hương",
    sentAt: isoFromNow(-38),
    expiresAt: isoFromNow(-24),
  },
  {
    invitationId: "inv-7",
    tenantId: "tenant-acme",
    email: "system.admin@email.com",
    roles: ["admin"],
    status: "pending",
    invitedBy: "Trần Minh Quân",
    sentAt: isoFromNow(-2),
    expiresAt: isoFromNow(12), // normal countdown
  },
  {
    invitationId: "inv-8",
    tenantId: "tenant-acme",
    email: "phu.huynh@email.com",
    roles: ["parent"],
    status: "pending",
    invitedBy: "Nguyễn Thị Hương",
    sentAt: isoFromNow(-13),
    expiresAt: isoFromNow(1), // urgent countdown (<3 days)
  },
  {
    invitationId: "inv-9",
    tenantId: "tenant-acme",
    email: "bgh.tuan@email.com",
    roles: ["manager"],
    status: "accepted",
    invitedBy: "Trần Minh Quân",
    sentAt: isoFromNow(-18),
    expiresAt: isoFromNow(-4),
  },
];
