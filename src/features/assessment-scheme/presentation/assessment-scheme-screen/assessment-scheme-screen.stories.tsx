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
  termId: "HK1",
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

/** Open a shadcn Select (by its associated label) and pick an option by text. */
async function selectByLabel(
  canvas: ReturnType<typeof within>,
  labelName: string,
  optionName: string,
) {
  // findByRole retries until the previous Select's portal fully closes and the
  // transient aria-hidden it puts on the background is cleared (Radix bleed).
  const trigger = await canvas.findByRole("combobox", { name: labelName });
  await userEvent.click(trigger);
  const listbox = within(document.body);
  await userEvent.click(
    await listbox.findByRole("option", { name: optionName }),
  );
}

// Term selector — no term chosen: scheme editor is gated, a prompt is shown.
export const TermNotSelected: Story = {
  render: () => withProviders(baseProps),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await selectByLabel(
      canvas,
      messages.assessmentScheme.gradeLevelLabel,
      `${messages.assessmentScheme.gradePrefix} 10`,
    );
    await selectByLabel(canvas, messages.assessmentScheme.subjectLabel, "Toán");
    // Term still unset → prompt visible, TT22 preset button not rendered.
    await expect(
      await canvas.findByText(messages.assessmentScheme.termPromptBody),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByText(messages.assessmentScheme.applyPresetTT22),
    ).not.toBeInTheDocument();
  },
};

// Term HK1 selected → scheme editor loads.
export const TermHK1Selected: Story = {
  render: () => withProviders(baseProps),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await selectByLabel(
      canvas,
      messages.assessmentScheme.gradeLevelLabel,
      `${messages.assessmentScheme.gradePrefix} 10`,
    );
    await selectByLabel(canvas, messages.assessmentScheme.subjectLabel, "Toán");
    await selectByLabel(canvas, messages.assessmentScheme.termLabel, "HK1");
    await expect(
      await canvas.findByText(messages.assessmentScheme.applyPresetTT22),
    ).toBeInTheDocument();
  },
};

// Term HK2 selected → scheme editor loads (per-term).
export const TermHK2Selected: Story = {
  render: () => withProviders(baseProps),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await selectByLabel(
      canvas,
      messages.assessmentScheme.gradeLevelLabel,
      `${messages.assessmentScheme.gradePrefix} 10`,
    );
    await selectByLabel(canvas, messages.assessmentScheme.subjectLabel, "Toán");
    await selectByLabel(canvas, messages.assessmentScheme.termLabel, "HK2");
    await expect(
      await canvas.findByText(messages.assessmentScheme.applyPresetTT22),
    ).toBeInTheDocument();
  },
};

// Scheme load fails for a selected term → inline error.
export const SchemeLoadError: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      onLoadAssessmentScheme: async () => {
        throw new Error("boom");
      },
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await selectByLabel(
      canvas,
      messages.assessmentScheme.gradeLevelLabel,
      `${messages.assessmentScheme.gradePrefix} 10`,
    );
    await selectByLabel(canvas, messages.assessmentScheme.subjectLabel, "Toán");
    await selectByLabel(canvas, messages.assessmentScheme.termLabel, "HK1");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      messages.assessmentScheme.errorNetwork,
    );
  },
};

/* ------------------------------------------------------------------ */
/* US-E18.49 — bands + requiredCount are REAL (BE US-189)              */
/* ------------------------------------------------------------------ */

/** A tenant's own saved bands (NOT the SCALE_10 preset) round-trip into the editor. */
export const CustomisedNumericBands: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      initialGradeScale: {
        type: "SCALE_10",
        maxScore: 10,
        effectiveFrom: "2024-09-01T00:00:00.000Z",
        bands: [
          {
            id: "band-1",
            label: "Đạt",
            minThreshold: 5,
            colorToken: "success",
          },
          {
            id: "band-2",
            label: "Chưa đạt",
            minThreshold: 0,
            colorToken: "error",
          },
        ],
      },
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The saved labels win over the hardcoded preset ("Giỏi"/"Khá"/…).
    await expect(await canvas.findByDisplayValue("Đạt")).toBeInTheDocument();
    await expect(canvas.getByDisplayValue("Chưa đạt")).toBeInTheDocument();
    await expect(
      canvas.queryByDisplayValue("Xuất sắc"),
    ).not.toBeInTheDocument();
  },
};

/** The server's 422 GRADE_SCALE_INVALID_BANDS surfaces a band-specific message. */
export const InvalidBandsServerError: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      onSaveGradeScale: async () => ({
        ok: false,
        errorKey: "invalid-bands",
      }),
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByText(messages.assessmentScheme.saveBands),
    );
    await expect(
      await canvas.findByText(messages.assessmentScheme.errorInvalidBands),
    ).toBeInTheDocument();
    // …and NOT the generic unknown-error copy.
    await expect(
      canvas.queryByText(messages.assessmentScheme.errorUnknown),
    ).not.toBeInTheDocument();
  },
};

/**
 * `requiredCount` is display metadata: an unset column renders empty (never a
 * fabricated 1) and the hint must not imply the BE enforces the count.
 */
export const RequiredCountSetAndUnset: Story = {
  render: () =>
    withProviders({
      ...baseProps,
      onLoadAssessmentScheme: async () => ({
        subjectId: "s10-toan",
        yearLabel: "2024-2025",
        termId: "HK1",
        columns: [
          { id: "tx", type: "TX", label: "TX", count: 4, weight: 40 },
          { id: "ck", type: "CK", label: "CK", count: null, weight: 60 },
        ],
      }),
    }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await selectByLabel(
      canvas,
      messages.assessmentScheme.gradeLevelLabel,
      `${messages.assessmentScheme.gradePrefix} 10`,
    );
    await selectByLabel(canvas, messages.assessmentScheme.subjectLabel, "Toán");
    await selectByLabel(canvas, messages.assessmentScheme.termLabel, "HK1");

    const counts = await canvas.findAllByRole("spinbutton", {
      name: messages.assessmentScheme.columnCount,
    });
    await expect(counts[0]).toHaveValue(4);
    // Unset stays EMPTY — not 1, not 0.
    await expect(counts[1]).toHaveValue(null);
    await expect(counts[1]).toHaveAttribute(
      "placeholder",
      messages.assessmentScheme.columnCountPlaceholder,
    );

    // Informational hint, never an enforcement promise.
    const hints = canvas.getAllByText(
      messages.assessmentScheme.columnCountHint,
    );
    await expect(hints.length).toBe(2);
    // No count error while both values are legal (unset included).
    await expect(
      canvas.queryByText(messages.assessmentScheme.errorInvalidCount),
    ).not.toBeInTheDocument();
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
        termId: "HK1",
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
