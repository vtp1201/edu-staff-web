import "server-only";
import type { LinkCandidate } from "../../domain/entities/link-candidate.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type { ParentStudentLink } from "../../domain/entities/parent-student-link.entity";
import type { ParentStudentLinkFailure } from "../../domain/failures/parent-student-link.failure";
import type {
  AuthContext,
  CreateLinkInput,
  IParentStudentLinkRepository,
  ListLinksFilter,
  ListLinksPage,
} from "../../domain/repositories/i-parent-student-link.repository";
import {
  CANDIDATE_SEARCH_CAP,
  PARENT_LINKS_PAGE_SIZE,
} from "../../domain/repositories/i-parent-student-link.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";

type PSLResult<T> = Result<T, ParentStudentLinkFailure>;

/** The tenant this mock's admin operates in. */
export const MOCK_TENANT_ID = "tenant-acme";
/** A foreign tenant used ONLY by the cross-tenant forbidden test (AC-005.5). */
export const MOCK_OTHER_TENANT_ID = "tenant-other";

/** Internal store row = entity + its owning tenant (tenant is never displayed). */
interface SeededLink extends ParentStudentLink {
  tenantId: string;
}

/** Raw member pool row carrying role + tenant so search can scope server-side. */
interface RawMember extends LinkCandidate {
  role: "student" | "parent" | "teacher";
  tenantId: string;
}

// ── Candidate pools (INT-005/INT-006) ────────────────────────────────────────
// Deliberately includes members that MUST be filtered out by the searches:
//   - a parent in MOCK_OTHER_TENANT_ID (cross-tenant → never returned, NFR-008)
//   - a teacher in MOCK_TENANT_ID (wrong role → never returned by parent search)
const RAW_STUDENTS: RawMember[] = [
  {
    memberId: "st1",
    fullName: "Nguyễn Minh Khoa",
    className: "11A2",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "st2",
    fullName: "Nguyễn Thị Lan Anh",
    className: "8B1",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "st3",
    fullName: "Trần Quốc Bảo",
    className: "11A2",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "st4",
    fullName: "Lê Thảo Vy",
    className: "10C3",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "st5",
    fullName: "Phạm Gia Huy",
    className: "8B1",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "st6",
    fullName: "Hoàng Mai Chi",
    className: "12A1",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "st7",
    fullName: "Vũ Đức Anh",
    className: "10C3",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "st8",
    fullName: "Đặng Thu Hà",
    className: "12A1",
    role: "student",
    tenantId: MOCK_TENANT_ID,
  },
];

const RAW_PARENTS: RawMember[] = [
  {
    memberId: "pa1",
    fullName: "Nguyễn Văn Bình",
    phone: "0912 345 678",
    role: "parent",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "pa2",
    fullName: "Trần Thị Mai",
    phone: "0987 654 321",
    role: "parent",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "pa3",
    fullName: "Lê Văn Hùng",
    phone: "0903 222 111",
    role: "parent",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "pa4",
    fullName: "Phạm Thị Thu",
    phone: "0938 555 444",
    role: "parent",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "pa5",
    fullName: "Hoàng Văn Sơn",
    phone: "0972 888 999",
    role: "parent",
    tenantId: MOCK_TENANT_ID,
  },
  {
    memberId: "pa6",
    fullName: "Vũ Thị Ngọc",
    phone: "0966 777 888",
    role: "parent",
    tenantId: MOCK_TENANT_ID,
  },
  // MUST NEVER appear in parent search (NFR-008 proofs):
  {
    memberId: "pa-foreign",
    fullName: "Cross Tenant Parent",
    phone: "0900 000 000",
    role: "parent",
    tenantId: MOCK_OTHER_TENANT_ID,
  },
  {
    memberId: "te-1",
    fullName: "Giáo Viên Không Phải PH",
    phone: "0900 111 222",
    role: "teacher",
    tenantId: MOCK_TENANT_ID,
  },
];

const STUDENT_BY_ID = new Map(RAW_STUDENTS.map((s) => [s.memberId, s]));
const PARENT_BY_ID = new Map(RAW_PARENTS.map((p) => [p.memberId, p]));

// ── Consent detail seed (INT-004) ────────────────────────────────────────────
const CONSENT_SEED: Record<
  string,
  Omit<ParentStudentConsent, "studentId" | "parentId">
