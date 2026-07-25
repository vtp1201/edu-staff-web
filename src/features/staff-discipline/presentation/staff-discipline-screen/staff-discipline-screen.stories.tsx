import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import {
  expect,
  fireEvent,
  fn,
  userEvent,
  waitFor,
  within,
} from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { StaffConductNoteEntity } from "../../domain/entities/staff-conduct-note.entity";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type { StaffViolationEntity } from "../../domain/entities/staff-violation.entity";
import {
  StaffDisciplineScreen,
  type StaffDisciplineScreenProps,
} from "./staff-discipline-screen";
import type {
  StaffDisciplineActionResult,
  StaffDisciplineScreenVM,
} from "./staff-discipline-screen.i-vm";

const m = messages.staffDiscipline;
const mErr = messages.discipline.errors;

const ROSTER: StaffRosterEntry[] = [
  {
    staffMemberId: "staff-1",
    staffName: "Nguyễn Thị Hương",
    department: "Tổ Toán",
    initials: "NH",
  },
  {
    staffMemberId: "staff-2",
    staffName: "Trần Văn Minh",
    department: "Tổ Lý-Hoá",
    initials: "TM",
  },
  {
    staffMemberId: "staff-4",
    staffName: "Đỗ Thị Mai",
    department: "Tổ Ngoại Ngữ",
    initials: "DM",
  },
];

const REJECT_ROW = `${messages.staffDiscipline.violations.actions.reject} — Đỗ Thị Mai`;
const APPROVE_ROW = `${messages.staffDiscipline.violations.actions.approve} — Đỗ Thị Mai`;

/** Mirrors `SD_CATEGORIES` (mock DATA / stored wire values, not i18n copy). */
const CATEGORIES = [
  "Đi làm muộn / vắng không phép",
  "Vi phạm quy chế chuyên môn",
  "Ứng xử không đúng mực với HS/PH",
  "Vi phạm quy định trang phục/tác phong",
  "Khác",
];

const TERMS = [
  { id: "HK1-2025-2026", label: "Học kỳ 1 — 2025–2026" },
  { id: "HK2-2024-2025", label: "Học kỳ 2 — 2024–2025" },
];

function violation(
  over: Partial<StaffViolationEntity> & Pick<StaffViolationEntity, "recordId">,
): StaffViolationEntity {
  return {
    staffMemberId: "staff-4",
    staffName: "Đỗ Thị Mai",
    department: "Tổ Ngoại Ngữ",
    category: "Đi làm muộn / vắng không phép",
    description: "Vào lớp trễ 20 phút không báo trước.",
    severity: "MODERATE",
    occurredAt: "2026-05-04",
    state: "SUBMITTED",
    authorMemberId: "admin-1",
    selfApproved: false,
    createdAt: "2026-05-04T09:10:00Z",
    updatedAt: "2026-05-04T09:10:00Z",
    ...over,
  };
}

function note(
  over: Partial<StaffConductNoteEntity> &
    Pick<StaffConductNoteEntity, "staffMemberId">,
): StaffConductNoteEntity {
  return {
    termId: "HK1-2025-2026",
    staffName: "Nguyễn Thị Hương",
    department: "Tổ Toán",
    rating: "SATISFACTORY",
    note: "Hoàn thành tốt nhiệm vụ chuyên môn.",
    state: "DRAFT",
    authorMemberId: "admin-1",
    selfApproved: false,
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-01-20T10:00:00Z",
    ...over,
  };
}

const VIOLATIONS: StaffViolationEntity[] = [
  violation({ recordId: "sv-001", state: "SUBMITTED" }),
  violation({
    recordId: "sv-002",
    staffMemberId: "staff-2",
    staffName: "Trần Văn Minh",
    department: "Tổ Lý-Hoá",
    severity: "MINOR",
    state: "DRAFT",
  }),
  violation({
    recordId: "sv-003",
    staffMemberId: "staff-1",
    staffName: "Nguyễn Thị Hương",
    department: "Tổ Toán",
    severity: "SEVERE",
    state: "APPROVED",
    approverMemberId: "admin-1",
    selfApproved: true,
  }),
  violation({
    recordId: "sv-005",
    state: "REJECTED",
    approverMemberId: "admin-2",
    rejectionReason: "Có xác nhận của bảo vệ trường về sự cố bất khả kháng.",
  }),
];

