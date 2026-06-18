import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  AssessmentScheme,
  SubjectForGrade,
} from "../../domain/entities/assessment-scheme.entity";
import { TT22_PRESET } from "../../domain/entities/assessment-scheme.entity";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import { AssessmentSchemeScreen } from "./assessment-scheme-screen";
import type { AssessmentSchemeScreenProps } from "./assessment-scheme-screen.i-vm";

const SUBJECTS: SubjectForGrade[] = [
  { id: "s10-toan", name: "Toán", gradeLevel: 10, requiredAssessmentCount: 4 },
  {
    id: "s10-van",
    name: "Ngữ văn",
    gradeLevel: 10,
    requiredAssessmentCount: 4,
  },
];

const noopSave = async () => ({ ok: true });
const errorSave = async () => ({ ok: false, errorKey: "network-error" });

const baseScheme: AssessmentScheme = {
  subjectId: "s10-toan",
  yearLabel: "2024-2025",
  columns: structuredClone(TT22_PRESET),
};

function withProviders(props: AssessmentSchemeScreenProps) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={messages}>
        <AssessmentSchemeScreen {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof AssessmentSchemeScreen> = {
  title: "Admin/AssessmentSchemeScreen",
  component: AssessmentSchemeScreen,
};
export default meta;

type Story = StoryObj<typeof AssessmentSchemeScreen>;

const baseProps: AssessmentSchemeScreenProps = {
  initialGradeScale: GRADE_SCALE_PRESETS.SCALE_10,
  initialError: null,
  availableGradeLevels: [10, 11, 12],
  onSaveGradeScale: noopSave,
  onSaveAssessmentScheme: noopSave,
  onLoadSubjectsForGrade: async () => SUBJECTS,
  onLoadAssessmentScheme: async () => baseScheme,
};

export const GradeScaleEditor: Story = {
  render: () => withProviders(baseProps),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(messages.assessmentScheme.gradeScaleSection),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      initialGradeScale: null,
    }),
};

export const Loading: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      onLoadAssessmentScheme: () =>
        new Promise<AssessmentScheme>(() => {
          /* never resolves — pending state */
        }),
    }),
};

export const SchemeEditor: Story = {
  render: () => withProviders(baseProps),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        messages.assessmentScheme.assessmentSchemeSection,
      ),
    ).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      initialGradeScale: null,
      initialError: { type: "network-error" },
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(messages.assessmentScheme.errorNetwork),
    ).toBeInTheDocument();
  },
};

export const WeightValidationError: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      onSaveGradeScale: errorSave,
      onSaveAssessmentScheme: errorSave,
      onLoadAssessmentScheme: async () => ({
        subjectId: "s10-toan",
        yearLabel: "2024-2025",
        columns: [
          { id: "tx", type: "TX", label: "TX", count: 2, weight: 20 },
          { id: "ck", type: "CK", label: "CK", count: 1, weight: 30 },
        ],
      }),
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The grade-scale Save button stays enabled (valid preset); confirm it renders.
    await waitFor(async () => {
      await expect(
        canvas.getByText(messages.assessmentScheme.saveBands),
      ).toBeInTheDocument();
    });
    await userEvent.click(
      canvas.getByText(messages.assessmentScheme.saveBands),
    );
    await expect(
      await canvas.findByText(messages.assessmentScheme.errorNetwork),
    ).toBeInTheDocument();
  },
};
