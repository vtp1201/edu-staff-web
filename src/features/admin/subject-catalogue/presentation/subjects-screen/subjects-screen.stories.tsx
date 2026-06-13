import type { Meta, StoryObj } from "@storybook/react";
import type { Subject } from "../../domain/entities/subject.entity";
import { SubjectsScreen } from "./subjects-screen";
import type { ParentWithSubjectsVM } from "./subjects-screen.i-vm";

const mkSubject = (
  id: string,
  parentId: string,
  name: string,
  code: string,
  grade: number,
  inUse: boolean,
): Subject => ({
  id,
  parentId,
  name,
  code,
  gradeLevel: grade,
  status: "ACTIVE",
  inUse,
  periodCount: inUse ? 105 : null,
  requiredAssessmentCount: inUse ? 4 : null,
  outcomeTargets: "",
  masterSyllabus: "",
  exerciseBankRef: "",
  examBankRef: "",
});

const parents: ParentWithSubjectsVM[] = [
  {
    id: "sp-math",
    name: "Bộ môn Toán",
    conceptType: "BO_MON",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 2,
    activeChildCount: 2,
    subjects: [
      mkSubject("sub-math-10", "sp-math", "Toán lớp 10", "MATH10", 10, true),
      mkSubject("sub-math-12", "sp-math", "Toán lớp 12", "MATH12", 12, false),
    ],
  },
  {
    id: "sp-lit",
    name: "Bộ môn Ngữ văn",
    conceptType: "BO_MON",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 0,
    activeChildCount: 0,
    subjects: [],
  },
];

const okSubject = async () => ({
  ok: true as const,
  subject: mkSubject("sub-new", "sp-math", "New", "NEW", 10, false),
});

const meta: Meta<typeof SubjectsScreen> = {
  title: "Admin/SubjectCatalogue/SubjectsScreen",
  component: SubjectsScreen,
  parameters: { layout: "fullscreen" },
  args: {
    onCreateParent: async (data) => ({
      ok: true as const,
      parent: {
        id: `sp-${Math.random()}`,
        name: data.name,
        conceptType: "BO_MON" as const,
        conceptLabelCustom: null,
        status: "ACTIVE" as const,
        childCount: 0,
        activeChildCount: 0,
      },
    }),
    onCreateSubject: okSubject,
    onGetSubject: async (id) => ({
      ok: true as const,
      subject: mkSubject(id, "sp-math", "Toán lớp 10", "MATH10", 10, true),
      classOfferings: [
        {
          id: "cs-1",
          className: "Lớp 10A1",
          academicYear: "2025–2026",
          teacherName: "Nguyễn Thị Hương",
          studentCount: 42,
        },
      ],
    }),
    onPatchSubject: okSubject,
    onArchiveSubject: async () => ({ ok: true as const }),
  },
};
export default meta;
type Story = StoryObj<typeof SubjectsScreen>;

export const Success: Story = {
  args: { initialParents: parents, gradeRange: { minGrade: 10, maxGrade: 12 } },
};

export const NoGradeRange: Story = {
  args: { initialParents: parents, gradeRange: null },
};

export const Empty: Story = {
  args: { initialParents: [], gradeRange: { minGrade: 10, maxGrade: 12 } },
};
