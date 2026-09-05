import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { ClassLogFailure } from "@/features/class-log/domain/failures/class-log.failure";
import type {
  PeriodLog,
  SavePeriodLogInput,
} from "@/features/period-log/domain/entities/period-log.entity";
import type {
  PeriodPrep,
  SavePeriodPrepInput,
} from "@/features/period-log/domain/entities/period-prep.entity";
import type { PeriodLogFailure } from "@/features/period-log/domain/failures/period-log.failure";

/**
 * ViewModel contract for the class-hub timetable tab (US-E24.9). Assembled
 * server-side by `page.tsx`; every field is either raw data or an
 * already-formatted display string — presentation interpolates i18n copy but
 * never re-derives dates, roles or permissions.
 */

/** One period row. Everything the row renders is pre-computed by the page from
 *  the pure selectors (`isMySlot`, `isPeriodLive`) — the component itself runs
 *  ZERO selector logic. */
export interface PeriodRowVm {
  periodNumber: number;
  /** `"HH:mm–HH:mm"`, or absent when no bell schedule is published (AC: no
   *  time shown, no "Đang diễn ra" badge). */
  timeRangeLabel?: string;
  subjectName: string;
  teacherName?: string;
  /** The slot's assigned teacher — threaded verbatim into every write so the
   *  Server Action never has to re-fetch the timetable to learn it. */
  teacherMemberId?: string;
  room?: string;
  /** `slot.teacherMemberId === myMemberId` (decision 0074's claim). */
  isMine: boolean;
  isLive: boolean;
}

export interface TimetableDayVm {
  /** YYYY-MM-DD */
  date: string;
  /** e.g. "Thứ 2 · 31/08" — composed by the page from i18n + the date. */
  dayLabel: string;
  isToday: boolean;
  /** The holiday's own NAME (not a boolean): the AC wants "Nghỉ lễ 30/04"
   *  shown, and a colour alone may not carry the state (a11y). No wire source
   *  exists yet, so the page leaves it undefined today. */
  holidayLabel?: string;
  periods: PeriodRowVm[];
}

/** The aside's "tiết sắp tới" — resolved server-side (it needs `now`); the
 *  đã/chưa chips are read from the LIVE client maps, not frozen here. */
export interface UpcomingPeriodVm {
  date: string;
  dayLabel: string;
  periodNumber: number;
  subjectName: string;
  timeRangeLabel?: string;
  room?: string;
}

export interface TimetableShortcutsVm {
  teachingPlanHref: string;
  attendanceHref: string;
  classLogHref: string;
}

/** Lesson-plan options for the prep form's picker — the teacher's OWN plans,
 *  already filtered server-side (no client fetch). */
export interface LessonPlanOptionVm {
  planId: string;
  title: string;
}

export type SavePeriodLogActionResult =
  | { ok: true; data: PeriodLog }
  | { ok: false; errorKey: PeriodLogFailure["type"] };

export type SavePeriodPrepActionResult =
  | { ok: true; data: PeriodPrep }
  | { ok: false; errorKey: PeriodLogFailure["type"] };

export type DeletePeriodActionResult =
  | { ok: true; data: null }
  | { ok: false; errorKey: PeriodLogFailure["type"] };

export type DailyEntryActionResult =
  | { ok: true; entry: HomeroomEntry }
  | { ok: false; errorKey: ClassLogFailure["type"] };

/** The seven Server Action refs, bound once by `page.tsx` and threaded down as
 *  ONE prop rather than a seven-prop firehose at every call site. */
export interface TimetableTabActions {
  savePeriodLog: (
    classId: string,
    date: string,
    periodNumber: number,
    assignedTeacherMemberId: string,
    input: SavePeriodLogInput,
  ) => Promise<SavePeriodLogActionResult>;
  deletePeriodLog: (
    classId: string,
    date: string,
    periodNumber: number,
    assignedTeacherMemberId: string,
  ) => Promise<DeletePeriodActionResult>;
  savePeriodPrep: (
    classId: string,
    date: string,
    periodNumber: number,
    assignedTeacherMemberId: string,
    input: SavePeriodPrepInput,
  ) => Promise<SavePeriodPrepActionResult>;
  deletePeriodPrep: (
    classId: string,
    date: string,
    periodNumber: number,
    assignedTeacherMemberId: string,
  ) => Promise<DeletePeriodActionResult>;
  saveDailyEntry: (
    classId: string,
    entryDate: string,
    summary: string,
    notableEvents?: string,
  ) => Promise<DailyEntryActionResult>;
  submitDailyEntry: (
    classId: string,
    entryId: string,
  ) => Promise<DailyEntryActionResult>;
  reviseDailyEntry: (
    classId: string,
    entryId: string,
  ) => Promise<DailyEntryActionResult>;
}

export interface TimetableTabVm {
  classId: string;
  /** Empty when the token carried no readable member id — nothing is "mine". */
  myMemberId: string;
  /** GVCN of THIS class: gates the daily-log write UI (the Server Action
   *  re-derives the same fact server-side — this flag only drives rendering). */
  isHomeroom: boolean;
  weekParam: string;
  /** e.g. "31/08 – 05/09" */
  weekRangeLabel: string;
  prevWeekHref: string;
  nextWeekHref: string;
  days: TimetableDayVm[];
  /** Seeds for the client-owned maps — keyed by `periodKeyOf(date, n)` /
   *  `entryDate` inside the body so both columns read ONE source. */
  logs: PeriodLog[];
  preps: PeriodPrep[];
  homeroomEntries: HomeroomEntry[];
  lessonPlans: LessonPlanOptionVm[];
  upcoming: UpcomingPeriodVm | null;
  shortcuts: TimetableShortcutsVm;
  /** Set when the week's timetable read itself failed: the tab renders ONE
   *  error surface instead of a half-built grid. */
  errorKey?: PeriodLogFailure["type"];
}
