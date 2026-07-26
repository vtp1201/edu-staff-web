/**
 * Unit tests — deriveVisibleClasses (US-E13.8, FR-003/004/005).
 * Client-side status → grade → name → sort pipeline over already-loaded rows
 * (the real `GET /api/v1/classes` wire has no status/gradeLevel/name/sort
 * query param). Covers AC-1.8, 1.9, 1.11, 1.12, 1.13, 1.15, 1.16, 1.17.
 */
import { describe, expect, it } from "vitest";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import {
  type ClassFilterState,
  deriveVisibleClasses,
} from "./derive-visible-classes";

function cls(over: Partial<Class> = {}): Class {
  return {
    id: "c-1",
    name: "10A1",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 30,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    ...over,
  };
}

const ROWS: Class[] = [
  cls({ id: "b", name: "11B1", gradeLevel: 11 }),
  cls({ id: "a", name: "10A1", gradeLevel: 10 }),
  cls({ id: "z", name: "12C1", gradeLevel: 12, status: "ARCHIVED" }),
  cls({ id: "c", name: "10A2", gradeLevel: 10 }),
];

const DEFAULTS: ClassFilterState = {
  statusFilter: "ACTIVE",
  gradeFilter: "ALL",
  nameSearch: "",
  sort: null,
};

function ids(rows: Class[]): string[] {
  return rows.map((r) => r.id);
}

describe("deriveVisibleClasses — status filter (AC-1.8 / AC-1.9)", () => {
  it("shows only ACTIVE rows by default", () => {
    expect(ids(deriveVisibleClasses(ROWS, DEFAULTS))).toEqual(["b", "a", "c"]);
  });

  it("shows only ARCHIVED rows when the filter is ARCHIVED", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ARCHIVED",
    });
    expect(ids(out)).toEqual(["z"]);
  });

  it("shows every row when the filter is ALL", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
    });
    expect(ids(out)).toEqual(["b", "a", "z", "c"]);
  });

  it("preserves insertion order when unsorted (no implicit sort)", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
    });
    expect(ids(out)).toEqual(ids(ROWS));
  });

  it("does not mutate the input array", () => {
    const input = [...ROWS];
    deriveVisibleClasses(input, {
      ...DEFAULTS,
      statusFilter: "ALL",
      sort: { key: "name", dir: "desc" },
    });
    expect(ids(input)).toEqual(ids(ROWS));
  });
});

describe("deriveVisibleClasses — grade filter (AC-1.11)", () => {
  it("keeps only the selected grade level", () => {
    const out = deriveVisibleClasses(ROWS, { ...DEFAULTS, gradeFilter: 10 });
    expect(ids(out)).toEqual(["a", "c"]);
  });

  it("returns an empty list when no loaded row matches the grade", () => {
    expect(deriveVisibleClasses(ROWS, { ...DEFAULTS, gradeFilter: 9 })).toEqual(
      [],
    );
  });
});

describe("deriveVisibleClasses — name search (AC-1.12)", () => {
  it("matches a case-insensitive substring", () => {
    const out = deriveVisibleClasses(ROWS, { ...DEFAULTS, nameSearch: "10a" });
    expect(ids(out)).toEqual(["a", "c"]);
  });

  it("trims surrounding whitespace before matching", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      nameSearch: "  b1 ",
    });
    expect(ids(out)).toEqual(["b"]);
  });

  it("treats a whitespace-only search as no search", () => {
    const out = deriveVisibleClasses(ROWS, { ...DEFAULTS, nameSearch: "   " });
    expect(ids(out)).toEqual(["b", "a", "c"]);
  });
});

describe("deriveVisibleClasses — combined AND semantics (AC-1.13)", () => {
  it("applies status AND grade AND name together", () => {
    const out = deriveVisibleClasses(ROWS, {
      statusFilter: "ACTIVE",
      gradeFilter: 10,
      nameSearch: "a2",
      sort: null,
    });
    expect(ids(out)).toEqual(["c"]);
  });

  it("returns empty when one criterion excludes everything (ARCHIVED + grade 10)", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ARCHIVED",
      gradeFilter: 10,
    });
    expect(out).toEqual([]);
  });
});

describe("deriveVisibleClasses — sort (AC-1.15 / AC-1.16 / AC-1.17)", () => {
  it("sorts by name ascending with Vietnamese collation", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
      sort: { key: "name", dir: "asc" },
    });
    expect(out.map((r) => r.name)).toEqual(["10A1", "10A2", "11B1", "12C1"]);
  });

  it("sorts by name descending", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
      sort: { key: "name", dir: "desc" },
    });
    expect(out.map((r) => r.name)).toEqual(["12C1", "11B1", "10A2", "10A1"]);
  });

  it("orders Vietnamese-diacritic names by locale collation, not code points", () => {
    const rows = [
      cls({ id: "d", name: "Đội tuyển" }),
      cls({ id: "e", name: "Anh văn" }),
      cls({ id: "f", name: "Dự bị" }),
    ];
    const out = deriveVisibleClasses(rows, {
      ...DEFAULTS,
      sort: { key: "name", dir: "asc" },
    });
    expect(out.map((r) => r.name)).toEqual(["Anh văn", "Dự bị", "Đội tuyển"]);
  });

  it("sorts by gradeLevel ascending, then by name within the same grade", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
      sort: { key: "gradeLevel", dir: "asc" },
    });
    expect(out.map((r) => r.name)).toEqual(["10A1", "10A2", "11B1", "12C1"]);
  });

  it("sorts by gradeLevel descending", () => {
    const out = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
      sort: { key: "gradeLevel", dir: "desc" },
    });
    expect(out.map((r) => r.gradeLevel)).toEqual([12, 11, 10, 10]);
  });

  it("keeps the active sort applied after a filter change (AC-1.17)", () => {
    const sort = { key: "name", dir: "desc" } as const;
    const all = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
      sort,
    });
    const grade10 = deriveVisibleClasses(ROWS, {
      ...DEFAULTS,
      statusFilter: "ALL",
      gradeFilter: 10,
      sort,
    });
    expect(all.map((r) => r.name)).toEqual(["12C1", "11B1", "10A2", "10A1"]);
    expect(grade10.map((r) => r.name)).toEqual(["10A2", "10A1"]);
  });
});
