import type { MemberSummary } from "@/features/iam-directory/domain/entities/member-summary.entity";
import type {
  StaffActorRole,
  StaffLeaveRequestEntity,
  StaffLeaveStatus,
  StaffLeaveType,
} from "../../domain/entities/staff-leave-request.entity";
import type {
  StaffLeaveResponseDto,
  StaffLeaveStateDto,
  StaffLeaveTypeDto,
} from "../dtos/staff-leave-response.dto";

/** Wire `state` → domain status. There is no literal `pending` on the wire. */
export const STATUS_BY_WIRE: Record<StaffLeaveStateDto, StaffLeaveStatus> = {
  SUBMITTED: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

/** Domain status → wire `state` (the list endpoint's `status` query param). */
export const WIRE_BY_STATUS: Record<StaffLeaveStatus, StaffLeaveStateDto> = {
  pending: "SUBMITTED",
  approved: "APPROVED",
  rejected: "REJECTED",
};

/** Wire `leaveType` → domain leave type (US-170). */
export const LEAVE_TYPE_BY_WIRE: Record<StaffLeaveTypeDto, StaffLeaveType> = {
  ANNUAL: "annual",
  SICK: "sick",
  PERSONAL: "personal",
  FAMILY: "family",
};

/**
 * Decorative avatar tints, all existing semantic tokens. The pick is a stable
 * hash of the member id — a cosmetic, deterministic choice (same precedent as
 * the messaging room tones), never data.
 */
const AVATAR_TONES = [
  "var(--edu-primary)",
  "var(--edu-success)",
  "var(--edu-warning)",
  "var(--edu-purple)",
  "var(--edu-teal)",
  "var(--edu-info)",
] as const;

export function avatarToneFor(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i += 1) {
    hash = (hash * 31 + memberId.charCodeAt(i)) % 100000;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** Derive 2-letter initials from a full name; `?` when unusable. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  const last = parts[parts.length - 1][0] ?? "";
  const first = parts.length > 1 ? (parts[0][0] ?? "") : "";
  return (last + first).toUpperCase() || "?";
}

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY`; unparseable input passes through. */
export function toDisplayDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * RFC3339 → `DD/MM/YYYY HH:mm` in **UTC** — deterministic and locale-stable
 * for tests/CI (same precedent as the announcements mapper).
 */
export function toDisplayDateTime(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}` +
    ` ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
}

/**
 * Inclusive day span between two ISO dates — BE returns the range, not a
 * count, so the card's "N ngày" is derived (never below 1).
 */
export function daysBetween(startIso: string, endIso: string): number {
  const start = Date.parse(`${startIso}T00:00:00Z`);
  const end = Date.parse(`${endIso}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  const span = Math.floor((end - start) / 86_400_000) + 1;
  return span > 0 ? span : 1;
}

/** TEACHER → teacher badge, any other resolved role → staff badge. */
function toStaffRole(member: MemberSummary | undefined): StaffActorRole | null {
  if (!member?.roles || member.roles.length === 0) return null;
  return member.roles.includes("TEACHER") ? "teacher" : "staff";
}

export const StaffLeaveMapper = {
  /**
   * @param members `memberId → MemberSummary`, resolved in ONE batch call per
   *   page by the repository. A missing entry degrades the row to its raw id
   *   (cosmetic), never an error.
   */
  toEntity(
    dto: StaffLeaveResponseDto,
    members: Map<string, MemberSummary>,
  ): StaffLeaveRequestEntity {
    const staff = members.get(dto.staffMemberId);
    const staffName = staff?.displayName ?? dto.staffMemberId;
    const status = STATUS_BY_WIRE[dto.state] ?? "pending";
    const decidedAt = toDisplayDateTime(dto.updatedAt);
    const approver = dto.approverMemberId
      ? (members.get(dto.approverMemberId)?.displayName ?? dto.approverMemberId)
      : null;
    const wireType = dto.leaveType ?? null;

    return {
      id: dto.requestId,
      staffId: dto.staffMemberId,
      staffName,
      initials: staff?.displayName ? initialsOf(staff.displayName) : "?",
      avatarTone: avatarToneFor(dto.staffMemberId),
      staffRole: toStaffRole(staff),
      // Both nulls are preserved AS NULL and never merged into a shared
      // "unknown" value — presentation renders a different placeholder for
      // each (legacy gap vs ongoing no-assignment state).
      department: dto.department ?? null,
      leaveType: wireType ? (LEAVE_TYPE_BY_WIRE[wireType] ?? null) : null,
      startDate: toDisplayDate(dto.startDate),
      endDate: toDisplayDate(dto.endDate),
      days: daysBetween(dto.startDate, dto.endDate),
      reason: dto.reason,
      status,
      submittedAt: toDisplayDateTime(dto.createdAt) ?? dto.createdAt,
      approvedBy: status === "approved" ? approver : null,
      approvedAt: status === "approved" ? decidedAt : null,
      rejectedBy: status === "rejected" ? approver : null,
      rejectedAt: status === "rejected" ? decidedAt : null,
      rejectionReason: dto.rejectionReason ?? null,
    };
  },
};