const CONDUCT_NOTES: StaffConductNoteEntity[] = [
  note({
    staffMemberId: "staff-1",
    state: "APPROVED",
    approverMemberId: "admin-2",
  }),
  note({
    staffMemberId: "staff-2",
    staffName: "Trần Văn Minh",
    department: "Tổ Lý-Hoá",
    rating: "NEEDS_IMPROVEMENT",
    note: "Chậm tiến độ nộp báo cáo chuyên môn.",
    state: "SUBMITTED",
  }),
  note({
    staffMemberId: "staff-4",
    staffName: "Đỗ Thị Mai",
    department: "Tổ Ngoại Ngữ",
    rating: "UNSATISFACTORY",
    note: "Vi phạm nội quy tác phong nhiều lần trong kỳ.",
    state: "DRAFT",
  }),
];

const ok = <T,>(data: T): StaffDisciplineActionResult<T> => ({
  ok: true,
  data,
});

const base: StaffDisciplineScreenVM = {
  viewerRole: "principal",
  viewerMemberId: "admin-1",
  initialViolations: VIOLATIONS,
  initialConductNotes: CONDUCT_NOTES,
  initialTermId: "HK1-2025-2026",
  staffRoster: ROSTER,
  violationCategories: CATEGORIES,
  termOptions: TERMS,
  listViolationsAction: async () => ok(VIOLATIONS),
  createViolationAction: async () => ok(VIOLATIONS[0]),
  submitViolationAction: async () => ok(VIOLATIONS[1]),
  approveViolationAction: async () => ok(VIOLATIONS[0]),
  rejectViolationAction: async () => ok(VIOLATIONS[3]),
  listConductNotesAction: async () => ok(CONDUCT_NOTES),
  setConductNoteAction: async () => ok(CONDUCT_NOTES[2]),
  submitConductNoteAction: async () => ok(CONDUCT_NOTES[2]),
  approveConductNoteAction: async () => ok(CONDUCT_NOTES[1]),
  rejectConductNoteAction: async () => ok(CONDUCT_NOTES[1]),
};

const teacherBase: StaffDisciplineScreenVM = {
  ...base,
  viewerRole: "teacher",
  viewerMemberId: "m-teacher",
  viewerStaffMemberId: "staff-1",
  // Server-scoped to the teacher's own records (NFR-008 pt.3).
  initialViolations: [VIOLATIONS[2]],
  initialConductNotes: [CONDUCT_NOTES[0]],
  listViolationsAction: async () => ok([VIOLATIONS[2]]),
  listConductNotesAction: async () => ok([CONDUCT_NOTES[0]]),
};

const meta: Meta<typeof StaffDisciplineScreen> = {
  title: "Features/StaffDiscipline/StaffDisciplineScreen",
  component: StaffDisciplineScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      // Radix portals can leave a body pointer-events lock behind between
      // stories — reset it so dialog stories stay interactive.
      document.body.style.pointerEvents = "auto";
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, retryDelay: 0 } },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-[color:var(--edu-bg)]">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof StaffDisciplineScreen>;
type ScreenArgs = StaffDisciplineScreenProps;

// --- Violations tab ---------------------------------------------------------

export const ViolationsTabPopulatedPrincipal: Story = {
  args: base,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: m.title, level: 1 }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText("Đỗ Thị Mai").length).toBeGreaterThan(0);
    // Principal-only affordances present.
    await expect(
      canvas.getByRole("button", { name: m.violations.addNew }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: APPROVE_ROW }),
    ).toBeInTheDocument();
  },
};

export const ViolationsTabPopulatedTeacherReadOnly: Story = {
  args: teacherBase,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nguyễn Thị Hương")).toBeInTheDocument();
    // Zero mutating controls in the DOM — absent, not disabled (AC-001.3).
    await expect(
      canvas.queryByRole("button", { name: m.violations.addNew }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("button", {
        name: new RegExp(m.violations.actions.approve),
      }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("button", {
        name: new RegExp(m.violations.actions.submit),
      }),
    ).toBeNull();
    await expect(
      canvas.getByText(m.conductNotes.readOnlyLabel),
    ).toBeInTheDocument();
  },
};

/** AC-004.2 / ADR 0073 — the annotation is present and cannot be suppressed. */
export const SelfApprovedAlwaysVisible: Story = {
  args: base,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText(m.conductNotes.selfApprovedNote).length,
    ).toBeGreaterThan(0);
  },
};

