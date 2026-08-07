import type { TimetableConflictScan } from "../entities/timetable.entity";
import type { TimetableFailure } from "../failures/timetable.failure";
import type { ITimetableRepository } from "../repositories/i-timetable.repository";
import { fail, ok, type Result } from "./result";

const KNOWN_FAILURE_TYPES = new Set<TimetableFailure["type"]>([
  "invalid-tenant",
  "invalid-class",
  "invalid-term",
  "invalid-member",
  "invalid-subject",
  "invalid-slot",
  "invalid-day",
  "invalid-period",
  "forbidden",
  "slot-not-found",
  "teacher-conflict",
  "save-failed",
  "fetch-failed",
]);

/**
 * Whole-school double-booking scan (BE US-188, ADMIN/SUPER_ADMIN only).
 *
 * Returns a {@link Result} rather than throwing: the scan is a SECONDARY read on
 * the timetable builder screen, so its failure must degrade honestly inside the
 * conflicts panel instead of blanking the grid the admin came to edit.
 */
export class GetTimetableConflictsUseCase {
  constructor(private readonly repo: ITimetableRepository) {}

  async execute(): Promise<Result<TimetableConflictScan>> {
    try {
      return ok(await this.repo.getConflicts());
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}

/** The repository already normalises HTTP errors into the failure union; this is
 *  the last net for anything that escapes it (transport, programming errors). */
function toFailure(err: unknown): TimetableFailure {
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string" &&
    KNOWN_FAILURE_TYPES.has((err as TimetableFailure).type)
  ) {
    return err as TimetableFailure;
  }
  return { type: "fetch-failed", message: "Failed to scan for conflicts" };
}