> = {
  agreed: { disciplineAlerts: true, absenceAlerts: true, gradeAlerts: true },
  pending: {
    disciplineAlerts: false,
    absenceAlerts: false,
    gradeAlerts: false,
  },
  declined: {
    disciplineAlerts: false,
    absenceAlerts: false,
    gradeAlerts: false,
  },
};

function seedLink(
  linkId: string,
  studentId: string,
  parentId: string,
  relationship: SeededLink["relationship"],
  consentStatus: SeededLink["consentStatus"],
  linkedOn: string,
  note?: string,
): SeededLink {
  const st = STUDENT_BY_ID.get(studentId);
  const pa = PARENT_BY_ID.get(parentId);
  return {
    linkId,
    studentId,
    studentName: st?.fullName ?? studentId,
    studentClassName: st?.className ?? "",
    parentId,
    parentName: pa?.fullName ?? parentId,
    parentPhone: pa?.phone ?? "",
    relationship,
    note,
    consentStatus,
    linkedOn,
    tenantId: MOCK_TENANT_ID,
  };
}

/** ≥8 links across ≥2 classes, mixed consent, ≥1 with a note (plan.md Phase 2). */
function freshSeed(): SeededLink[] {
  return [
    seedLink("l1", "st1", "pa1", "father", "agreed", "2025-08-12"),
    seedLink("l2", "st2", "pa1", "father", "pending", "2025-08-12"),
    seedLink("l3", "st3", "pa2", "mother", "agreed", "2025-08-20"),
    seedLink(
      "l4",
      "st4",
      "pa3",
      "father",
      "declined",
      "2025-09-05",
      "PH yêu cầu chỉ liên hệ qua điện thoại.",
    ),
    seedLink(
      "l5",
      "st5",
      "pa4",
      "guardian",
      "pending",
      "2025-09-14",
      "Người giám hộ hợp pháp (quyết định số 128/QĐ).",
    ),
    seedLink("l6", "st6", "pa5", "father", "agreed", "2025-10-02"),
    seedLink("l7", "st7", "pa3", "father", "pending", "2025-10-10"),
    seedLink("l8", "st8", "pa6", "mother", "declined", "2025-10-18"),
  ];
}

// Module-level mutable store — persists across per-request DI instances so a
// create/unlink is reflected by the next list refetch within a server session.
let STORE: SeededLink[] = freshSeed();

/** Test-only: restore the seed between tests (module-level store is shared). */
export function __resetMockParentLinks(): void {
  STORE = freshSeed();
}

function stripTenant(link: SeededLink): ParentStudentLink {
  const { tenantId: _t, ...entity } = link;
  return entity;
}

/**
 * In-memory `IParentStudentLinkRepository` (US-E20.1, mock-first, decision 0014).
 *
 * HIGH-RISK enforcement boundary (spec.md §"High-Risk", AC-005.5): create/unlink
 * re-authorize `authCtx.role === "admin"` AND `authCtx.tenantId === link.tenantId`
 * BEFORE mutating — this is the testable pre-`core` proof that authorization is
 * enforced independent of the client route gate. No `failedOnce`-style hidden
 * toggle (anti-demo rule); the only forced-error paths are exercised via forged
 * `authCtx` in tests, not surfaced as Storybook states.
 */
