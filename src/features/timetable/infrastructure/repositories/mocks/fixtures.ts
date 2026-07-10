import type {
  TimetableChildDto,
  TimetableSlotDto,
  WeeklyTimetableResponseDto,
} from "../../dtos/weekly-timetable-response.dto";

/**
 * Mock timetable seed ported from `design_src/edu/timetable-view.jsx`
 * (`TV_TIMETABLE` / `TV_SUBJECTS` / `TV_CHILDREN`). These are DATA (Vietnamese
 * subject/teacher/room strings), NOT UI copy — they stay out of i18n per
 * `.claude/rules/i18n.md`. The BE `core` service would return the same shape.
 */

/** subjectId → Vietnamese subject name (data seed). */
const SUBJECT_NAME: Record<string, string> = {
  math: "Toán",
  lit: "Ngữ văn",
  eng: "Tiếng Anh",
  phys: "Vật lý",
  chem: "Hoá học",
  bio: "Sinh học",
  hist: "Lịch sử",
  geo: "Địa lý",
  civic: "GDCD",
  pe: "Thể dục",
};

/** Compact slot factory: [subjectId, teacher, room] → DTO slot. */
function s(
  subjectId: string,
  teacherName: string,
  room: string,
): TimetableSlotDto {
  return {
    subjectId,
    subjectName: SUBJECT_NAME[subjectId] ?? subjectId,
    teacherName,
    room,
  };
}

/** Raw compact seed: classId → dayIndex → periodNumber → slot. */
const RAW: Record<string, Record<number, Record<number, TimetableSlotDto>>> = {
  "11A2": {
    0: {
      1: s("math", "Cô Nguyễn Thị Hương", "P.302"),
      2: s("math", "Cô Nguyễn Thị Hương", "P.302"),
      3: s("lit", "Thầy Phạm Quốc Bảo", "P.302"),
      4: s("eng", "Cô Đỗ Thị Mai", "P.302"),
      5: s("phys", "Thầy Trần Văn Minh", "P.LAB1"),
      7: s("pe", "Thầy Lê Văn Sơn", "Sân TD"),
      8: s("pe", "Thầy Lê Văn Sơn", "Sân TD"),
    },
    1: {
      1: s("eng", "Cô Đỗ Thị Mai", "P.302"),
      2: s("lit", "Thầy Phạm Quốc Bảo", "P.302"),
      3: s("phys", "Thầy Trần Văn Minh", "P.LAB1"),
      4: s("chem", "Cô Lê Thị Hoa", "P.LAB2"),
      5: s("math", "Cô Nguyễn Thị Hương", "P.302"),
      7: s("hist", "Thầy Vũ Văn Tài", "P.302"),
      8: s("civic", "Thầy Hoàng Văn Khôi", "P.302"),
    },
    2: {
      1: s("math", "Cô Nguyễn Thị Hương", "P.302"),
      2: s("bio", "Thầy Nguyễn Văn Long", "P.LAB3"),
      3: s("geo", "Cô Mai Thị Trang", "P.302"),
      4: s("eng", "Cô Đỗ Thị Mai", "P.302"),
      5: s("lit", "Thầy Phạm Quốc Bảo", "P.302"),
      7: s("chem", "Cô Lê Thị Hoa", "P.LAB2"),
    },
    3: {
      1: s("chem", "Cô Lê Thị Hoa", "P.LAB2"),
      2: s("chem", "Cô Lê Thị Hoa", "P.LAB2"),
      3: s("math", "Cô Nguyễn Thị Hương", "P.302"),
      4: s("civic", "Thầy Hoàng Văn Khôi", "P.302"),
      5: s("eng", "Cô Đỗ Thị Mai", "P.302"),
      7: s("hist", "Thầy Vũ Văn Tài", "P.302"),
      8: s("geo", "Cô Mai Thị Trang", "P.302"),
    },
    4: {
      1: s("lit", "Thầy Phạm Quốc Bảo", "P.302"),
      2: s("eng", "Cô Đỗ Thị Mai", "P.302"),
      3: s("bio", "Thầy Nguyễn Văn Long", "P.LAB3"),
      4: s("math", "Cô Nguyễn Thị Hương", "P.302"),
      5: s("phys", "Thầy Trần Văn Minh", "P.LAB1"),
      7: s("lit", "Thầy Phạm Quốc Bảo", "P.302"),
    },
    5: {
      1: s("civic", "Thầy Hoàng Văn Khôi", "P.302"),
      2: s("pe", "Thầy Lê Văn Sơn", "Sân TD"),
    },
  },
  "8B1": {
    0: {
      1: s("math", "Cô Phan Thị Lan", "P.205"),
      2: s("lit", "Cô Trần Bích Vân", "P.205"),
      3: s("eng", "Thầy Bùi Quang Huy", "P.205"),
      4: s("hist", "Cô Đào Thuỳ Linh", "P.205"),
    },
    1: {
      1: s("eng", "Thầy Bùi Quang Huy", "P.205"),
      2: s("math", "Cô Phan Thị Lan", "P.205"),
      3: s("phys", "Thầy Hồ Minh Tuấn", "P.LAB1"),
      4: s("bio", "Cô Nguyễn Hồng Vân", "P.LAB3"),
    },
    2: {
      1: s("lit", "Cô Trần Bích Vân", "P.205"),
      2: s("geo", "Cô Lý Thanh Hằng", "P.205"),
      3: s("math", "Cô Phan Thị Lan", "P.205"),
    },
    3: {
      1: s("chem", "Cô Mai Thanh Hà", "P.LAB2"),
      2: s("eng", "Thầy Bùi Quang Huy", "P.205"),
      3: s("lit", "Cô Trần Bích Vân", "P.205"),
      7: s("pe", "Thầy Vũ Đức Cường", "Sân TD"),
    },
    4: {
      1: s("math", "Cô Phan Thị Lan", "P.205"),
      2: s("civic", "Cô Trịnh Thu Phương", "P.205"),
      3: s("eng", "Thầy Bùi Quang Huy", "P.205"),
    },
    5: {},
  },
};

