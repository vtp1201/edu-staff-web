import type { Meta, StoryObj } from "@storybook/react";
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
  parameters: { layout: "fullscreen" },
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