/**
 * First paint of the violations tab is ALWAYS RSC-seeded, so there is no
 * skeleton flash there even with a hanging client action (NFR-006 satisfied by
 * the seed, not by a spinner). The skeleton is proved on the genuinely cold
 * query path — `ConductNotesTabLoadingSkeleton` below.
 */
export const ViolationsTabRscSeededNoSkeletonFlash: Story = {
  args: {
    ...base,
    listViolationsAction: () =>
      new Promise<StaffDisciplineActionResult<StaffViolationEntity[]>>(
        () => {},
      ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Đỗ Thị Mai").length).toBeGreaterThan(0);
    await expect(
      canvas.queryByLabelText(messages.Common.skeleton.loadingAriaLabel),
    ).toBeNull();
  },
};

/** NFR-006 / AC-006.1 — cold query (term change) renders the 4-row skeleton. */
export const ConductNotesTabLoadingSkeleton: Story = {
  args: {
    ...base,
    initialTab: "conductNotes",
    listConductNotesAction: (params) =>
      params.termId === TERMS[1].id
        ? new Promise<StaffDisciplineActionResult<StaffConductNoteEntity[]>>(
            () => {},
          )
        : Promise.resolve(ok(CONDUCT_NOTES)),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(m.conductNotes.filters.term));
    await userEvent.click(
      await within(document.body).findByRole("option", {
        name: TERMS[1].label,
      }),
    );
    await waitFor(() =>
      expect(
        canvas.getByText(messages.Common.skeleton.loadingAriaLabel),
      ).toBeInTheDocument(),
    );
  },
};

export const ViolationsTabEmptyPrincipal: Story = {
  args: {
    ...base,
    initialViolations: [],
    listViolationsAction: async () => ok([]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(m.violations.empty.adminCta),
    ).toBeInTheDocument();
    await expect(
      canvas.getAllByRole("button", { name: m.violations.addNew }).length,
    ).toBeGreaterThan(0);
  },
};

export const ViolationsTabEmptyTeacher: Story = {
  args: {
    ...teacherBase,
    initialViolations: [],
    listViolationsAction: async () => ok([]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(m.violations.empty.readOnly),
    ).toBeInTheDocument();
    // No CTA at all in the teacher empty state (AC-001.5).
    await expect(
      canvas.queryByRole("button", { name: m.violations.addNew }),
    ).toBeNull();
  },
};

export const ViolationsTabError: Story = {
  args: {
    ...base,
    initialViolations: [],
    initialViolationsErrorKey: "network-error",
    listViolationsAction: async () => ({
      ok: false,
      errorKey: "network-error",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("alert")).toBeInTheDocument());
    await expect(canvas.getByText(mErr["network-error"])).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: m.retry }),
    ).toBeInTheDocument();
  },
};

// --- Create-violation dialog ------------------------------------------------

export const CreateViolationDialogHappy: Story = {
  args: { ...base, createViolationAction: fn(async () => ok(VIOLATIONS[0])) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.violations.addNew }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(dialog.getByText(m.violations.form.title)).toBeInTheDocument();
    // Submit stays disabled until every required field is filled.
    await expect(
      dialog.getByRole("button", {
        name: messages.Common.confirmDialog.confirm,
      }),
    ).toBeDisabled();
  },
};

/**
 * AC-002.2 (extended to the category field) — `category` is a SELECT over the
 * static `SD_CATEGORIES` prop (design-spec `createForm.fields[2]`): opening it
 * lists exactly the 5 options and fires ZERO network calls (no list refetch, no
 * create call), because the picklist is a prop and there is no search action.
 */
