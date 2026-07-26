import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subject } from "@/features/admin/subject-catalogue/domain/entities/subject.entity";
import type { SubjectDetailScreenProps } from "@/features/admin/subject-catalogue/presentation/subjects-screen/subject-detail-screen.i-vm";
import { archiveSubjectAction, patchSubjectAction } from "../actions";

/**
 * US-E12.13 — RSC composition of the deep-link route `/admin/subjects/[id]`.
 *
 * The genuinely new assertion vs. the `question-bank/[id]/edit` pattern: a
 * missing (or cross-tenant) subject renders an INLINE not-found — it must NOT
 * redirect (AC-3). The route needs no guard code of its own; `(app)/admin/
 * layout.tsx` already gates every `/admin/*` segment.
 */

const getSubject = vi.fn();
const listParents = vi.fn();

vi.mock("@/bootstrap/di/subject-catalogue.di", () => ({
  makeSubjectCatalogueRepository: async () => ({ getSubject, listParents }),
}));

const subject: Subject = {
  id: "sub-math-10",
  parentId: "sp-math",
  name: "Toán lớp 10",
  code: "MATH10",
  gradeLevel: 10,
  status: "ACTIVE",
  inUse: false,
  periodCount: 105,
  requiredAssessmentCount: 4,
  outcomeTargets: "",
  masterSyllabus: "",
  exerciseBankRef: "",
  examBankRef: "",
};

const offerings = [
  {
    id: "cs-1",
    className: "Lớp 10A1",
    academicYear: "2025–2026",
    teacherName: "Nguyễn Thị Hương",
    studentCount: 42,
  },
];

const BACK = "/vi/t/thpt-a/admin/subjects";

async function renderPage(id = "sub-math-10") {
  const { default: Page } = await import("./page");
  try {
    const element = await Page({
      params: Promise.resolve({ locale: "vi", tenant: "thpt-a", id }),
    });
    return {
      redirected: false,
      props: element.props as SubjectDetailScreenProps,
    };
  } catch (err) {
    const digest = (err as { digest?: string } | null)?.digest ?? "";
    return { redirected: true, digest, props: null };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  listParents.mockResolvedValue({
    ok: true,
    value: [{ id: "sp-math", name: "Bộ môn Toán" }],
  });
});

describe("SubjectDetailPage — RSC composition", () => {
  it("composes subject, offerings, parent name and the tenant back href", async () => {
    getSubject.mockResolvedValue({
      ok: true,
      value: { subject, classOfferings: offerings },
    });

    const { redirected, props } = await renderPage();

    expect(redirected).toBe(false);
    expect(props?.subject).toEqual(subject);
    expect(props?.classOfferings).toEqual(offerings);
    expect(props?.parentName).toBe("Bộ môn Toán");
    expect(props?.backHref).toBe(BACK);
    expect(getSubject).toHaveBeenCalledWith("sub-math-10");
    // AC-2/AC-4: the page must wire the REAL server actions (not a stub) so
    // save/archive round-trip through the exact same use-case path the Sheet
    // uses — a generic onSave/onArchive prop would satisfy the type but not
    // the AC.
    expect(props?.onSave).toBe(patchSubjectAction);
    expect(props?.onArchive).toBe(archiveSubjectAction);
  });

  it("renders inline not-found (subject: null) WITHOUT redirecting", async () => {
    getSubject.mockResolvedValue({ ok: false, failure: { type: "not-found" } });

    const { redirected, props } = await renderPage("nope");

    expect(redirected).toBe(false);
    expect(props?.subject).toBeNull();
    expect(props?.classOfferings).toEqual([]);
    expect(props?.backHref).toBe(BACK);
    // No point resolving a breadcrumb parent for a subject we cannot show.
    expect(listParents).not.toHaveBeenCalled();
  });

  it("uses the same generic not-found state for forbidden (no tenant leak)", async () => {
    getSubject.mockResolvedValue({ ok: false, failure: { type: "forbidden" } });

    const { redirected, props } = await renderPage("other-tenant-subject");

    expect(redirected).toBe(false);
    expect(props?.subject).toBeNull();
  });

  it("still renders with an empty breadcrumb when the parent lookup fails", async () => {
    getSubject.mockResolvedValue({
      ok: true,
      value: { subject, classOfferings: [] },
    });
    listParents.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });

    const { redirected, props } = await renderPage();

    expect(redirected).toBe(false);
    expect(props?.subject).toEqual(subject);
    expect(props?.parentName).toBe("");
  });

  it("falls back to an empty breadcrumb when the parent id is unknown", async () => {
    getSubject.mockResolvedValue({
      ok: true,
      value: {
        subject: { ...subject, parentId: "sp-ghost" },
        classOfferings: [],
      },
    });

    const { props } = await renderPage();

    expect(props?.parentName).toBe("");
  });
});