export class MockParentStudentLinkRepository
  implements IParentStudentLinkRepository
{
  async listLinks(filter: ListLinksFilter): Promise<PSLResult<ListLinksPage>> {
    const q = filter.q?.trim().toLowerCase() ?? "";
    const matched = STORE.filter((l) => {
      const classOk = !filter.classId || l.studentClassName === filter.classId;
      const qOk =
        !q ||
        l.studentName.toLowerCase().includes(q) ||
        l.parentName.toLowerCase().includes(q);
      return classOk && qOk;
    });

    const limit = filter.limit ?? PARENT_LINKS_PAGE_SIZE;
    const startIndex = filter.cursor ? Number(filter.cursor) : 0;
    const pageRows = matched.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + limit;
    const hasMore = nextIndex < matched.length;

    return ok({
      items: pageRows.map(stripTenant),
      nextCursor: hasMore ? String(nextIndex) : null,
      hasMore,
    });
  }

  async createLink(
    input: CreateLinkInput,
    authCtx: AuthContext,
  ): Promise<PSLResult<ParentStudentLink>> {
    // HIGH-RISK re-auth (defensive, spec.md §1): role + tenant, server-side.
    if (authCtx.role !== "admin" || authCtx.tenantId !== MOCK_TENANT_ID) {
      return fail({ type: "forbidden" });
    }
    // Duplicate pair (FR-004).
    if (
      STORE.some(
        (l) => l.studentId === input.studentId && l.parentId === input.parentId,
      )
    ) {
      return fail({ type: "already-linked" });
    }
    // Parent must be a real parent-role member of this tenant (FR-010/AC-003.4).
    const parent = PARENT_BY_ID.get(input.parentId);
    if (parent?.role !== "parent" || parent.tenantId !== MOCK_TENANT_ID) {
      return fail({
        type: "validation",
        fields: [{ field: "parentId", message: "not-parent-role" }],
      });
    }
    const student = STUDENT_BY_ID.get(input.studentId);
    if (!student || student.tenantId !== MOCK_TENANT_ID) {
      return fail({
        type: "validation",
        fields: [{ field: "studentId", message: "not-found" }],
      });
    }

    const created: SeededLink = {
      linkId: `l-${Date.now()}-${STORE.length}`,
      studentId: student.memberId,
      studentName: student.fullName,
      studentClassName: student.className ?? "",
      parentId: parent.memberId,
      parentName: parent.fullName,
      parentPhone: parent.phone ?? "",
      relationship: input.relationship,
      note: input.note?.trim() ? input.note.trim() : undefined,
      consentStatus: "pending",
      linkedOn: new Date().toISOString().slice(0, 10),
      tenantId: MOCK_TENANT_ID,
    };
    STORE = [created, ...STORE];
    return ok(stripTenant(created));
  }

  async unlinkLink(
    linkId: string,
    authCtx: AuthContext,
  ): Promise<PSLResult<void>> {
    // HIGH-RISK re-auth (AC-005.5) BEFORE existence: role first (no lookup),
    // then tenant match against the link's OWN tenant. Forbidden takes
    // precedence over not-found so existence never leaks to an unauthorized
    // caller. This is exactly the "forged/altered role" proof surface.
    if (authCtx.role !== "admin") {
      return fail({ type: "forbidden" });
    }
    const link = STORE.find((l) => l.linkId === linkId);
    if (link && link.tenantId !== authCtx.tenantId) {
      return fail({ type: "forbidden" });
    }
    if (!link) {
      return fail({ type: "not-found" });
    }
    STORE = STORE.filter((l) => l.linkId !== linkId);
    return ok(undefined);
  }

  async getLinkConsentDetail(
    studentId: string,
    parentId: string,
  ): Promise<PSLResult<ParentStudentConsent>> {
    const link = STORE.find(
      (l) => l.studentId === studentId && l.parentId === parentId,
    );
    const base = CONSENT_SEED[link?.consentStatus ?? "pending"];
    return ok({ studentId, parentId, ...base });
  }

  async searchStudentCandidates(
    q: string,
    classId?: string,
  ): Promise<PSLResult<LinkCandidate[]>> {
    const needle = q.trim().toLowerCase();
    const results = RAW_STUDENTS.filter(
      (s) =>
        s.tenantId === MOCK_TENANT_ID &&
        (!classId || s.className === classId) &&
        (!needle || s.fullName.toLowerCase().includes(needle)),
    )
      .slice(0, CANDIDATE_SEARCH_CAP)
      .map(({ role: _r, tenantId: _t, ...c }) => c);
    return ok(results);
  }

  async searchParentCandidates(q: string): Promise<PSLResult<LinkCandidate[]>> {
    const needle = q.trim().toLowerCase();
    // Server-side scope: parent-role + own tenant ONLY (NFR-008). A cross-tenant
    // parent or a non-parent member is NEVER returned, independent of the query.
    const results = RAW_PARENTS.filter(
      (p) =>
        p.role === "parent" &&
        p.tenantId === MOCK_TENANT_ID &&
        (!needle || p.fullName.toLowerCase().includes(needle)),
    )
      .slice(0, CANDIDATE_SEARCH_CAP)
      .map(({ role: _r, tenantId: _t, ...c }) => c);
    return ok(results);
  }
}
