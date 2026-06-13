import { beforeEach, describe, expect, it } from "vitest";
import { MockSubjectCatalogueRepository } from "./subject-catalogue.mock.repository";

describe("MockSubjectCatalogueRepository", () => {
  let repo: MockSubjectCatalogueRepository;

  beforeEach(() => {
    repo = new MockSubjectCatalogueRepository();
  });

  it("createParent then listParents — new parent appears", async () => {
    const result = await repo.createParent({
      name: "Bộ môn Vật lý",
      conceptType: "BO_MON",
      conceptLabelCustom: null,
    });
    expect(result.ok).toBe(true);
    const list = await repo.listParents();
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value.some((p) => p.name === "Bộ môn Vật lý")).toBe(true);
    }
  });

  it("createSubject with valid code then listSubjects — subject appears", async () => {
    const created = await repo.createSubject({
      parentId: "sp-math",
      name: "Toán lớp 12 nâng cao",
      code: "MATH12X",
      gradeLevel: 12,
    });
    expect(created.ok).toBe(true);
    const list = await repo.listSubjects("sp-math");
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.value.some((s) => s.code === "MATH12X")).toBe(true);
    }
  });

  it("archiveParent with activeChildCount = 0 → ARCHIVED status", async () => {
    const result = await repo.archiveParent("sp-science");
    expect(result.ok).toBe(true);
    const list = await repo.listParents();
    if (list.ok) {
      const parent = list.value.find((p) => p.id === "sp-science");
      expect(parent?.status).toBe("ARCHIVED");
    }
  });

  it("archiveSubject with inUse = false → ARCHIVED status", async () => {
    const result = await repo.archiveSubject("sub-math-12");
    expect(result.ok).toBe(true);
    const list = await repo.listSubjects("sp-math");
    if (list.ok) {
      const subject = list.value.find((s) => s.id === "sub-math-12");
      expect(subject?.status).toBe("ARCHIVED");
    }
  });

  it("getSubject bundles class offerings", async () => {
    const result = await repo.getSubject("sub-math-10");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.classOfferings.length).toBeGreaterThan(0);
    }
  });
});
