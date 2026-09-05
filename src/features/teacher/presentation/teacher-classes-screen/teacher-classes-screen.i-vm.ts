import type {
  ClassRole,
  TeacherClassKpiField,
} from "../../domain/entities/teacher-class.entity";
import type { TeacherClassFailure } from "../../domain/failures/teacher-class.failure";

/** One KPI tile, already tone-resolved by the RSC page — the card and the tile
 *  are pure renderers (no `> 0` branching, no i18n-key mapping in `.tsx`). */
export interface KpiTileVM {
  /** Stable React/list + test key — the KPI field this tile renders, so a
   *  typo is a compile error rather than a silently missing tile. */
  key: TeacherClassKpiField;
  /** Display-ready number (already percent-scaled where applicable). */
  value: number;
  /** Appended after the value, e.g. "%" for the attendance tile. */
  suffix?: string;
  /** Pre-translated label (the page owns WHICH tiles apply, so it also owns
   *  their copy — see COMPONENT-ARCHITECTURE §3.1). */
  label: string;
  tone: "neutral" | "warning" | "error";
  /** True when the number came from the mock/draft path (ADR 0076) — drives
   *  the "demo" pill. Always false once the real BE field ships. */
  isDemo: boolean;
}

export interface TeacherClassSubjectVM {
  id: string;
  /** Resolved subject name (falls back to the raw id upstream in the mapper). */
  name: string;
}

/** ViewModel for one class card. `hubHref` is the absolute class-hub link
 *  (`…/teacher/classes/<id>?tab=students`), resolved by the RSC page. */
export interface TeacherClassVM {
  id: string;
  name: string;
  studentCount: number;
  /** A class can be both homeroom and subject — homeroom first (badge order). */
  roles: ClassRole[];
  /** Empty for a pure-GVCN class. */
  subjects: TeacherClassSubjectVM[];
  /** ABSENT (not an empty array) when no KPI number is available — the card
   *  then renders no tile container at all, so the grid does not go lopsided. */
  kpi?: { tiles: KpiTileVM[] };
  /** App-relative route to this class's hub (US-E24.8) — the "Mở lớp" target,
   *  landing on the roster tab. */
  hubHref: string;
}

export interface TeacherClassesScreenVM {
  /** "ready" → render `classes` (possibly empty → empty state).
   *  "error" → render the typed `errorKey` message + retry button. */
  status: "ready" | "error";
  /** Present when status === "error"; maps to `teacherClasses.errors.<type>`. */
  errorKey?: TeacherClassFailure["type"];
  classes: TeacherClassVM[];
}
