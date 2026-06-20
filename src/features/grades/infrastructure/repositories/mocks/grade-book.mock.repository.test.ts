import { describe, expect, it } from "vitest";
import { MockGradeBookRepository } from "./grade-book.mock.repository";

describe("MockGradeBookRepository", () => {
  it("getGradeBook returns all 5 seeded rows with class metadata", async () => {
    const repo = new MockGradeBookRepository();
    const book = await repo.getGradeBook("cs-001", "HK1");
    expect(book.rows).toHaveLength(5);
    expect(book.classSubjectId).toBe("cs-001");
    expect(book.className).toBe("10A1");
    expect(book.subjectName).toBe("Toán");
    expect(book.scheme.columns).toHaveLength(3);
  });

  it("getGradeBook recomputes averages and exposes conduct grades", async () => {
    const repo = new MockGradeBookRepository();
    const book = await repo.getGradeBook("cs-001", "HK1");
    const an = book.rows.find((r) => r.studentId === "hs-001");
    expect(an?.average).toBe(8.5);
    expect(an?.conductGrade).toBe("Tot");
    const cuong = book.rows.find((r) => r.studentId === "hs-003");
    expect(cuong?.average).toBe(9.7);
  });

  it("getMyGrades returns a single row (the signed-in student)", async () => {
    const repo = new MockGradeBookRepository();
    const book = await repo.getMyGrades("HK1");
    expect(book.rows).toHaveLength(1);
    expect(book.rows[0].studentId).toBe("hs-001");
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
    const book = await repo.getChildGrades("c1", "HK1");
    expect(book.className).toBe("11A2");
    expect(book.rows).toHaveLength(5);
    expect(book.rows[0].studentId).toBe("hs-001");
  });

  it("getChildGrades(c2) returns the 8B1 (child 1) grade book", async () => {
    const repo = new MockGradeBookRepository();
    const book = await repo.getChildGrades("c2", "HK1");
    expect(book.className).toBe("8B1");
    expect(book.rows).toHaveLength(5);
    expect(book.rows[0].studentId).toBe("c2-hs-001");
  });

  it("getChildGrades(unknown) falls back to the 11A2 (child 0) grade book", async () => {
    const repo = new MockGradeBookRepository();
    const book = await repo.getChildGrades("unknown", "HK1");
    expect(book.className).toBe("11A2");
    expect(book.rows[0].studentId).toBe("hs-001");
  });

  it("threads the injected publish mode", async () => {
    const repo = new MockGradeBookRepository("ADMIN_APPROVAL");
    const book = await repo.getGradeBook("cs-001", "HK1");
    expect(book.publishMode).toBe("ADMIN_APPROVAL");
  });
});
