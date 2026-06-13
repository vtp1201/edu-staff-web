import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import { StudentRosterScreen } from "./student-roster-screen";
import type { StudentRosterScreenVm } from "./student-roster-screen.i-vm";

const classes: ClassSummary[] = [
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
    id: "cls-10b3",
    name: "10B3",
    gradeLevel: 10,
    homeroomTeacher: null,
    year: "2025–2026",
  },
];

const genders: Array<"F" | "M"> = ["F", "M"];
const roster32: RosterStudent[] = Array.from({ length: 32 }, (_, i) => ({
  id: `HS250${String(i + 1).padStart(2, "0")}`,
  name: `Học sinh ${i + 1}`,
  dob: "01/01/2010",
  gender: genders[i % 2],
  status: i === 7 || i === 18 ? "transferred" : "active",
}));

const searchPool: SearchStudent[] = [
  {
    id: "HS25201",
    name: "Nguyễn Hồng Quân",
    currentClassId: null,
    currentClassName: null,
  },
  {
    id: "HS25202",
    name: "Trần Thuỵ Vân",
    currentClassId: "cls-10a2",
    currentClassName: "10A2",
  },
  {
    id: "HS25203",
    name: "Phạm Quang Vinh",
    currentClassId: null,
    currentClassName: null,
  },
];

const baseVm: StudentRosterScreenVm = {
  classes,
  currentClass: classes[0],
  roster: roster32,
  activeCount: roster32.filter((s) => s.status === "active").length,
  transferredCount: roster32.filter((s) => s.status === "transferred").length,
  searchPool,
};

const emptyVm: StudentRosterScreenVm = {
  classes,
  currentClass: classes[2],
  roster: [],
  activeCount: 0,
  transferredCount: 0,
  searchPool,
};

const ok = async () => ({ ok: true as const });
const fail = async () => ({
  ok: false as const,
  errorKey: "network-error" as const,
});

const handlers = {
  onEnroll: ok,
  onUnenroll: ok,
  onUnenrollMany: ok,
  onTransfer: ok,
};

const meta: Meta<typeof StudentRosterScreen> = {
  title: "Admin/StudentRosterScreen",
  component: StudentRosterScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof StudentRosterScreen>;

export const Populated: Story = {
  args: { vm: baseVm, ...handlers },
};

export const EmptyClass: Story = {
  args: { vm: emptyVm, ...handlers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(messages.adminRoster.empty.title),
    ).toBeInTheDocument();
  },
};

export const TransferWarning: Story = {
  args: { vm: baseVm, ...handlers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The transfer-candidate row exposes a "Chuyển lớp" button.
    const transferBtn = await canvas.findByRole("button", {
      name: messages.adminRoster.addPanel.transfer,
    });
    await userEvent.click(transferBtn);
    await waitFor(() =>
      expect(
        document.body.textContent?.includes(
          messages.adminRoster.confirm.transferTitle,
        ),
      ).toBe(true),
    );
  },
};

export const BulkSelected: Story = {
  args: { vm: baseVm, ...handlers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkboxes = await canvas.findAllByRole("checkbox");
    // Skip the header (index 0); select three row checkboxes.
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);
    await userEvent.click(checkboxes[3]);
    await expect(await canvas.findByText(/Đã chọn 3/)).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: { vm: baseVm, ...handlers, onUnenroll: fail },
};

export const Loading: Story = {
  args: { vm: baseVm, ...handlers },
  parameters: {
    docs: {
      description: {
        story:
          "Loading skeleton lives in the RSC Suspense boundary (roster-skeleton.tsx); the client screen itself always renders hydrated data.",
      },
    },
  },
};
