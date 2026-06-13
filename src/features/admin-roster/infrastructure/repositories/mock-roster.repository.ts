import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import type {
  IRosterRepository,
  Result,
  VoidResult,
} from "../../domain/repositories/i-roster.repository";

// Seed data — mirrors design_src/edu/roster.jsx. Mock/seed data is NOT i18n.
const CLASSES: ClassSummary[] = [
  {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    homeroomTeacher: "Nguyễn Thị Hương",
    year: "2025–2026",
  },
  {
    id: "cls-10a2",
    name: "10A2",
    gradeLevel: 10,
    homeroomTeacher: "Trần Văn Minh",
    year: "2025–2026",
  },
  {
    id: "cls-11b2",
    name: "11B2",
    gradeLevel: 11,
    homeroomTeacher: "Lê Thị Hoa",
    year: "2025–2026",
  },
  {
    id: "cls-10b3",
    name: "10B3",
    gradeLevel: 10,
    homeroomTeacher: null,
    year: "2025–2026",
  },
];

const SEED_ROSTER: Record<string, RosterStudent[]> = {
  "cls-10a1": [
    {
      id: "HS25001",
      name: "Nguyễn Minh Anh",
      dob: "15/03/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25002",
      name: "Trần Văn Bình",
      dob: "02/07/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25003",
      name: "Lê Thị Cẩm",
      dob: "24/11/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25004",
      name: "Phạm Đức Dũng",
      dob: "08/01/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25005",
      name: "Hoàng Thị Linh",
      dob: "17/05/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25006",
      name: "Vũ Quốc Bảo",
      dob: "29/09/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25007",
      name: "Đỗ Thu Hằng",
      dob: "11/04/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25008",
      name: "Bùi Minh Tuấn",
      dob: "06/12/2010",
      gender: "M",
      status: "transferred",
    },
    {
      id: "HS25009",
      name: "Nguyễn Hải Yến",
      dob: "21/08/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25010",
      name: "Phan Trọng Nhân",
      dob: "03/02/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25011",
      name: "Lý Khánh Vy",
      dob: "18/06/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25012",
      name: "Trương Quang Huy",
      dob: "27/10/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25013",
      name: "Đặng Phương Mai",
      dob: "14/03/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25014",
      name: "Cao Đức Anh",
      dob: "09/07/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25015",
      name: "Nguyễn Ngọc Diệp",
      dob: "22/01/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25016",
      name: "Hồ Văn Khang",
      dob: "04/09/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25017",
      name: "Trần Thuỳ Dương",
      dob: "30/05/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25018",
      name: "Phạm Hoàng Long",
      dob: "12/11/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25019",
      name: "Lê Bảo Trân",
      dob: "07/04/2010",
      gender: "F",
      status: "transferred",
    },
    {
      id: "HS25020",
      name: "Vũ Đình Phúc",
      dob: "25/02/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25021",
      name: "Nguyễn Thị Vy",
      dob: "16/08/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25022",
      name: "Đỗ Quốc Đạt",
      dob: "01/12/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25023",
      name: "Bùi Hà My",
      dob: "19/06/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25024",
      name: "Hoàng Minh Đức",
      dob: "13/10/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25025",
      name: "Nguyễn Khánh Linh",
      dob: "28/03/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25026",
      name: "Trần Văn Sơn",
      dob: "05/07/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25027",
      name: "Phạm Thu Trang",
      dob: "20/09/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25028",
      name: "Lê Thành Đạt",
      dob: "10/01/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25029",
      name: "Vũ Thị Kim Ngân",
      dob: "26/05/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25030",
      name: "Nguyễn Anh Tú",
      dob: "08/11/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25031",
      name: "Hoàng Diệu Linh",
      dob: "23/02/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25032",
      name: "Đỗ Mạnh Cường",
      dob: "15/08/2010",
      gender: "M",
      status: "active",
    },
  ],
  "cls-10a2": [
    {
      id: "HS25101",
      name: "Nguyễn Anh Khoa",
      dob: "12/04/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25102",
      name: "Trần Mỹ Linh",
      dob: "18/09/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25103",
      name: "Phạm Quốc Việt",
      dob: "03/11/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25202",
      name: "Trần Thuỵ Vân",
      dob: "05/05/2010",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25205",
      name: "Vũ Đức Trí",
      dob: "09/09/2010",
      gender: "M",
      status: "active",
    },
    {
      id: "HS25212",
      name: "Trương Văn Toàn",
      dob: "12/12/2010",
      gender: "M",
      status: "active",
    },
  ],
  "cls-11b2": [
    {
      id: "HS24201",
      name: "Lê Thị Cẩm",
      dob: "24/11/2009",
      gender: "F",
      status: "active",
    },
    {
      id: "HS25208",
      name: "Bùi Trọng Khang",
      dob: "08/08/2009",
      gender: "M",
      status: "active",
    },
  ],
  "cls-10b3": [],
};

