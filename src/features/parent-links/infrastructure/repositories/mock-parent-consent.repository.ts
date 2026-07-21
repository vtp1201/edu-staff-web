import type { LinkedStudentSummary } from "../../domain/entities/linked-student-summary.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type { ParentConsentFailure } from "../../domain/failures/parent-consent.failure";
import type {
  ConsentCategory,
  IParentConsentRepository,
  UpdateConsentInput,
} from "../../domain/repositories/i-parent-consent.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";

type PCResult<T> = Result<T, ParentConsentFailure>;

/**
 * Fixed, documented, seedable student id whose `updateConsent` ALWAYS fails
 * (validation) — used by the revert-path integration test + the
 * `ToggleFailureRevert` Storybook story. This is a deterministic rule keyed on
 * the id, NOT a hidden `failedOnce` runtime toggle (anti-demo rule, mirrors the
 * admin mock's note).
 */
export const CONSENT_FAIL_STUDENT_ID = "st-consent-fail";

const CATEGORY_FIELD: Record<ConsentCategory, keyof ParentStudentConsent> = {
  discipline: "disciplineAlerts",
  absence: "absenceAlerts",
  grades: "gradeAlerts",
};

export interface MockConsentSeed {
  students?: LinkedStudentSummary[];
  consents?: ParentStudentConsent[];
}

/** Default seed: 3 linked children with mixed consent (all-on / all-off / partial). */
function defaultStudents(): LinkedStudentSummary[] {
  return [
    { studentId: "st1", fullName: "Nguyễn Minh Khoa", linkId: "l1" },
    { studentId: "st2", fullName: "Trần Quốc Bảo", linkId: "l2" },
    { studentId: "st3", fullName: "Lê Thảo Vy", linkId: "l3" },
  ];
}

function defaultConsents(): ParentStudentConsent[] {
  return [
    // all-on
    {
      studentId: "st1",
      parentId: "self",
      disciplineAlerts: true,
      absenceAlerts: true,
      gradeAlerts: true,
    },
    // all-off
    {
      studentId: "st2",
      parentId: "self",
      disciplineAlerts: false,
      absenceAlerts: false,
      gradeAlerts: false,
    },
    // partial
    {
      studentId: "st3",
      parentId: "self",
      disciplineAlerts: true,
      absenceAlerts: false,
      gradeAlerts: true,
    },
  ];
}

/**
 * In-memory `IParentConsentRepository` (US-E20.2, mock-first, decision 0014).
 * Constructor-seedable (no hidden runtime toggle). Instance-scoped state —
 * DI creates one per request; the client patches its cache from the toggle's
 * echoed value (no re-read after write, state-architecture §5), so per-instance
 * state is sufficient for the mock flow.
 *
 * NFR-007 (own-data-only): NO public method takes a parent id — the mock cannot
 * be asked for another parent's data by construction, mirroring how the real
 * server would resolve the memberId from the session token.
 */
export class MockParentConsentRepository implements IParentConsentRepository {
  private students: LinkedStudentSummary[];
  private consents: ParentStudentConsent[];

  constructor(seed: MockConsentSeed = {}) {
    this.students = seed.students ?? defaultStudents();
    this.consents = (seed.consents ?? defaultConsents()).map((c) => ({ ...c }));
  }

  async getLinkedStudents(): Promise<PCResult<LinkedStudentSummary[]>> {
    return ok(this.students.map((s) => ({ ...s })));
  }

  async getConsents(
    studentIds: string[],
  ): Promise<PCResult<ParentStudentConsent[]>> {
    const set = new Set(studentIds);
    return ok(
      this.consents.filter((c) => set.has(c.studentId)).map((c) => ({ ...c })),
    );
  }

  async updateConsent(
    input: UpdateConsentInput,
  ): Promise<PCResult<ParentStudentConsent>> {
    // Deterministic, documented failure — keyed on the id, not a hidden toggle.
    if (input.studentId === CONSENT_FAIL_STUDENT_ID) {
      return fail({
        type: "validation",
        fields: [{ field: input.category, message: "update-failed" }],
      });
    }

    const existing = this.consents.find((c) => c.studentId === input.studentId);
    const base: ParentStudentConsent = existing ?? {
      studentId: input.studentId,
      parentId: "self",
      disciplineAlerts: false,
      absenceAlerts: false,
      gradeAlerts: false,
    };
    const next: ParentStudentConsent = {
      ...base,
      [CATEGORY_FIELD[input.category]]: input.enabled,
    };

    if (existing) {
      this.consents = this.consents.map((c) =>
        c.studentId === input.studentId ? next : c,
      );
    } else {
      this.consents = [...this.consents, next];
    }
    return ok({ ...next });
  }
}
