import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  TimetableConflictScan,
  TimetableData,
} from "../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import { detectConflicts } from "../../domain/use-cases/detect-conflicts.use-case";
import type { Result } from "../../domain/use-cases/result";
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

/**
 * Build the screen VM for a given class from a flat slot list (whole school).
 * `detectConflicts` stands in for the BE scan here exactly as it does in the
 * mock repository, so the stories exercise the same shapes the real endpoint
 * produces.
 */
function vmFor(
  classId: string,
  allSlots: TimetableSlot[],
  scanOverride?: Result<TimetableConflictScan>,
) {
  const slots: Record<string, TimetableSlot> = {};
  for (const s of allSlots) slots[s.slotKey] = s;
  const classSlots: Record<string, TimetableSlot> = {};
  for (const s of allSlots)
    if (s.classId === classId) classSlots[s.slotKey] = s;
  const data: TimetableData = { classId, yearId: YEAR, slots: classSlots };
  const scan: Result<TimetableConflictScan> = scanOverride ?? {
    ok: true,
    value: {
      termId: "term-story",
      conflicts: detectConflicts(slots),
      truncated: false,
    },
  };
  return buildTimetableVM(data, classId, YEAR, scan);
}

// 10A1 slots + a 10A2 collision on Mon-1 (tch-1) → one teacher conflict for 10A1.
const CONFLICT_SLOTS: TimetableSlot[] = [
  slot("cls-10a1", 0, 1, "sub-math", "tch-1", "P.201"),
  slot("cls-10a1", 0, 2, "sub-math", "tch-1", "P.201"),
  slot("cls-10a1", 0, 3, "sub-lit", "tch-4", "P.201"),
  slot("cls-10a1", 1, 3, "sub-phys", "tch-2", "P.LAB1"),
  slot("cls-10a1", 2, 4, "sub-eng", "tch-5", "P.201"),
  // collisions in other classes (different rooms → teacher-only clashes)
  slot("cls-10a2", 0, 1, "sub-math", "tch-1", "P.202"),
  slot("cls-11b2", 1, 3, "sub-phys", "tch-2", "P.301"),
  slot("cls-11b2", 2, 4, "sub-eng", "tch-5", "P.301"),
];

/** Same-room, different-teacher pair → a pure ROOM clash (BE ADR 0128 kind). */
const ROOM_CONFLICT_SLOTS: TimetableSlot[] = [
  slot("cls-10a1", 0, 1, "sub-math", "tch-1", "P.201"),
  slot("cls-11a1", 0, 1, "sub-bio", "tch-7", "P.201"),
];

const NO_CONFLICT_SLOTS: TimetableSlot[] = [
  slot("cls-11a1", 0, 1, "sub-chem", "tch-3", "P.301"),
  slot("cls-11a1", 0, 2, "sub-bio", "tch-7", "P.LAB3"),
  slot("cls-11a1", 2, 5, "sub-bio", "tch-7", "P.LAB3"),
];

const meta: Meta<typeof TimetableScreen> = {
  title: "Admin/TimetableScreen",
  component: TimetableScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
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
    onRescanConflicts: () => {},
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
    // Whole-school conflicts panel shows at least one teacher conflict.
    await expect(
      canvas.getAllByText(
        messages.timetable.conflicts.type["teacher-double-booked"],
      ).length,
    ).toBeGreaterThan(0);
    await expect(
      canvas.getAllByText(messages.timetable.conflicts.resolve).length,
    ).toBeGreaterThan(0);
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

/**
 * US-E18.48: the second conflict kind BE US-188 reports. ADR 0128 says the write
 * path does NOT reject a duplicate room, so this row must carry the
 * "detected — resolve manually" note and must NOT be worded as a block.
 */
export const RoomConflict: Story = {
  args: { vm: vmFor("cls-10a1", ROOM_CONFLICT_SLOTS) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.timetable.conflicts.type["room-double-booked"]),
    ).toBeInTheDocument();
    // The manual-resolution caveat is present…
    await expect(
      canvas.getByText(messages.timetable.conflicts.roomManualHint),
    ).toBeInTheDocument();
    // …and a room clash is NOT presented as a teacher clash.
    await expect(
      canvas.queryByText(
        messages.timetable.conflicts.type["teacher-double-booked"],
      ),
    ).not.toBeInTheDocument();
  },
};

