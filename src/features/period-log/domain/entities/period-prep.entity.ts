import type { PeriodDayOfWeek } from "./period-log.entity";

/**
 * Chuẩn bị tiết — the note / lesson-plan reference / material links a subject
 * teacher attaches to one concrete period occurrence. Mirrors core's
 * `PeriodPrepResponse` (US-232 / ADR core 0144). Same addressing key as
 * {@link import("./period-log.entity").PeriodLog}, different aggregate.
 *
 * `lessonPlanId` is `string | null` on the wire (null = no plan referenced);
 * `note` may be `""`. Writes are an idempotent FULL REPLACE of
 * `note`/`lessonPlanId`/`materials` — there is no partial-patch semantics.
 */
export interface PeriodMaterial {
  title: string;
  url: string;
}

export interface PeriodPrep {
  classId: string;
  /** YYYY-MM-DD */
  date: string;
  periodNumber: number;
  termId: string;
  dayOfWeek: PeriodDayOfWeek;
  subjectId: string;
  teacherMemberId: string;
  /** May be `""` — absent content, not null. */
  note: string;
  lessonPlanId: string | null;
  materials: PeriodMaterial[];
  createdAt: string;
  updatedAt: string;
}

/** The mutable half of `UpsertPeriodPrepRequest`. */
export interface SavePeriodPrepInput {
  note?: string;
  lessonPlanId?: string;
  materials: PeriodMaterial[];
}

/** BE caps, ground-truthed against `UpsertPeriodPrepRequest` +
 *  `PERIOD_PREP_INVALID_*` — the zod schema and the "+ Thêm" disable both read
 *  these, so the client cap can never drift from the contract's. */
export const MAX_MATERIALS = 20;
export const MAX_MATERIAL_TITLE_LENGTH = 200;
export const MAX_MATERIAL_URL_LENGTH = 2000;
/** 5000 per the contract's `note.maxLength` — NOT a UI-invented figure. */
export const MAX_NOTE_LENGTH = 5000;

/** Material urls must be absolute http(s) (BE `PERIOD_PREP_INVALID_MATERIAL`).
 *  Pure, so the form, the domain and any future importer share one rule. */
export function isValidMaterialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
