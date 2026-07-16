import { describe, expect, it } from "vitest";
import type { ClassSubjectTermKey } from "../../../domain/entities/class-subject-term-key.entity";
import { MockGradeBookRepository } from "./grade-book.mock.repository";

const key: ClassSubjectTermKey = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

describe("MockGradeBookRepository", () => {
  it("getGradeBook returns all 5 seeded rows with class metadata", async () => {
    const repo = new MockGradeBookRepository();
    const book = await repo.getGradeBook(key);
    expect(book.rows).toHaveLength(5);
    expect(book.classId).toBe("class-001");
    expect(book.subjectId).toBe("subj-toan-10");
    expect(book.className).toBe("10A1");
    expect(book.subjectName).toBe("Toán");
    expect(book.scheme.columns).toHaveLength(3);
  });

  it("getGradeBook recomputes averages and exposes conduct grades", async () => {
    const repo = new MockGradeBookRepository();
    const book = await repo.getGradeBook(key);
    const an = book.rows.find((r) => r.studentId === "hs-001");
    expect(an?.average).toBe(8.5);
    expect(an?.conductGrade).toBe("Tot");
    const cuong = book.rows.find((r) => r.studentId === "hs-003");
    expect(cuong?.average).toBe(9.7);
  });

  it("getMyGrades returns one GradeBook (array) for the signed-in student", async () => {
    const repo = new MockGradeBookRepository();
    const books = await repo.getMyGrades("hs-001", "2025-2026");
    expect(books).toHaveLength(1);
    expect(books[0].rows).toHaveLength(1);
    expect(books[0].rows[0].studentId).toBe("hs-001");
    expect(books[0].academicYearLabel).toBe("2025-2026");
  });

  it("getChildList returns the seeded children for the parent viewer", async () => {
    const repo = new MockGradeBookRepository();
    const children = await repo.getChildList();
    expect(children).toHaveLength(2);
    expect(children[0].childId).toBe("c1");
    expect(children[1].childId).toBe("c2");
  });

  it("getChildGrades(c1) returns the 11A2 (child 0) grade book", async () => {
    const repo = new MockGradeBookRepository();
    const books = await repo.getChildGrades("c1", "2025-2026");
    expect(books[0].className).toBe("11A2");
    expect(books[0].rows).toHaveLength(5);
    expect(books[0].rows[0].studentId).toBe("hs-001");
  });

  it("getChildGrades(c2) returns the 8B1 (child 1) grade book", async () => {
    const repo = new MockGradeBookRepository();
    const books = await repo.getChildGrades("c2", "2025-2026");
    expect(books[0].className).toBe("8B1");
    expect(books[0].rows).toHaveLength(5);
    expect(books[0].rows[0].studentId).toBe("c2-hs-001");
  });

  it("getChildGrades(unknown) falls back to the 11A2 (child 0) grade book", async () => {
    const repo = new MockGradeBookRepository();
    const books = await repo.getChildGrades("unknown", "2025-2026");
    expect(books[0].className).toBe("11A2");
    expect(books[0].rows[0].studentId).toBe("hs-001");
  });

  it("threads the injected publish mode", async () => {
    const repo = new MockGradeBookRepository("ADMIN_APPROVAL");
    const book = await repo.getGradeBook(key);
    expect(book.publishMode).toBe("ADMIN_APPROVAL");
  });
});
