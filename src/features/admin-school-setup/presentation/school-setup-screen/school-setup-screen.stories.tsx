import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  SchoolConfig,
  SetupStatus,
} from "../../domain/entities/school-config.entity";
import { SchoolSetupScreen } from "./school-setup-screen";

const configuredConfig: SchoolConfig = {
  gradeLevelRange: { minGrade: 10, maxGrade: 12 },
  operationalSettings: { gradePublishMode: "ADMIN_APPROVAL" },
  activeClassCount: 18,
};

const allPendingStatus: SetupStatus = {
  gradeLevels: false,
  academicCalendar: false,
  subjects: false,
  assessmentScheme: false,
  classes: false,
};

const partialStatus: SetupStatus = {
  gradeLevels: true,
  academicCalendar: true,
  subjects: false,
  assessmentScheme: false,
  classes: false,
};

const noOp = async () => ({ ok: true as const });

const meta: Meta<typeof SchoolSetupScreen> = {
  title: "Admin/SchoolSetupScreen",
  component: SchoolSetupScreen,
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
type Story = StoryObj<typeof SchoolSetupScreen>;

export const Configured: Story = {
  args: {
    initialConfig: configuredConfig,
    initialSetupStatus: partialStatus,
    onSaveGradeRange: noOp,
    onSaveMode: noOp,
  },
};

// Stepper: 0 of 5 complete — fill 0%, counter "Bước 1/5", all steps pending.
export const StepperZeroOfFive: Story = {
  args: {
    initialConfig: configuredConfig,
    initialSetupStatus: allPendingStatus,
    onSaveGradeRange: noOp,
    onSaveMode: noOp,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = await canvas.findByRole("progressbar");
    await expect(bar).toHaveAttribute("aria-valuenow", "0");
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
    // AC-E17.13-04: aria-label from adminSchoolSetup.stepper.ariaLabel (interpolated).
    await expect(bar).toHaveAttribute(
      "aria-label",
      messages.adminSchoolSetup.stepper.ariaLabel
        .replace("{current}", "1")
        .replace("{total}", "5"),
    );
    const fill = bar.querySelector("div");
    await expect(fill?.getAttribute("style")).toContain("width: 0%");
    await expect(fill?.className).toContain("motion-safe:transition-[width]");
    await expect(
      await canvas.findByText(
        messages.adminSchoolSetup.stepper.progress
          .replace("{current}", "1")
          .replace("{total}", "5"),
      ),
    ).toBeInTheDocument();
    // Step 1 is "current"; steps 2–5 announce "pending".
    await expect(
      await canvas.findAllByLabelText(
        messages.adminSchoolSetup.stepper.stepCurrent,
      ),
    ).toHaveLength(1);
    await expect(
      await canvas.findAllByLabelText(
        messages.adminSchoolSetup.stepper.stepPending,
      ),
    ).toHaveLength(4);
  },
};

// Stepper: 2 of 5 complete — fill 40%, aria-valuenow 40, counter "Bước 3/5",
// 2 complete + 1 current + 2 pending icons.
export const StepperTwoOfFive: Story = {
  args: {
    initialConfig: configuredConfig,
    initialSetupStatus: partialStatus,
    onSaveGradeRange: noOp,
    onSaveMode: noOp,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = await canvas.findByRole("progressbar");
    await expect(bar).toHaveAttribute("aria-valuenow", "40");
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
    // AC-E17.13-04: aria-label from adminSchoolSetup.stepper.ariaLabel (interpolated).
    await expect(bar).toHaveAttribute(
      "aria-label",
      messages.adminSchoolSetup.stepper.ariaLabel
        .replace("{current}", "3")
        .replace("{total}", "5"),
    );
    const fill = bar.querySelector("div");
    await expect(fill?.getAttribute("style")).toContain("width: 40%");
    await expect(fill?.getAttribute("style")).not.toContain("scaleX");
    await expect(
      await canvas.findByText(
        messages.adminSchoolSetup.stepper.progress
          .replace("{current}", "3")
          .replace("{total}", "5"),
      ),
    ).toBeInTheDocument();
    await expect(
      await canvas.findAllByLabelText(
        messages.adminSchoolSetup.stepper.stepComplete,
      ),
    ).toHaveLength(2);
    await expect(
      await canvas.findAllByLabelText(
        messages.adminSchoolSetup.stepper.stepCurrent,
      ),
    ).toHaveLength(1);
    await expect(
      await canvas.findAllByLabelText(
        messages.adminSchoolSetup.stepper.stepPending,
      ),
    ).toHaveLength(2);
    // AC-E17.13-13: complete-step badge circle is bg-edu-success; icon itself
    // uses text-edu-text-primary for contrast (a11y-audited deviation from the
    // literal "text-edu-success on icon" wording — badge bg carries the success tone).
    // SVG elements expose `.className` as SVGAnimatedString, not a plain
    // string — read the `class` attribute directly instead.
    const [firstCheckIcon] = await canvas.findAllByLabelText(
      messages.adminSchoolSetup.stepper.stepComplete,
    );
    await expect(firstCheckIcon.getAttribute("class")).toContain(
      "text-edu-text-primary",
    );
    await expect(firstCheckIcon.closest("div")?.className).toContain(
      "bg-edu-success",
    );
    // AC-E17.13-14: current-step Loader2 icon uses text-primary + motion-safe:animate-spin.
    const currentIcon = await canvas.findByLabelText(
      messages.adminSchoolSetup.stepper.stepCurrent,
    );
    await expect(currentIcon.getAttribute("class")).toContain("text-primary");
    await expect(currentIcon.getAttribute("class")).toContain(
      "motion-safe:animate-spin",
    );
  },
};

export const Unconfigured: Story = {
  args: {
    initialConfig: {
      ...configuredConfig,
      gradeLevelRange: null,
      activeClassCount: 0,
    },
    initialSetupStatus: allPendingStatus,
    onSaveGradeRange: noOp,
    onSaveMode: noOp,
  },
};

export const AllDone: Story = {
  args: {
    initialConfig: configuredConfig,
    initialSetupStatus: {
      gradeLevels: true,
      academicCalendar: true,
      subjects: true,
      assessmentScheme: true,
      classes: true,
    },
    onSaveGradeRange: noOp,
    onSaveMode: noOp,
  },
};

export const Loading: Story = {
  args: {
    initialConfig: null,
    initialSetupStatus: null,
    onSaveGradeRange: noOp,
    onSaveMode: noOp,
  },
};
