import "server-only";

const VN_FIRST = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
];
const VN_MID = ["Văn", "Thị", "Quốc", "Minh", "Hữu", "Ngọc", "Thanh", "Anh"];
const VN_LAST = [
  "An",
  "Bình",
  "Châu",
  "Dũng",
  "Hà",
  "Hải",
  "Hằng",
  "Khoa",
  "Lan",
  "Linh",
  "Mai",
  "Nam",
  "Phong",
  "Quân",
  "Sơn",
  "Thảo",
  "Tuấn",
  "Trang",
  "Việt",
  "Yến",
];

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length] as T;
}

export interface MockStudent {
  studentId: string;
  studentName: string;
}

function buildStudents(classId: string, count = 30): MockStudent[] {
  const list: MockStudent[] = [];
  for (let i = 0; i < count; i++) {
    const seed = classId.charCodeAt(0) + i * 7;
    const name = `${pick(VN_FIRST, seed)} ${pick(VN_MID, seed + 3)} ${pick(VN_LAST, seed + 5)}`;
    list.push({
      studentId: `${classId}-S${String(i + 1).padStart(2, "0")}`,
      studentName: name,
    });
  }
  return list;
}

export const MOCK_CLASSES = [
  { id: "10A1", name: "10A1" },
  { id: "10A2", name: "10A2" },
  { id: "11B1", name: "11B1" },
] as const;

export const MOCK_STUDENTS_BY_CLASS: Record<string, MockStudent[]> = {
  "10A1": buildStudents("10A1"),
  "10A2": buildStudents("10A2"),
  "11B1": buildStudents("11B1"),
};
