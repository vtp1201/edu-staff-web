import type { Invitation } from "../../../domain/entities/invitation.entity";

/**
 * Seed invitations for the admin invitations list in MOCK mode (US-E21.1;
 * re-shaped onto the real `InvitationListItem` fields in US-E18.29 — no
 * `tenantId`, `sentAt` → `createdAt`). Covers all 4 statuses, all 5 role badge colours
 * (teacher/student/parent/manager/admin), and every expiry-countdown variant
 * (normal ≥3d, urgent <3d, expired, and not-applicable for accepted/revoked).
 *
 * NOTE (mock/seed data): invitee names/emails are fixture DATA, not UI copy —
 * not subject to i18n (`.claude/rules/i18n.md`). `invitedBy` holds a display
 * NAME here (not the raw userId the real wire carries) because mock mode wires
 * an identity name-resolver — see `bootstrap/di/admin-invitations.di.ts`.
 */
const DAY_MS = 86_400_000;
const isoFromNow = (days: number): string =>
  new Date(Date.now() + days * DAY_MS).toISOString();

export const MOCK_INVITATIONS: Invitation[] = [
  {
    invitationId: "inv-1",
    email: "lan.pham@email.com",
    roles: ["teacher"],
    status: "pending",
    invitedBy: "Trần Minh Quân",
    createdAt: isoFromNow(-6),
    expiresAt: isoFromNow(8), // normal countdown
  },
  {
    invitationId: "inv-2",
    email: "hoang.long@student.edu.vn",
    roles: ["student"],
    status: "pending",
    invitedBy: "Nguyễn Thị Hương",
    createdAt: isoFromNow(-12),
    expiresAt: isoFromNow(2), // urgent countdown (<3 days)
  },
  {
    invitationId: "inv-3",
    email: "thu.trang@email.com",
    roles: ["parent"],
    status: "accepted",
    invitedBy: "Trần Minh Quân",
    createdAt: isoFromNow(-20),
    expiresAt: isoFromNow(-6),
  },
  {
    invitationId: "inv-4",
    email: "van.minh@email.com",
    roles: ["teacher"],
    status: "expired",
    invitedBy: "Trần Minh Quân",
    createdAt: isoFromNow(-40),
    expiresAt: isoFromNow(-26),
  },
  {
    invitationId: "inv-5",
    email: "quoc.huy@email.com",
    roles: ["manager"],
    status: "revoked",
    invitedBy: "Trần Minh Quân",
    createdAt: isoFromNow(-30),
    expiresAt: isoFromNow(-16),
  },
  {
    invitationId: "inv-6",
    email: "gia.han@student.edu.vn",
    roles: ["student"],
    status: "expired",
    invitedBy: "Nguyễn Thị Hương",
    createdAt: isoFromNow(-38),
    expiresAt: isoFromNow(-24),
  },
  {
    invitationId: "inv-7",
    email: "system.admin@email.com",
    roles: ["admin"],
    status: "pending",
    invitedBy: "Trần Minh Quân",
    createdAt: isoFromNow(-2),
    expiresAt: isoFromNow(12), // normal countdown
  },
  {
    invitationId: "inv-8",
    email: "phu.huynh@email.com",
    roles: ["parent"],
    status: "pending",
    invitedBy: "Nguyễn Thị Hương",
    createdAt: isoFromNow(-13),
    expiresAt: isoFromNow(1), // urgent countdown (<3 days)
  },
  {
    invitationId: "inv-9",
    email: "bgh.tuan@email.com",
    roles: ["manager"],
    status: "accepted",
    invitedBy: "Trần Minh Quân",
    createdAt: isoFromNow(-18),
    expiresAt: isoFromNow(-4),
  },
];
