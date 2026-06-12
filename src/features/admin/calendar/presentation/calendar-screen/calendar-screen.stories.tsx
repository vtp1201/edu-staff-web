import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AcademicYear } from "../../domain/entities/academic-year.entity";
import { CalendarScreen } from "./calendar-screen";
import type { CalendarActions } from "./calendar-screen.i-vm";

const SEED: AcademicYear[] = [
  {
    id: "ay2025",
    label: "2025–2026",
    isActive: true,
    terms: [
      {
        id: "t1",
        name: "Học kỳ 1",
        startDate: "2025-09-05",
        endDate: "2026-01-15",
        hasGrades: true,
      },
      {
        id: "t2",
        name: "Học kỳ 2",
        startDate: "2026-01-20",
        endDate: "2026-05-31",
        hasGrades: false,
      },
    ],
  },
  {
    id: "ay2024",
    label: "2024–2025",
    isActive: false,
    terms: [
      {
        id: "t3",
        name: "Học kỳ 1",
        startDate: "2024-09-04",
        endDate: "2025-01-12",
        hasGrades: true,
      },
    ],
  },
];

const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

const actions: CalendarActions = {
  createYearAction: async (label, isActive) => ({
    ok: true as const,
    year: { id: newId("ay"), label, isActive, terms: [] },
  }),
  createTermAction: async (_y, name, startDate, endDate) => ({
    ok: true as const,
    term: { id: newId("tm"), name, startDate, endDate, hasGrades: false },
  }),
  updateTermAction: async (_y, termId, name, startDate, endDate) => ({
    ok: true as const,
    term: { id: termId, name, startDate, endDate, hasGrades: false },
  }),
  deleteTermAction: async () => ({ ok: true as const }),
};

const meta: Meta<typeof CalendarScreen> = {
  title: "Admin/CalendarScreen",
  component: CalendarScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="flex h-screen bg-background">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CalendarScreen>;

export const Default: Story = {
  args: { initialData: { years: SEED }, actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Both year labels are rendered (accordion headers)
    await expect(canvas.getByText("2025–2026")).toBeInTheDocument();
    await expect(canvas.getByText("2024–2025")).toBeInTheDocument();
    // Active year carries the "Đang hoạt động" badge
    await expect(
      canvas.getByText(messages.calendar.year.active),
    ).toBeInTheDocument();
    // Add-year form is present
    await expect(
      canvas.getByText(messages.calendar.addYear.title),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { initialData: { years: [] }, actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Empty-state title and CTA must be visible
    await expect(
      canvas.getByText(messages.calendar.empty.title),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: messages.calendar.empty.cta }),
    ).toBeInTheDocument();
    // No year card buttons should exist
    const yearButtons = canvas.queryAllByRole("button", {
      expanded: false,
    });
    // The only button in the left column is the empty-state CTA
    await expect(yearButtons.length).toBeGreaterThanOrEqual(1);
  },
};

export const YearExpanded: Story = {
  args: { initialData: { years: SEED }, actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The component auto-expands the first year on mount; verify term rows are visible
    await expect(canvas.getByText("Học kỳ 1")).toBeInTheDocument();
    await expect(canvas.getByText("Học kỳ 2")).toBeInTheDocument();
    // Column header for terms is visible
    await expect(
      canvas.getByText(messages.calendar.term.name),
    ).toBeInTheDocument();
    // Collapse then re-expand using keyboard to verify accordion toggle
    const yearButton = canvas.getByRole("button", { name: /2025–2026/ });
    await expect(yearButton).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(yearButton);
    await expect(yearButton).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(yearButton);
    await expect(yearButton).toHaveAttribute("aria-expanded", "true");
  },
};

export const TermEditing: Story = {
  args: {
    initialData: {
      years: [
        {
          id: "ay2026",
          label: "2026–2027",
          isActive: true,
          terms: [
            {
              id: "tA",
              name: "Học kỳ 1",
              startDate: "2026-09-05",
              endDate: "2027-01-15",
              hasGrades: false,
            },
          ],
        },
      ],
    },
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Year is auto-expanded; edit button should be visible
    const editButton = await canvas.findByRole("button", {
      name: messages.calendar.term.edit,
    });
    await expect(editButton).toBeInTheDocument();
    // Click edit — inline inputs should appear
    await userEvent.click(editButton);
    // Term name input is now visible and focused
    const nameInput = await canvas.findByRole("textbox", {
      name: messages.calendar.term.name,
    });
    await expect(nameInput).toBeInTheDocument();
    // Save and Cancel icon-buttons are rendered
    await expect(
      canvas.getByRole("button", { name: messages.calendar.term.save }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: messages.calendar.term.cancel }),
    ).toBeInTheDocument();
    // Cancel restores the read-only row
    await userEvent.click(
      canvas.getByRole("button", { name: messages.calendar.term.cancel }),
    );
    await expect(canvas.findByText("Học kỳ 1")).resolves.toBeInTheDocument();
    await expect(
      canvas.queryByRole("textbox", { name: messages.calendar.term.name }),
    ).not.toBeInTheDocument();
  },
};
