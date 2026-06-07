import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AttendanceRecord } from "../../domain/entities/attendance-record.entity";
import type { ClassPeriod } from "../../domain/entities/class-period.entity";
import { AttendanceScreen } from "./attendance-screen";

const period: ClassPeriod = {
  id: "p-1",
  classId: "c-1",
  className: "10A1",
  subject: "Toán",
  date: "2026-06-07",
  period: 2,
};

const records: AttendanceRecord[] = [
  {
    studentId: "s1",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    status: "present",
  },
  {
    studentId: "s2",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    status: "absent",
  },
  {
    studentId: "s3",
    studentName: "Lê Quốc Châu",
    studentCode: "HS003",
    status: "excused",
  },
  {
    studentId: "s4",
    studentName: "Phạm Minh Dũng",
    studentCode: "HS004",
    status: "present",
  },
];

const saveAction = () => Promise.resolve({ ok: true } as const);

const meta: Meta<typeof AttendanceScreen> = {
  title: "Attendance/AttendanceScreen",
  component: AttendanceScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AttendanceScreen>;

const classes = [{ id: "c-1", name: "10A1" }];

/** Roster loaded: editable table, summary, save/all-present controls. */
export const WithRoster: Story = {
  args: {
    classes,
    roster: { period, records },
    history: [],
    filters: { classId: "c-1", date: "2026-06-07", period: "2" },
    saveAction,
  },
};

/** No class/date/period selected yet — friendly empty state. */
export const Empty: Story = {
  args: {
    classes,
    roster: null,
    history: [],
    filters: {},
    saveAction,
  },
};
