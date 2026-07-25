/**
 * Typed failure union for the staff-discipline feature (US-E09.5, plan.md §2).
 * One union covers BOTH sub-resources (violations + conduct notes), matching the
 * one-repository decision (component-architecture.md §1).
 *
 * The `type` keys double as i18n keys: the 9 shared codes resolve under
 * `discipline.errors.*` (verbatim reuse, spec §8 [CONFLICT] resolution) and the
 * 3 conduct-note-specific ones (`locked`, `term-not-found`, `invalid-rating`)
 * under `staffDiscipline.errors.*`. Domain / repo / Server Action never
 * translate — presentation does (see `sd-error-message.ts`).
 */
export type StaffDisciplineFailure =
  | { type: "validation"; fields: StaffDisciplineFieldError[] }
  | { type: "missing-reject-reason" }
  | { type: "invalid-transition" }
  | { type: "already-processed" }
  /** `VIOLATION_SAME_ACTOR` — generic handling only (spec §8 OQ2). */
  | { type: "same-actor" }
  | { type: "not-found" }
  | { type: "forbidden" }
  /** `STAFF_CONDUCT_NOTE_LOCKED` (409, ADR 0074). */
  | { type: "locked" }
  | { type: "term-not-found" }
  | { type: "invalid-rating" }
  | { type: "invalid-severity" }
  | { type: "network-error" };

/** Field-scoped validation detail. `field` is a stable key, never UI copy. */
export interface StaffDisciplineFieldError {
  field: StaffDisciplineField;
  /** Stable reason key (NOT translated copy) — presentation maps it. */
  reason: "required" | "too-long" | "invalid";
}

export type StaffDisciplineField =
  | "staffMemberId"
  | "category"
  | "severity"
  | "occurredAt"
  | "description"
  | "termId"
  | "rating"
  | "note";

export type StaffDisciplineFailureType = StaffDisciplineFailure["type"];

/** Only transport failures may be retried (state-design.md §4). */
export function isRetryableStaffDisciplineFailure(
  failure: StaffDisciplineFailure,
): boolean {
  return failure.type === "network-error";
}

/** Narrow an unknown thrown value to this feature's failure type key. */
export function toStaffDisciplineFailureType(
  err: unknown,
): StaffDisciplineFailureType {
  if (err && typeof err === "object" && "type" in err) {
    const type = (err as { type: unknown }).type;
    if (typeof type === "string" && KNOWN_TYPES.has(type)) {
      return type as StaffDisciplineFailureType;
    }
  }
  return "network-error";
}

const KNOWN_TYPES = new Set<string>([
  "validation",
  "missing-reject-reason",
  "invalid-transition",
  "already-processed",
  "same-actor",
  "not-found",
  "forbidden",
  "locked",
  "term-not-found",
  "invalid-rating",
  "invalid-severity",
  "network-error",
]);

/** Field errors of a thrown failure, or `[]` when it carries none. */
export function fieldErrorsOf(err: unknown): StaffDisciplineFieldError[] {
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    (err as { type: unknown }).type === "validation" &&
    Array.isArray((err as { fields?: unknown }).fields)
  ) {
    return (err as unknown as { fields: StaffDisciplineFieldError[] }).fields;
  }
  return [];
}
