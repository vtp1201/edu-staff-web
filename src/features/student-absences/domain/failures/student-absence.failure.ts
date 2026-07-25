/**
 * Typed failure union for the student-absences feature (US-E09.6, spec.md §6).
 *
 * GENUINELY NEW — zero reuse from `DisciplineFailure`/`StaffDisciplineFailure`
 * (verified in `integration.md` §1). 8 members, one per `ABSENCE_*` code plus
 * transport.
 *
 * The `type` values double as i18n leaves under `studentAbsences.errors.*` with
 * exactly ONE override: `"invalid-date"` → `studentAbsences.errors.invalid-date-future`
 * (the already-authored key; NOT renamed, to avoid confusion with
 * `discipline.errors.invalid-date`, which guards the OPPOSITE direction).
 * `"network-error"` has no `studentAbsences` leaf and reuses
 * `discipline.errors.network-error` — the same dual-namespace pattern as
 * `sd-error-message.ts`. Domain / repository / Server Action never translate.
 */
export type StudentAbsenceFailure =
  /** `ABSENCE_FORBIDDEN` (403) — role or homeroom-class ownership denied. */
  | { type: "forbidden" }
  /** `ABSENCE_NOT_FOUND` (404). */
  | { type: "not-found" }
  /** `ABSENCE_DUPLICATE_DATE` (409) — natural key already exists. */
  | { type: "duplicate-date" }
  /** `ABSENCE_INVALID_DATE` (422) — FUTURE date. i18n leaf: `invalid-date-future`. */
  | { type: "invalid-date" }
  /** `ABSENCE_INVALID_STATE` (400) — e.g. re-flagging a terminal record. */
  | { type: "invalid-state" }
  /** `ABSENCE_INVALID_ID` (400) — unknown class/student id. */
  | { type: "invalid-id" }
  /** `ABSENCE_INVALID_INPUT` (422) — field-level rejection. */
  | { type: "invalid-input" }
  /** Transport / unknown. The ONLY retryable member. */
  | { type: "network-error" };

export type StudentAbsenceFailureType = StudentAbsenceFailure["type"];

const KNOWN_TYPES = new Set<string>([
  "forbidden",
  "not-found",
  "duplicate-date",
  "invalid-date",
  "invalid-state",
  "invalid-id",
  "invalid-input",
  "network-error",
]);

/**
 * Narrow an unknown thrown value to this feature's failure key. Branches on
 * `type`/`code` only — NEVER on a human message (`.claude/rules/api-integration.md`).
 */
export function toStudentAbsenceFailureType(
  err: unknown,
): StudentAbsenceFailureType {
  if (err && typeof err === "object" && "type" in err) {
    const type = (err as { type: unknown }).type;
    if (typeof type === "string" && KNOWN_TYPES.has(type)) {
      return type as StudentAbsenceFailureType;
    }
  }
  return "network-error";
}

/** Only transport failures may be retried (state-design.md §4). */
export function isRetryableStudentAbsenceFailure(
  type: StudentAbsenceFailureType,
): boolean {
  return type === "network-error";
}

/** Identity helper so every throw site is typed against the union. */
export function studentAbsenceFailure(
  failure: StudentAbsenceFailure,
): StudentAbsenceFailure {
  return failure;
}