export const CreateViolationDialogCategoryStaticSelect: Story = {
  args: {
    ...base,
    listViolationsAction: fn(async () => ok(VIOLATIONS)),
    createViolationAction: fn(async () => ok(VIOLATIONS[0])),
  },
  play: async ({ canvasElement, args }) => {
    const vmArgs = args as ScreenArgs;
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.violations.addNew }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));

    const categoryTrigger = dialog.getByLabelText(m.violations.form.category);
    await userEvent.click(categoryTrigger);
    const options = await within(document.body).findAllByRole("option");
    await expect(options).toHaveLength(CATEGORIES.length);
    await expect(options.map((o) => o.textContent)).toEqual(CATEGORIES);

    await userEvent.click(options[1]);
    await waitFor(() =>
      expect(categoryTrigger).toHaveTextContent(CATEGORIES[1]),
    );
    // Zero network calls for this field, ever.
    await expect(vmArgs.listViolationsAction).not.toHaveBeenCalled();
    await expect(vmArgs.createViolationAction).not.toHaveBeenCalled();
  },
};

/**
 * Design-spec `createForm.fields[3]` — severity is a SEGMENTED control (radiogroup
 * of 3 radios, arrow-key navigable), not a dropdown.
 */
export const CreateViolationDialogSeveritySegmented: Story = {
  args: base,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.violations.addNew }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    const group = dialog.getByRole("radiogroup", {
      name: m.violations.form.severity,
    });
    const segments = within(group).getAllByRole("radio");
    await expect(segments).toHaveLength(3);
    await userEvent.click(
      within(group).getByRole("radio", { name: m.violations.severity.medium }),
    );
    await waitFor(() =>
      expect(
        within(group).getByRole("radio", {
          name: m.violations.severity.medium,
        }),
      ).toHaveAttribute("aria-checked", "true"),
    );
  },
};

/** Design-spec `setForm.fields[0]` — rating is segmented too. */
export const SetConductNoteDialogRatingSegmented: Story = {
  args: { ...base, initialTab: "conductNotes" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.conductNotes.form.title }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    const group = dialog.getByRole("radiogroup", {
      name: m.conductNotes.form.rating,
    });
    await expect(within(group).getAllByRole("radio")).toHaveLength(3);
    await userEvent.click(
      within(group).getByRole("radio", {
        name: m.conductNotes.rating.unsatisfactory,
      }),
    );
    await waitFor(() =>
      expect(
        within(group).getByRole("radio", {
          name: m.conductNotes.rating.unsatisfactory,
        }),
      ).toHaveAttribute("aria-checked", "true"),
    );
  },
};

export const CreateViolationDialogValidationError: Story = {
  args: {
    ...base,
    createViolationAction: async () => ({
      ok: false,
      errorKey: "validation",
      fields: [{ field: "description", reason: "required" }],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.violations.addNew }),
    );
    await expect(
      await within(document.body).findByRole("dialog"),
    ).toBeInTheDocument();
  },
};

export const CreateViolationDialogNetworkError: Story = {
  args: {
    ...base,
    createViolationAction: async () => ({
      ok: false,
      errorKey: "network-error",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.violations.addNew }),
    );
    await expect(
      await within(document.body).findByRole("dialog"),
    ).toBeInTheDocument();
  },
};

// --- Reject panel (shared shape) --------------------------------------------

export const RejectPanelClientGuard: Story = {
  args: base,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: REJECT_ROW }));
    const confirm = await canvas.findByRole("button", {
      name: m.rejectDialog.confirm,
    });
    // <10 chars → confirm stays disabled, no request is sent (AC-005.1).
    await expect(confirm).toBeDisabled();
    await expect(
      canvas.getByText(m.rejectDialog.reasonMinLength),
    ).toBeInTheDocument();
    const field = canvas.getByLabelText(new RegExp(m.rejectDialog.title, "i"));
    await userEvent.type(field, "ngắn");
    await expect(confirm).toBeDisabled();
  },
};

export const RejectPanelHappy: Story = {
  args: { ...base, rejectViolationAction: fn(async () => ok(VIOLATIONS[3])) },
  play: async ({ canvasElement, args }) => {
    const vmArgs = args as ScreenArgs;
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: REJECT_ROW }));
    const field = await canvas.findByLabelText(
      new RegExp(m.rejectDialog.title, "i"),
    );
    await userEvent.type(field, "Lý do từ chối hợp lệ và đủ dài.");
    const confirm = canvas.getByRole("button", {
      name: m.rejectDialog.confirm,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(vmArgs.rejectViolationAction).toHaveBeenCalledTimes(1),
    );
  },
};