// Unassigned students (not enrolled in any class).
const SEED_UNASSIGNED: Array<{ id: string; name: string }> = [
  { id: "HS25201", name: "Nguyễn Hồng Quân" },
  { id: "HS25203", name: "Phạm Quang Vinh" },
  { id: "HS25204", name: "Lê Thị Hồng Hạnh" },
  { id: "HS25206", name: "Hoàng Thanh Tùng" },
  { id: "HS25207", name: "Đỗ Phương Anh" },
  { id: "HS25209", name: "Nguyễn Lê Bảo Châu" },
  { id: "HS25210", name: "Phan Hồng Phúc" },
  { id: "HS25211", name: "Lý Thu Hương" },
];

function inferGender(name: string): RosterStudent["gender"] {
  return /(?:nh|Vy|Mai|Hằng|Châu|Hương|Anh|Hạnh|Vân)$/.test(name) ? "F" : "M";
}

interface MockState {
  classes: ClassSummary[];
  rosterByClass: Record<string, RosterStudent[]>;
  unassigned: Array<{ id: string; name: string }>;
}

// Module-level mutable state so mutations survive across RSC refreshes.
const state: MockState = {
  classes: structuredClone(CLASSES),
  rosterByClass: structuredClone(SEED_ROSTER),
  unassigned: structuredClone(SEED_UNASSIGNED),
};

function classNameOf(id: string): string | null {
  return state.classes.find((c) => c.id === id)?.name ?? null;
}

export class MockRosterRepository implements IRosterRepository {
  async getClasses(
    _params: { academicYear?: string } = {},
  ): Promise<Result<ClassSummary[]>> {
    await mockDelay(300);
    return { ok: true, data: structuredClone(state.classes) };
  }

  async getClassRoster(classId: string): Promise<Result<RosterStudent[]>> {
    await mockDelay(300);
    return {
      ok: true,
      data: structuredClone(state.rosterByClass[classId] ?? []),
    };
  }

  async getSearchPool(classId: string): Promise<Result<SearchStudent[]>> {
    await mockDelay(300);
    const enrolledHere = new Set(
      (state.rosterByClass[classId] ?? []).map((s) => s.id),
    );
    const pool: SearchStudent[] = [];

    // Unassigned candidates.
    for (const u of state.unassigned) {
      if (!enrolledHere.has(u.id)) {
        pool.push({
          id: u.id,
          name: u.name,
          currentClassId: null,
          currentClassName: null,
        });
      }
    }
    // Students enrolled in OTHER classes (transfer candidates).
    for (const [otherId, students] of Object.entries(state.rosterByClass)) {
      if (otherId === classId) continue;
      for (const s of students) {
        if (s.status === "active" && !enrolledHere.has(s.id)) {
          pool.push({
            id: s.id,
            name: s.name,
            currentClassId: otherId,
            currentClassName: classNameOf(otherId),
          });
        }
      }
    }
    return { ok: true, data: pool };
  }

  async enrollStudent(classId: string, studentId: string): Promise<VoidResult> {
    await mockDelay(300);
    const list = state.rosterByClass[classId];
    if (!list) return { ok: false, error: { type: "not-found" } };
    if (list.some((s) => s.id === studentId))
      return { ok: true, data: undefined };
    const fromUnassigned = state.unassigned.find((u) => u.id === studentId);
    if (fromUnassigned) {
      state.unassigned = state.unassigned.filter((u) => u.id !== studentId);
    }
    const name = fromUnassigned?.name ?? studentId;
    list.push({
      id: studentId,
      name,
      dob: "01/01/2010",
      gender: inferGender(name),
      status: "active",
    });
    return { ok: true, data: undefined };
  }

  async unenrollStudent(
    classId: string,
    studentId: string,
  ): Promise<VoidResult> {
    await mockDelay(300);
    const list = state.rosterByClass[classId];
    if (!list) return { ok: false, error: { type: "not-found" } };
    const idx = list.findIndex((s) => s.id === studentId);
    if (idx === -1) return { ok: false, error: { type: "not-found" } };
    const [removed] = list.splice(idx, 1);
    state.unassigned.push({ id: removed.id, name: removed.name });
    return { ok: true, data: undefined };
  }

  async unenrollStudents(
    classId: string,
    studentIds: string[],
  ): Promise<VoidResult> {
    await mockDelay(300);
    const list = state.rosterByClass[classId];
    if (!list) return { ok: false, error: { type: "not-found" } };
    const idSet = new Set(studentIds);
    for (const s of list) {
      if (idSet.has(s.id)) state.unassigned.push({ id: s.id, name: s.name });
    }
    state.rosterByClass[classId] = list.filter((s) => !idSet.has(s.id));
    return { ok: true, data: undefined };
  }

  async transferStudent(
    studentId: string,
    fromClassId: string,
    toClassId: string,
  ): Promise<VoidResult> {
    await mockDelay(300);
    const fromList = state.rosterByClass[fromClassId];
    const toList = state.rosterByClass[toClassId];
    if (!fromList || !toList)
      return { ok: false, error: { type: "not-found" } };
    const idx = fromList.findIndex((s) => s.id === studentId);
    if (idx === -1) return { ok: false, error: { type: "not-found" } };
    const [moved] = fromList.splice(idx, 1);
    toList.push({ ...moved, status: "active" });
    return { ok: true, data: undefined };
  }
}
