import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { TimetableData } from "../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import { detectConflicts } from "../../domain/use-cases/detect-conflicts.use-case";
import { buildTimetableVM } from "./build-timetable-vm";
import { TimetableScreen } from "./timetable-screen";
import type { TimetableActions } from "./timetable-screen.i-vm";

const YEAR = "2025-2026";

const noopActions: TimetableActions = {
  updateSlotAction: async () => ({ ok: true as const }),
  clearSlotAction: async () => ({ ok: true as const }),
};

const slot = (
  classId: string,
  day: number,
  period: number,
  subjectId: string,
  teacherId: string,
  room: string,
): TimetableSlot => ({
  slotKey: `${classId}|${day}|${period}`,
  classId,
  day,
  period,
  subjectId,
  teacherId,
  room,
});

/** Build the screen VM for a given class from a flat slot list (whole school). */
function vmFor(classId: string, allSlots: TimetableSlot[]) {
  const slots: Record<string, TimetableSlot> = {};
  for (const s of allSlots) slots[s.slotKey] = s;
  const classSlots: Record<string, TimetableSlot> = {};
  for (const s of allSlots)
    if (s.classId === classId) classSlots[s.slotKey] = s;
  const data: TimetableData = {
    classId,
    yearId: YEAR,
    slots: classSlots,
    conflicts: detectConflicts(slots),
  };
  return buildTimetableVM(data, classId, YEAR);
}

// 10A1 slots + a 10A2 collision on Mon-1 (tch-1) → one conflict for 10A1.
const CONFLICT_SLOTS: TimetableSlot[] = [
  slot("cls-10a1", 0, 1, "sub-math", "tch-1", "P.201"),
  slot("cls-10a1", 0, 2, "sub-math", "tch-1", "P.201"),
  slot("cls-10a1", 0, 3, "sub-lit", "tch-4", "P.201"),
  slot("cls-10a1", 1, 3, "sub-phys", "tch-2", "P.LAB1"),
  slot("cls-10a1", 2, 4, "sub-eng", "tch-5", "P.201"),
  // collisions in other classes
  slot("cls-10a2", 0, 1, "sub-math", "tch-1", "P.202"),
  slot("cls-11b2", 1, 3, "sub-phys", "tch-2", "P.301"),
  slot("cls-11b2", 2, 4, "sub-eng", "tch-5", "P.301"),
];

const NO_CONFLICT_SLOTS: TimetableSlot[] = [
  slot("cls-11a1", 0, 1, "sub-chem", "tch-3", "P.301"),
  slot("cls-11a1", 0, 2, "sub-bio", "tch-7", "P.LAB3"),
  slot("cls-11a1", 2, 5, "sub-bio", "tch-7", "P.LAB3"),
];

const meta: Meta<typeof TimetableScreen> = {
  title: "Admin/TimetableScreen",
  component: TimetableScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-background">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: {
    actions: noopActions,
    onSelectClass: () => {},
    onSelectYear: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof TimetableScreen>;

export const Default: Story = {
  args: { vm: vmFor("cls-10a1", CONFLICT_SLOTS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Title + a filled subject short label render.
    await expect(canvas.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
    // Conflict summary shows at least one conflict.
    await expect(
      canvas.getByText(messages.timetable.conflicts.resolve),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { vm: vmFor("cls-12c1", []) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No conflicts banner.
    await expect(
      canvas.getByText(messages.timetable.conflicts.noConflicts),
    ).toBeInTheDocument();
    // Empty cells render the "Thêm" add affordance.
    await expect(
      canvas.getAllByText(messages.timetable.addSlot).length,
    ).toBeGreaterThan(0);
  },
};

export const NoConflicts: Story = {
  args: { vm: vmFor("cls-11a1", NO_CONFLICT_SLOTS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.timetable.conflicts.noConflicts),
    ).toBeInTheDocument();
    // Filled subject visible.
    await expect(canvas.getAllByText("Hoá").length).toBeGreaterThan(0);
  },
};

export const WithSlotEditorOpen: Story = {
  args: { vm: vmFor("cls-10a1", CONFLICT_SLOTS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Click the first filled slot (a "Toán" cell) to open the editor.
    const cell = canvas.getAllByText("Toán")[0];
    await userEvent.click(cell);
    // Dialog opens with the subject/teacher fields (rendered in a portal).
    const dialog = await within(document.body).findByRole("dialog");
    await expect(
      within(dialog).getByText(messages.timetable.slotEditor.subject),
    ).toBeInTheDocument();
    await expect(
      within(dialog).getByText(messages.timetable.slotEditor.teacher),
    ).toBeInTheDocument();
  },
};