export const RejectPanelServerGuard: Story = {
  args: {
    ...base,
    rejectViolationAction: async () => ({
      ok: false,
      errorKey: "missing-reject-reason",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: REJECT_ROW }));
    const field = await canvas.findByLabelText(
      new RegExp(m.rejectDialog.title, "i"),
    );
    await userEvent.type(field, "Lý do từ chối hợp lệ và đủ dài.");
    await userEvent.click(
      canvas.getByRole("button", { name: m.rejectDialog.confirm }),
    );
    // Server's own guard renders inline; the panel stays open (AC-005.3).
    await waitFor(() =>
      expect(
        canvas.getByText(mErr["missing-reject-reason"]),
      ).toBeInTheDocument(),
    );
    await expect(field).toHaveAttribute("aria-invalid", "true");
  },
};

/**
 * A11Y-001 — `aria-invalid` marks a REAL failure only. On open (and while the
 * reason is still too short, before any submit is possible) the textarea is NOT
 * flagged invalid; the requirement is carried by `aria-required` + the hint.
 * Contrast with `RejectPanelServerGuard`, where the server failure DOES flag it.
 */
export const RejectPanelNotInvalidBeforeFailure: Story = {
  args: base,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: REJECT_ROW }));
    const field = await canvas.findByLabelText(
      new RegExp(m.rejectDialog.title, "i"),
    );
    await expect(field).not.toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAttribute("aria-required", "true");
    await userEvent.type(field, "ngắn");
    await expect(field).not.toHaveAttribute("aria-invalid", "true");
  },
};

/** A11Y-002 — closing the inline panel returns focus to its trigger (WCAG 2.4.3). */
export const RejectPanelRestoresFocusOnCancel: Story = {
  args: base,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: REJECT_ROW });
    await userEvent.click(trigger);
    const cancel = await canvas.findByRole("button", {
      name: m.rejectDialog.cancel,
    });
    await userEvent.click(cancel);
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: REJECT_ROW })).toHaveFocus(),
    );
  },
};

/** S3 — the confirm button announces its busy label while the reject is in flight. */
export const RejectPanelBusyLabel: Story = {
  args: {
    ...base,
    rejectViolationAction: () =>
      new Promise<StaffDisciplineActionResult<StaffViolationEntity>>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: REJECT_ROW }));
    const field = await canvas.findByLabelText(
      new RegExp(m.rejectDialog.title, "i"),
    );
    await userEvent.type(field, "Lý do từ chối hợp lệ và đủ dài.");
    const confirm = canvas.getByRole("button", {
      name: m.rejectDialog.confirm,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(
        canvas.getByRole("button", {
          name: m.violations.actions.rejecting,
        }),
      ).toHaveAttribute("aria-busy", "true"),
    );
  },
};

/**
 * NFR-004 / A11Y-003 + A11Y-004 — every animation on this screen is gated behind
 * `prefers-reduced-motion` at the CSS level. Storybook has no reduced-motion
 * emulation in this repo (see `messaging-screen.stories.tsx`), so — per the
 * established convention — the story asserts the guard CLASS is present on both
 * animated surfaces: the inline reject panel's expand animation and the pending
 * submit spinner.
 */
export const MotionSafeGating: Story = {
  args: {
    ...base,
    createViolationAction: () =>
      new Promise<StaffDisciplineActionResult<StaffViolationEntity>>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Reject-panel expand animation.
    await userEvent.click(canvas.getByRole("button", { name: REJECT_ROW }));
    const field = await canvas.findByLabelText(
      new RegExp(m.rejectDialog.title, "i"),
    );
    const panel = field.parentElement as HTMLElement;
    await expect(panel.getAttribute("class")).toContain(
      "motion-safe:animate-in",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: m.rejectDialog.cancel }),
    );

    // 2. Pending-submit spinner — fill every required field, then submit.
    await userEvent.click(
      canvas.getByRole("button", { name: m.violations.addNew }),
    );
    const dialogEl = await within(document.body).findByRole("dialog");
    const dialog = within(dialogEl);
    const body = within(document.body);

    await userEvent.click(dialog.getByLabelText(m.violations.form.staffMember));
    await userEvent.click(
      await body.findByRole("option", { name: /Đỗ Thị Mai/ }),
    );
    fireEvent.change(dialog.getByLabelText(m.violations.form.occurredAt), {
      target: { value: "2026-05-04" },
    });
    await userEvent.click(dialog.getByLabelText(m.violations.form.category));
    await userEvent.click(
      await body.findByRole("option", { name: CATEGORIES[0] }),
    );
    // A Radix Select portal marks the dialog `aria-hidden` while it is open and
    // clears it on exit — role queries below must wait for that, otherwise the
    // whole dialog subtree is (correctly) absent from the a11y tree.
    await waitFor(() => expect(dialogEl).not.toHaveAttribute("aria-hidden"));
    await userEvent.click(
      within(
        dialog.getByRole("radiogroup", { name: m.violations.form.severity }),
      ).getByRole("radio", { name: m.violations.severity.medium }),
    );
    await userEvent.type(
      dialog.getByLabelText(m.violations.form.description),
      "Vào lớp trễ 20 phút không báo trước.",
    );

    const confirm = dialog.getByRole("button", {
      name: messages.Common.confirmDialog.confirm,
    });
    await waitFor(() => expect(confirm).toBeEnabled());
    await userEvent.click(confirm);

    const busy = await dialog.findByRole("button", {
      name: m.violations.saving,
    });
    await expect(busy.querySelector("svg")?.getAttribute("class")).toContain(
      "motion-safe:animate-spin",
    );
  },
};

