import type { HomeroomEntry } from "../../domain/entities/homeroom-entry.entity";
import type { HomeroomEntryStatus } from "../../domain/entities/homeroom-entry-status.entity";
import type { ClassLogFailure } from "../../domain/failures/class-log.failure";

export type ClassLogActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; errorKey: ClassLogFailure["type"] }
  :
      | { ok: true; entry: HomeroomEntry }
      | { ok: false; errorKey: ClassLogFailure["type"] };

/** Server-action contract surfaced to the class-log screen (US-E13.3). */
export interface ClassLogScreenVM {
  classId: string;
  className: string;
  entries: HomeroomEntry[];
  nextCursor?: string;
  hasMore: boolean;
  isPrincipal: boolean;
  filterStatus?: HomeroomEntryStatus;
  createEntryAction: (
    classId: string,
    entryDate: string,
    summary: string,
    notableEvents?: string,
  ) => Promise<
    | { ok: true; entry: HomeroomEntry }
    | { ok: false; errorKey: ClassLogFailure["type"] }
  >;
  submitEntryAction: (
    classId: string,
    entryId: string,
  ) => Promise<
    | { ok: true; entry: HomeroomEntry }
    | { ok: false; errorKey: ClassLogFailure["type"] }
  >;
  reviseEntryAction: (
    classId: string,
    entryId: string,
  ) => Promise<
    | { ok: true; entry: HomeroomEntry }
    | { ok: false; errorKey: ClassLogFailure["type"] }
  >;
  approveEntryAction: (
    classId: string,
    entryId: string,
  ) => Promise<
    | { ok: true; entry: HomeroomEntry }
    | { ok: false; errorKey: ClassLogFailure["type"] }
  >;
  rejectEntryAction: (
    classId: string,
    entryId: string,
    reason?: string,
  ) => Promise<
    | { ok: true; entry: HomeroomEntry }
    | { ok: false; errorKey: ClassLogFailure["type"] }
  >;
}
