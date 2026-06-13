import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { SubjectParent } from "../../domain/entities/subject-parent.entity";
import { SubjectDepartmentsScreen } from "./subject-departments-screen";

const parents: SubjectParent[] = [
  {
    id: "sp-math",
    name: "Bộ môn Toán",
    conceptType: "BO_MON",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 3,
    activeChildCount: 3,
  },
  {
    id: "sp-foreign",
    name: "Tổ Ngoại ngữ",
    conceptType: "TO",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 3,
    activeChildCount: 2,
  },
  {
    id: "sp-science",
    name: "Khoa Khoa học Tự nhiên",
    conceptType: "KHOA",
    conceptLabelCustom: null,
    status: "ARCHIVED",
    childCount: 0,
    activeChildCount: 0,
  },
];

const okParent = async (data: { name: string }) => ({
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
});
const okVoid = async () => ({ ok: true as const });

const meta: Meta<typeof SubjectDepartmentsScreen> = {
  title: "Admin/SubjectCatalogue/DepartmentsScreen",
  component: SubjectDepartmentsScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    onCreateParent: okParent,
    onPatchParent: async (_id, data) => okParent(data as { name: string }),
    onArchiveParent: okVoid,
    onRestoreParent: okVoid,
  },
};
export default meta;
type Story = StoryObj<typeof SubjectDepartmentsScreen>;

export const Success: Story = {
  args: { initialParents: parents },
};

export const Empty: Story = {
  args: { initialParents: [] },
};