// --- Conduct-notes tab ------------------------------------------------------

export const ConductNotesTabPopulatedPrincipal: Story = {
  args: { ...base, initialTab: "conductNotes" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByLabelText(m.conductNotes.filters.term),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(m.conductNotes.rating.needsImprovement),
    ).toBeInTheDocument();
    // APPROVED row shows the permanent lock notice, no edit trigger (AC-007.4).
    await expect(canvas.getByText(m.errors.locked)).toBeInTheDocument();
  },
};

export const ConductNotesTabPopulatedTeacherNoTermSelector: Story = {
  args: { ...teacherBase, initialTab: "conductNotes" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No term selector for the teacher self-view (AC-006.3).
    await expect(
      canvas.queryByLabelText(m.conductNotes.filters.term),
    ).toBeNull();
    await expect(
      canvas.getByText(m.conductNotes.rating.satisfactory),
    ).toBeInTheDocument();
  },
};

export const ConductNotesTabEmptyPrincipal: Story = {
  args: {
    ...base,
    initialTab: "conductNotes",
    initialConductNotes: [],
    listConductNotesAction: async () => ok([]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(m.conductNotes.empty.adminCta),
    ).toBeInTheDocument();
  },
};

export const ConductNotesTabEmptyTeacher: Story = {
  args: {
    ...teacherBase,
    initialTab: "conductNotes",
    initialConductNotes: [],
    listConductNotesAction: async () => ok([]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(m.conductNotes.empty.readOnly),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: m.conductNotes.form.title }),
    ).toBeNull();
  },
};

export const ConductNotesTabError: Story = {
  args: {
    ...base,
    initialTab: "conductNotes",
    initialConductNotes: [],
    initialConductNotesErrorKey: "network-error",
    listConductNotesAction: async () => ({
      ok: false,
      errorKey: "network-error",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(mErr["network-error"])).toBeInTheDocument(),
    );
  },
};

export const ConductNotesTabTermNotFound: Story = {
  args: {
    ...base,
    initialTab: "conductNotes",
    initialConductNotes: [],
    initialConductNotesErrorKey: "term-not-found",
    listConductNotesAction: async () => ({
      ok: false,
      errorKey: "term-not-found",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Inline on the term selector, list not rendered (AC-006.8).
    await waitFor(() =>
      expect(canvas.getByText(m.errors["term-not-found"])).toBeInTheDocument(),
    );
    await expect(
      canvas.getByLabelText(m.conductNotes.filters.term),
    ).toHaveAttribute("aria-invalid", "true");
  },
};

export const ConductNotesTabTermChange: Story = {
  args: {
    ...base,
    initialTab: "conductNotes",
    listConductNotesAction: fn(async () => ok(CONDUCT_NOTES)),
  },
  play: async ({ canvasElement, args }) => {
    const vmArgs = args as ScreenArgs;
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText(m.conductNotes.filters.term));
    const option = await within(document.body).findByRole("option", {
      name: TERMS[1].label,
    });
    await userEvent.click(option);
    // Term change re-queries INT-006 with the new termId (AC-006.6).
    await waitFor(() =>
      expect(vmArgs.listConductNotesAction).toHaveBeenCalledWith(
        expect.objectContaining({ termId: TERMS[1].id }),
      ),
    );
  },
};

// --- Set-conduct-note dialog -----------------------------------------------

export const SetConductNoteDialogNew: Story = {
  args: { ...base, initialTab: "conductNotes" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.conductNotes.form.title }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    // Empty form for a brand-new note (AC-007.1) + live 5000-char counter.
    await expect(dialog.getByText("0/5000")).toBeInTheDocument();
  },
};

