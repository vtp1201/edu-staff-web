import { describe, expect, it } from "vitest";
import type { ParentStudentLink } from "../../domain/entities/parent-student-link.entity";
import { buildRowVM, type RowVMLabels } from "./build-row-vm";

const labels: RowVMLabels = {
  relationshipLabelOf: (r) => `rel:${r}`,
  consentLabelOf: (c) => `consent:${c}`,
  formatDate: (iso) => `date:${iso}`,
};

const link: ParentStudentLink = {
  linkId: "l1",
  studentId: "st1",
  studentName: "Nguyễn Minh Khoa",
  studentAvatarUrl: "a.png",
  studentClassName: "11A2",
  parentId: "pa1",
  parentName: "Nguyễn Văn Bình",
  parentPhone: "0912 345 678",
  relationship: "father",
  note: "ghi chú",
  consentStatus: "agreed",
  linkedOn: "2025-08-12",
};

describe("buildRowVM", () => {
  it("nests student/parent and resolves all labels via the injected resolvers", () => {
    const vm = buildRowVM(link, labels);
    expect(vm).toEqual({
      linkId: "l1",
      student: {
        memberId: "st1",
        fullName: "Nguyễn Minh Khoa",
        avatarUrl: "a.png",
        className: "11A2",
      },
      parent: {
        memberId: "pa1",
        fullName: "Nguyễn Văn Bình",
        avatarUrl: undefined,
        phone: "0912 345 678",
      },
      relationship: "father",
      relationshipLabel: "rel:father",
      consentStatus: "agreed",
      consentLabel: "consent:agreed",
      note: "ghi chú",
      linkedOnLabel: "date:2025-08-12",
      actions: { viewDetail: true, unlink: true },
    });
  });

  it("carries an absent note through as undefined (AC-004.2)", () => {
    const vm = buildRowVM({ ...link, note: undefined }, labels);
    expect(vm.note).toBeUndefined();
  });
});