const CLASS_NAME: Record<string, string> = {
  "11A2": "11A2",
  "8B1": "8B1",
};

/** Full 10-period × 6-day grid with explicit nulls for empty slots. */
function buildDto(classId: string): WeeklyTimetableResponseDto {
  const raw = RAW[classId];
  const slots: WeeklyTimetableResponseDto["slots"] = {};
  for (let day = 0; day < 6; day++) {
    slots[day] = {};
    for (let period = 1; period <= 10; period++) {
      slots[day][period] = raw[day]?.[period] ?? null;
    }
  }
  return { classId, className: CLASS_NAME[classId] ?? classId, slots };
}

export const KNOWN_CLASS_IDS = Object.keys(RAW);

export function timetableDtoFor(
  classId: string,
): WeeklyTimetableResponseDto | null {
  return RAW[classId] ? buildDto(classId) : null;
}

/* ── Teacher-scope seed (US-E15.2) ───────────────────────────────────────── */

/** Compact teacher-slot factory: [subjectId, className, room] → DTO slot. */
function ts(
  subjectId: string,
  className: string,
  room: string,
): TimetableSlotDto {
  return {
    subjectId,
    subjectName: SUBJECT_NAME[subjectId] ?? subjectId,
    className,
    room,
  };
}

/**
 * Raw teacher-schedule seed: teacherId → dayIndex → periodNumber → slot.
 * A teacher's week spans MULTIPLE classes (unlike a class timetable). Seed
 * teacher `t1` ("Cô Nguyễn Thị Hương") teaching Toán across 11A2 / 8B1 / 10C3,
 * plus a couple of GDCD homeroom periods (exercises the multi-subject legend).
 */
const TEACHER_RAW: Record<
  string,
  Record<number, Record<number, TimetableSlotDto>>
> = {
  t1: {
    0: {
      1: ts("math", "11A2", "P.302"),
      2: ts("math", "11A2", "P.302"),
      4: ts("math", "8B1", "P.205"),
      7: ts("math", "10C3", "P.410"),
    },
    1: {
      1: ts("math", "8B1", "P.205"),
      3: ts("math", "11A2", "P.302"),
      8: ts("civic", "11A2", "P.302"),
    },
    2: {
      2: ts("math", "10C3", "P.410"),
      3: ts("math", "11A2", "P.302"),
      4: ts("math", "8B1", "P.205"),
    },
    3: {
      1: ts("math", "11A2", "P.302"),
      5: ts("math", "10C3", "P.410"),
      7: ts("civic", "8B1", "P.205"),
    },
    4: {
      2: ts("math", "8B1", "P.205"),
      3: ts("math", "10C3", "P.410"),
      4: ts("math", "11A2", "P.302"),
    },
    5: {
      1: ts("math", "10C3", "P.410"),
    },
  },
};

/** teacherId → display name (top-level className for the reused entity). */
const TEACHER_NAME: Record<string, string> = {
  t1: "Cô Nguyễn Thị Hương",
};

/** Full 10-period × 6-day teacher grid with explicit nulls for free periods. */
function buildTeacherDto(teacherId: string): WeeklyTimetableResponseDto {
  const raw = TEACHER_RAW[teacherId];
  const slots: WeeklyTimetableResponseDto["slots"] = {};
  for (let day = 0; day < 6; day++) {
    slots[day] = {};
    for (let period = 1; period <= 10; period++) {
      slots[day][period] = raw[day]?.[period] ?? null;
    }
  }
  // classId/className carry the teacher's own id/name (documented reuse).
  return {
    classId: teacherId,
    className: TEACHER_NAME[teacherId] ?? teacherId,
    slots,
  };
}

export function teacherScheduleDtoFor(
  teacherId: string,
): WeeklyTimetableResponseDto | null {
  return TEACHER_RAW[teacherId] ? buildTeacherDto(teacherId) : null;
}

/** Teacher self-scope: the signed-in teacher (Cô Nguyễn Thị Hương) is `t1`. */
export const MY_TEACHER_ID = "t1";

/** Student self-scope: the signed-in student (Nguyễn Minh Khoa) is in 11A2. */
export const MY_CLASS_ID = "11A2";

/** Parent's children roster (matches TV_CHILDREN). */
export const TIMETABLE_CHILDREN: TimetableChildDto[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    classId: "11A2",
    className: "11A2",
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    classId: "8B1",
    className: "8B1",
    avatar: "NH",
    color: "success",
  },
];