export const SetConductNoteDialogOverwrite: Story = {
  args: { ...base, initialTab: "conductNotes" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The DRAFT row's edit trigger (the APPROVED row has none).
    await userEvent.click(
      canvas.getByRole("button", {
        name: `${m.conductNotes.form.title} — Đỗ Thị Mai`,
      }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    // Pre-filled with the existing note (AC-007.2).
    await expect(
      dialog.getByDisplayValue("Vi phạm nội quy tác phong nhiều lần trong kỳ."),
    ).toBeInTheDocument();
  },
};

export const SetConductNoteDialogLockedNeverOpens: Story = {
  args: {
    ...base,
    initialTab: "conductNotes",
    initialConductNotes: [CONDUCT_NOTES[0]],
    listConductNotesAction: async () => ok([CONDUCT_NOTES[0]]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Only the APPROVED row is present: the lock notice replaces the trigger and
    // no dialog can be opened for it (AC-007.4 / NFR-009).
    await expect(canvas.getByText(m.errors.locked)).toBeInTheDocument();
    const editTriggers = canvas.queryAllByRole("button", {
      name: new RegExp(`${m.conductNotes.form.title} — `),
    });
    // The term-bar "create new" button has no staff suffix — a row edit trigger
    // would; there must be NONE for the APPROVED row.
    await expect(editTriggers.length).toBe(0);
    await expect(within(document.body).queryByRole("dialog")).toBeNull();
  },
};

// --- Tab switcher + responsive --------------------------------------------

export const TabSwitcherKeyboard: Story = {
  args: base,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const violationsTab = canvas.getByRole("tab", { name: m.tabs.violations });
    const conductTab = canvas.getByRole("tab", { name: m.tabs.conductNotes });
    await expect(violationsTab).toHaveAttribute("aria-selected", "true");

    violationsTab.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(conductTab).toHaveAttribute("aria-selected", "true"),
    );
    await expect(
      canvas.getByText(m.conductNotes.rating.needsImprovement),
    ).toBeInTheDocument();
  },
};

/** AC-010.3 — an error on one tab never carries over to the other. */
export const TabSwitcherIndependentErrorState: Story = {
  args: {
    ...base,
    initialViolations: [],
    initialViolationsErrorKey: "network-error",
    listViolationsAction: async () => ({
      ok: false,
      errorKey: "network-error",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(mErr["network-error"])).toBeInTheDocument(),
    );
    await userEvent.click(
      canvas.getByRole("tab", { name: m.tabs.conductNotes }),
    );
    await waitFor(() =>
      expect(
        canvas.getByText(m.conductNotes.rating.needsImprovement),
      ).toBeInTheDocument(),
    );
    await expect(canvas.queryByText(mErr["network-error"])).toBeNull();
  },
};

export const Responsive320: Story = {
  args: base,
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvasElement, page }) => {
    await page?.setViewportSize?.({ width: 320, height: 800 });
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: m.title, level: 1 }),
    ).toBeInTheDocument();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

export const Responsive375: Story = {
  args: base,
  play: async ({ canvasElement, page }) => {
    await page?.setViewportSize?.({ width: 375, height: 800 });
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Đỗ Thị Mai").length).toBeGreaterThan(0);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

export const Responsive768: Story = {
  args: base,
  play: async ({ canvasElement, page }) => {
    await page?.setViewportSize?.({ width: 768, height: 900 });
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Đỗ Thị Mai").length).toBeGreaterThan(0);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

export const Responsive1280: Story = {
  args: base,
  play: async ({ canvasElement, page }) => {
    await page?.setViewportSize?.({ width: 1280, height: 900 });
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Đỗ Thị Mai").length).toBeGreaterThan(0);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};