/** Both kinds in one scan, rendered distinctly (BE returns them interleaved). */
export const BothConflictKinds: Story = {
  args: {
    vm: vmFor("cls-10a1", [
      ...CONFLICT_SLOTS,
      // 11A1 takes P.201 at Mon-1 with a different teacher → room clash too.
      slot("cls-11a1", 0, 1, "sub-bio", "tch-7", "P.201"),
    ]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText(
        messages.timetable.conflicts.type["room-double-booked"],
      ).length,
    ).toBeGreaterThan(0);
    await expect(
      canvas.getAllByText(
        messages.timetable.conflicts.type["teacher-double-booked"],
      ).length,
    ).toBeGreaterThan(0);
  },
};

/**
 * The BE scan is budget-bounded: `truncated: true` means MORE conflicts may
 * exist. It is a hint, never an error — the list is still rendered.
 */
export const TruncatedScan: Story = {
  args: {
    vm: vmFor("cls-10a1", CONFLICT_SLOTS, {
      ok: true,
      value: {
        termId: "term-story",
        truncated: true,
        conflicts: [
          {
            type: "teacher-double-booked",
            day: 0,
            period: 1,
            classes: [
              { classId: "cls-10a1", subjectId: "sub-math" },
              { classId: "cls-10a2", subjectId: "sub-math" },
            ],
            teacherId: "tch-1",
          },
        ],
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.timetable.conflicts.truncatedHint),
    ).toBeInTheDocument();
    // Truncation does not suppress the listed (still accurate) conflicts.
    await expect(
      canvas.getByText(
        messages.timetable.conflicts.type["teacher-double-booked"],
      ),
    ).toBeInTheDocument();
  },
};

/**
 * A failed scan degrades INSIDE the panel: the grid still renders, and the panel
 * shows the error + retry instead of claiming "no conflicts".
 */
export const ConflictScanError: Story = {
  args: {
    vm: vmFor("cls-10a1", CONFLICT_SLOTS, {
      ok: false,
      failure: { type: "forbidden", message: "admin only" },
    }),
    onRescanConflicts: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.timetable.conflicts.errorTitle),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(messages.timetable.errors.forbidden),
    ).toBeInTheDocument();
    // The screen the admin came for is still usable.
    await expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
    // A failed scan must never read as a clean school.
    await expect(
      canvas.queryByText(messages.timetable.conflicts.noConflicts),
    ).not.toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole("button", {
        name: messages.timetable.conflicts.retry,
      }),
    );
    await waitFor(() => expect(args.onRescanConflicts).toHaveBeenCalled());
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

/**
 * US-E18.26 (QA gap): the repository/mapper layer proves `room` round-trips
 * through the RMW PUT, but nothing exercised the actual UI wiring — the
 * `SlotEditorDialog`'s room `<Input>` reading the existing slot's room and
 * `handleSave` forwarding the EDITED room value to `updateSlotAction`. This
 * story closes that gap: open the editor on an already-filled cell (room
 * "P.201"), confirm the field is pre-populated, change it, save, and assert
 * the action receives the new room untouched by any other field.
 */
export const RoomFieldEditAndSave: Story = {
  args: {
    vm: vmFor("cls-10a1", CONFLICT_SLOTS),
    actions: {
      updateSlotAction: fn(async () => ({ ok: true as const })),
      clearSlotAction: async () => ({ ok: true as const }),
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Mon-1 (day 0, period 1) is "sub-math"/"tch-1"/"P.201" per CONFLICT_SLOTS.
    const cell = canvas.getAllByText("Toán")[0];
    await userEvent.click(cell);

    const dialog = await within(document.body).findByRole("dialog");
    const roomInput = within(dialog).getByLabelText(
      messages.timetable.slotEditor.room,
    ) as HTMLInputElement;
    // The existing slot's room is read back into the field, not left blank.
    await expect(roomInput).toHaveValue("P.201");

    await userEvent.clear(roomInput);
    await userEvent.type(roomInput, "P.305");
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: messages.timetable.slotEditor.save,
      }),
    );

    await waitFor(() =>
      expect(args.actions.updateSlotAction).toHaveBeenCalledWith(
        "cls-10a1",
        YEAR,
        0,
        1,
        { subjectId: "sub-math", teacherId: "tch-1", room: "P.305" },
      ),
    );
  },
};
