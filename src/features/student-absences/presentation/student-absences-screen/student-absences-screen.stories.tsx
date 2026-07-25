import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import type { StudentAbsenceEntity } from "../../domain/entities/student-absence.entity";
import type { StudentRosterEntry } from "../../domain/entities/student-roster-entry.entity";
import {
  StudentAbsencesScreen,
  type StudentAbsencesScreenProps,
} from "./student-absences-screen";
import type {
  PrincipalStudentAbsencesVM,
  StudentAbsencesActionResult,
  StudentAbsencesErrorKey,
  TeacherStudentAbsencesVM,
} from "./student-absences-screen.i-vm";

const m = messages.studentAbsences;
const mErr = messages.discipline.errors;

const TODAY = "2026-05-06";
const OWN_CLASS = "11B2";

const ROSTER: StudentRosterEntry[] = [
  { studentMemberId: "stu-1", fullName: "Trần Văn Bình", className: OWN_CLASS },
  { studentMemberId: "stu-4", fullName: "Lê Thị Cẩm", className: OWN_CLASS },
  {
    studentMemberId: "stu-6",
    fullName: "Nguyễn Minh Anh",
    className: OWN_CLASS,
  },
  { studentMemberId: "stu-2", fullName: "Phạm Đức Dũng", className: "10A1" },
];

function absence(
  over: Partial<StudentAbsenceEntity> &
    Pick<StudentAbsenceEntity, "studentMemberId" | "date">,
): StudentAbsenceEntity {
  return {
    classId: OWN_CLASS,
    excused: true,
    state: "RECORDED",
    recordedByMemberId: "teacher-1",
    createdAt: "2026-05-05T07:40:00Z",
    updatedAt: "2026-05-05T07:40:00Z",
    ...over,
  };
}

/** RECORDED + excused. */
const ROW_RECORDED_EXCUSED = absence({
  studentMemberId: "stu-1",
  date: "2026-05-05",
  reason: "Sốt cao, có giấy khám của trạm y tế phường.",
});
/** RECORDED + unexcused. */
const ROW_RECORDED_UNEXCUSED = absence({
  studentMemberId: "stu-4",
  date: "2026-05-05",
  excused: false,
});
/** FLAGGED + unexcused. */
const ROW_FLAGGED_UNEXCUSED = absence({
  studentMemberId: "stu-6",
  date: "2026-05-04",
  excused: false,
  state: "FLAGGED_UNEXCUSED",
  flaggedByMemberId: "admin-1",
  reason: "Không rõ lý do, gia đình không liên lạc được.",
});
/** FLAGGED + EXCUSED — the orthogonality proof (AC-007.4). */
const ROW_FLAGGED_EXCUSED = absence({
  studentMemberId: "stu-1",
  date: "2026-05-02",
  excused: true,
  state: "FLAGGED_UNEXCUSED",
  flaggedByMemberId: "admin-1",
});

const ALL_ROWS: StudentAbsenceEntity[] = [
  ROW_RECORDED_EXCUSED,
  ROW_RECORDED_UNEXCUSED,
  ROW_FLAGGED_UNEXCUSED,
  ROW_FLAGGED_EXCUSED,
];

function ok<T>(data: T): StudentAbsencesActionResult<T> {
  return { ok: true, data };
}
function failWith<T>(
  errorKey: StudentAbsencesErrorKey,
): StudentAbsencesActionResult<T> {
  return { ok: false, errorKey };
}
/** A promise that never settles — models "request in flight forever". */
function pending<T>(): Promise<StudentAbsencesActionResult<T>> {
  return new Promise<StudentAbsencesActionResult<T>>(() => {});
}

const teacherBase: TeacherStudentAbsencesVM = {
  viewerRole: "teacher",
  classId: OWN_CLASS,
  today: TODAY,
  initialAbsences: ALL_ROWS,
  roster: ROSTER.filter((s) => s.className === OWN_CLASS),
  listAbsencesAction: async () => ok(ALL_ROWS),
  recordAbsenceAction: async () =>
    ok(absence({ studentMemberId: "stu-4", date: TODAY, excused: false })),
  editAbsenceAction: async () =>
    ok({ ...ROW_RECORDED_EXCUSED, excused: false }),
};

const principalBase: PrincipalStudentAbsencesVM = {
  viewerRole: "principal",
  today: TODAY,
  initialAbsences: ALL_ROWS,
  roster: ROSTER,
  classOptions: [
    { classId: "10A1", className: "10A1" },
    { classId: OWN_CLASS, className: OWN_CLASS },
  ],
  listAbsencesAction: async () => ok(ALL_ROWS),
  flagAbsenceAction: async () =>
    ok({ ...ROW_RECORDED_UNEXCUSED, state: "FLAGGED_UNEXCUSED" }),
};

const meta: Meta<typeof StudentAbsencesScreen> = {
  title: "Features/StudentAbsences/StudentAbsencesScreen",
  component: StudentAbsencesScreen,
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
            {/* Mutation outcomes are announced via sonner (WCAG 4.1.3); the app
                mounts the Toaster in the root layout. */}
            <Toaster />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof StudentAbsencesScreen>;
type ScreenArgs = StudentAbsencesScreenProps;

/**
 * `args` is typed as the discriminated union, so a story that asserts on a
 * role-specific action mock narrows it explicitly. (That the union forces this
 * is the point — see `student-absences-screen.i-vm.ts`.)
 */
/**
 * Scope badge counts to the LIST region: the stats row reuses the same i18n
 * labels ("Không phép" / "Đã gắn cờ"), so a canvas-wide text count would include
 * the StatCard labels and silently drift.
 */
function listRegion(canvasElement: HTMLElement): HTMLElement {
  const el = canvasElement.querySelector<HTMLElement>(
    '[data-slot="absences-list"]',
  );
  if (!el) throw new Error("absences list region not rendered");
  return el;
}

const asTeacher = (args: ScreenArgs) => args as TeacherStudentAbsencesVM;
const asPrincipal = (args: ScreenArgs) => args as PrincipalStudentAbsencesVM;

const EDIT_ROW_BINH = `${m.form.editTitle} — Trần Văn Bình`;
const FLAG_ROW_CAM = `${m.flagAction} — Lê Thị Cẩm`;

// ===========================================================================
// Teacher list — loading / empty / error / success
// ===========================================================================

export const TeacherList_Success: Story = {
  args: teacherBase satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: m.title, level: 1 }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText("Trần Văn Bình").length).toBeGreaterThan(
      0,
    );
    // Teacher affordances present…
    await expect(
      canvas.getByRole("button", { name: m.form.recordTitle }),
    ).toBeInTheDocument();
    await expect(
      canvas.getAllByRole("button", { name: EDIT_ROW_BINH }).length,
    ).toBeGreaterThan(0);
    // …and zero flag affordance for this role (FR-005).
    await expect(
      canvas.queryByRole("button", { name: new RegExp(m.flagAction) }),
    ).toBeNull();
  },
};

/**
 * NFR-007 — the 4-row skeleton, distinct from the empty state.
 *
 * The FIRST paint is always RSC-seeded, so there is no skeleton flash there. The
 * skeleton belongs to a genuinely COLD query key: changing the date-range filter
 * creates a key with no seeded data, and the action here never settles.
 */
export const TeacherList_Loading: Story = {
  args: {
    ...teacherBase,
    listAbsencesAction: () => pending(),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Seeded first paint: rows, no skeleton.
    await expect(
      canvas.queryByText(messages.Common.skeleton.loadingAriaLabel),
    ).toBeNull();

    await userEvent.type(
      canvas.getByLabelText(m.filters.dateFrom),
      "2026-05-01",
    );

    await waitFor(() =>
      expect(
        canvas.getByText(messages.Common.skeleton.loadingAriaLabel),
      ).toBeInTheDocument(),
    );
    // Skeleton is NOT the empty state.
    await expect(canvas.queryByText(m.empty)).toBeNull();
  },
};

export const TeacherList_Empty: Story = {
  args: {
    ...teacherBase,
    initialAbsences: [],
    listAbsencesAction: async () => ok([]),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(m.empty)).toBeInTheDocument();
    // Teacher empty variant HAS the CTA (AC-001.3) — twice: header + empty state.
    await expect(
      canvas.getAllByRole("button", { name: m.form.recordTitle }).length,
    ).toBeGreaterThan(1);
    // Empty is NOT the error state.
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const TeacherList_Error: Story = {
  args: {
    ...teacherBase,
    initialAbsences: [],
    initialErrorKey: "network-error",
    listAbsencesAction: fn(async () => ok(ALL_ROWS)),
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(canvas.getByText(mErr["network-error"])).toBeInTheDocument();
    // Error is distinct from empty — the empty copy is NOT shown.
    await expect(canvas.queryByText(m.empty)).toBeNull();

    // Retry re-issues the SAME filter (AC-001.4).
    await userEvent.click(canvas.getByRole("button", { name: m.retry }));
    await waitFor(() =>
      expect(canvas.getAllByText("Trần Văn Bình").length).toBeGreaterThan(0),
    );
    await expect(args.listAbsencesAction).toHaveBeenCalledWith({
      classId: OWN_CLASS,
      from: undefined,
      to: undefined,
    });
  },
};

// ===========================================================================
// Principal list — loading / empty / error / success
// ===========================================================================

export const PrincipalList_Success: Story = {
  args: principalBase satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(listRegion(canvasElement));
    await expect(canvas.getByText("Lê Thị Cẩm")).toBeInTheDocument();
    // "Gắn cờ" ONLY on RECORDED rows (AC-005.1): 2 of the 4 seeded rows.
    await expect(
      canvas.getAllByRole("button", { name: new RegExp(m.flagAction) }).length,
    ).toBe(2);
    await expect(
      canvas.getByRole("button", { name: FLAG_ROW_CAM }),
    ).toBeInTheDocument();
    // …and NOT on the flagged rows.
    await expect(
      canvas.queryByRole("button", {
        name: `${m.flagAction} — Nguyễn Minh Anh`,
      }),
    ).toBeNull();
  },
};

/**
 * AC-006.5 / security-sweep item 5 — ZERO record/edit affordance anywhere in the
 * principal's rendered view, for any row, at any time. Not disabled: absent.
 * (The compile-time half of this guarantee is the `PrincipalStudentAbsencesVM`
 * arm, which has no record/edit action field at all.)
 */
export const PrincipalZeroRecordEditAffordance: Story = {
  args: principalBase satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: m.form.recordTitle }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: new RegExp(m.form.editTitle) }),
    ).toBeNull();
    // No unflag-shaped control either, in any state (FR-006/AC-005.10).
    await expect(
      canvas.queryByRole("button", { name: /gỡ cờ|bỏ cờ|unflag/i }),
    ).toBeNull();
  },
};

export const PrincipalList_Loading: Story = {
  args: {
    ...principalBase,
    listAbsencesAction: () => pending(),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(m.filters.dateTo), "2026-05-06");
    await waitFor(() =>
      expect(
        canvas.getByText(messages.Common.skeleton.loadingAriaLabel),
      ).toBeInTheDocument(),
    );
    await expect(canvas.queryByText(m.empty)).toBeNull();
  },
};

export const PrincipalList_Empty: Story = {
  args: {
    ...principalBase,
    initialAbsences: [],
    listAbsencesAction: async () => ok([]),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(m.empty)).toBeInTheDocument();
    // Principal empty variant is STATIC — no CTA at all (AC-002.4).
    await expect(
      canvas.queryByRole("button", { name: m.form.recordTitle }),
    ).toBeNull();
  },
};

export const PrincipalList_Error: Story = {
  args: {
    ...principalBase,
    initialAbsences: [],
    initialErrorKey: "forbidden",
    listAbsencesAction: async () => failWith("forbidden"),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // `forbidden` backstop surfaces as a generic error, never a silent redirect
    // (AC-002.5/AC-001.6).
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(canvas.getByText(m.errors.forbidden)).toBeInTheDocument();
    await expect(canvas.queryByText(m.empty)).toBeNull();
  },
};

// ===========================================================================
// Two independent badges (FR-007)
// ===========================================================================

export const TwoBadges_AllCombinations: Story = {
  args: principalBase satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(listRegion(canvasElement));
    // The excused/unexcused badge is on EVERY row (AC-007.1): 4 rows total,
    // 2 excused + 2 unexcused. (`m.excused` also appears as the toggle label in
    // the record dialog, which is not rendered for a principal — so these counts
    // are the row badges only.)
    await expect(canvas.getAllByText(m.excused).length).toBe(2);
    await expect(canvas.getAllByText(m.unexcused).length).toBe(2);
    // The flagged indicator is present ONLY on the 2 flagged rows and is
    // genuinely absent elsewhere (AC-007.2).
    await expect(canvas.getAllByText(m.flagged).length).toBe(2);
    // Orthogonality: one row is excused AND flagged at the same time (AC-007.4).
    const flaggedExcusedRow = canvas
      .getAllByText(m.flagged)[1]
      .closest("div")?.parentElement;
    await expect(flaggedExcusedRow).not.toBeNull();
  },
};

// ===========================================================================
// Record dialog (INT-001)
// ===========================================================================

export const RecordDialog_Success: Story = {
  args: {
    ...teacherBase,
    initialAbsences: [],
    listAbsencesAction: async () => ok([]),
    recordAbsenceAction: fn(async () =>
      ok(absence({ studentMemberId: "stu-1", date: TODAY })),
    ),
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: m.form.recordTitle })[0],
    );
    const dialog = within(await screenDialog());

    // Defaults per AC-003.1: date = today with a max=today bound.
    const dateInput = dialog.getByLabelText(m.form.date) as HTMLInputElement;
    await expect(dateInput.value).toBe(TODAY);
    await expect(dateInput.max).toBe(TODAY);

    await userEvent.click(dialog.getByRole("button", { name: m.form.submit }));

    await waitFor(() =>
      expect(asTeacher(args).recordAbsenceAction).toHaveBeenCalledWith(
        expect.objectContaining({
          classId: OWN_CLASS,
          date: TODAY,
          excused: true,
        }),
      ),
    );
    // Success is ANNOUNCED, not merely inferred from the dialog closing
    // (WCAG 4.1.3 status messages).
    await waitFor(() =>
      expect(
        within(document.body).getByText(m.form.recordSuccess),
      ).toBeInTheDocument(),
    );
  },
};

/** AC-003.3 — future date rejected CLIENT-side, before any request fires. */
export const RecordDialog_FutureDate: Story = {
  args: {
    ...teacherBase,
    initialAbsences: [],
    listAbsencesAction: async () => ok([]),
    recordAbsenceAction: fn(async () => ok(ROW_RECORDED_EXCUSED)),
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: m.form.recordTitle })[0],
    );
    const dialogEl = await screenDialog();
    const dialog = within(dialogEl);

    const dateInput = dialog.getByLabelText(m.form.date) as HTMLInputElement;
    // Bypass the `max` attribute the way a manual entry would.
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2026-05-07");
    await userEvent.click(dialog.getByRole("button", { name: m.form.submit }));

    // Inline, non-colour-only error ON the date field…
    await waitFor(() =>
      expect(
        dialog.getByText(m.errors["invalid-date-future"]),
      ).toBeInTheDocument(),
    );
    await expect(dateInput).toHaveAttribute("aria-invalid", "true");
    await expect(dateInput).toHaveAttribute("aria-describedby");
    // AC-003.3 — the field RETAINS focus so the user can correct it without
    // hunting for it after the submit button took focus.
    await waitFor(() => expect(dateInput).toHaveFocus());
    // …and NO request was sent.
    await expect(asTeacher(args).recordAbsenceAction).not.toHaveBeenCalled();
    // The dialog stays open with values preserved.
    await expect(dialogEl).toBeInTheDocument();
  },
};

/** AC-003.5 — duplicate natural key rejected CLIENT-side against the loaded list. */
export const RecordDialog_DuplicateDate: Story = {
  args: {
    ...teacherBase,
    initialAbsences: [ROW_RECORDED_EXCUSED],
    listAbsencesAction: async () => ok([ROW_RECORDED_EXCUSED]),
    recordAbsenceAction: fn(async () => ok(ROW_RECORDED_EXCUSED)),
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: m.form.recordTitle }),
    );
    const dialogEl = await screenDialog();
    const dialog = within(dialogEl);

    // stu-1 @ 2026-05-05 already exists in the loaded list.
    const dateInput = dialog.getByLabelText(m.form.date);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2026-05-05");
    await userEvent.click(dialog.getByRole("button", { name: m.form.submit }));

    await waitFor(() =>
      expect(dialog.getByRole("alert")).toHaveTextContent(
        m.errors["duplicate-date"],
      ),
    );
    await expect(asTeacher(args).recordAbsenceAction).not.toHaveBeenCalled();
    await expect(dialogEl).toBeInTheDocument();
  },
};

/** AC-003.6 — the identical banner renders when the SERVER rejects the race. */
export const RecordDialog_ServerDuplicateDate: Story = {
  args: {
    ...teacherBase,
    initialAbsences: [],
    listAbsencesAction: async () => ok([]),
    recordAbsenceAction: async () => failWith("duplicate-date"),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: m.form.recordTitle })[0],
    );
    const dialogEl = await screenDialog();
    const dialog = within(dialogEl);
    await userEvent.click(dialog.getByRole("button", { name: m.form.submit }));

    await waitFor(() =>
      expect(dialog.getByRole("alert")).toHaveTextContent(
        m.errors["duplicate-date"],
      ),
    );
    // Dialog stays open (spec §5).
    await expect(dialogEl).toBeInTheDocument();
  },
};

/** AC-006.3 — a server-side class-ownership denial is surfaced inline, never silent. */
export const RecordDialog_ForbiddenSurfacedInline: Story = {
  args: {
    ...teacherBase,
    initialAbsences: [],
    listAbsencesAction: async () => ok([]),
    recordAbsenceAction: async () => failWith("forbidden"),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: m.form.recordTitle })[0],
    );
    const dialogEl = await screenDialog();
    const dialog = within(dialogEl);
    await userEvent.click(dialog.getByRole("button", { name: m.form.submit }));

    await waitFor(() =>
      expect(dialog.getByRole("alert")).toHaveTextContent(m.errors.forbidden),
    );
    await expect(dialogEl).toBeInTheDocument();
  },
};

// ===========================================================================
// Edit dialog (INT-003)
// ===========================================================================

/**
 * AC-004.3 — the natural key renders as STATIC TEXT. This asserts the absence of
 * any editable control for date/class/student, not merely a disabled one.
 */
export const EditDialog_ImmutableFields: Story = {
  args: teacherBase satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: EDIT_ROW_BINH })[0],
    );
    const dialogEl = await screenDialog();
    const dialog = within(dialogEl);

    // The identity values are present as text…
    await expect(dialog.getByText("2026-05-05")).toBeInTheDocument();
    await expect(dialog.getByText(OWN_CLASS)).toBeInTheDocument();
    await expect(dialog.getByText("Trần Văn Bình")).toBeInTheDocument();

    // …and there is NO date input, NO student select, NO combobox at all.
    await expect(dialogEl.querySelectorAll('input[type="date"]').length).toBe(
      0,
    );
    await expect(dialogEl.querySelectorAll("select").length).toBe(0);
    await expect(dialog.queryByRole("combobox")).toBeNull();
    await expect(dialog.queryByLabelText(m.form.date)).toBeNull();

    // Only reason + excused are editable.
    await expect(dialog.getByLabelText(m.form.reason)).toBeInTheDocument();
    await expect(dialog.getByRole("radiogroup")).toBeInTheDocument();
  },
};

/** AC-004.2 — a lone `excused` change PATCHes only `excused`, no reason echo. */
export const EditDialog_Success: Story = {
  args: {
    ...teacherBase,
    editAbsenceAction: fn(async () =>
      ok({ ...ROW_RECORDED_EXCUSED, excused: false }),
    ),
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: EDIT_ROW_BINH })[0],
    );
    const dialog = within(await screenDialog());

    await userEvent.click(dialog.getByRole("radio", { name: m.unexcused }));
    await userEvent.click(dialog.getByRole("button", { name: m.form.save }));

    await waitFor(() =>
      expect(asTeacher(args).editAbsenceAction).toHaveBeenCalledWith({
        classId: OWN_CLASS,
        studentMemberId: "stu-1",
        date: "2026-05-05",
        excused: false,
      }),
    );
    await waitFor(() =>
      expect(
        within(document.body).getByText(m.form.editSuccess),
      ).toBeInTheDocument(),
    );
  },
};

// ===========================================================================
// Flag confirm dialog (INT-004) — the no-optimistic-update proof
// ===========================================================================

/**
 * SECURITY-SWEEP item 4 / AC-005.3 — NO optimistic client-only flip.
 *
 * The flag action never settles here, so the mutation stays pending. The row must
 * keep showing `RECORDED` (2 unflagged rows, 2 flagged badges, its own "Gắn cờ"
 * still offered) for as long as the request is in flight. This can only pass if
 * the mutation has no `onMutate` and never `setQueryData`s the row.
 */
export const FlagConfirmDialog_NoOptimisticUpdate: Story = {
  args: {
    ...principalBase,
    flagAbsenceAction: () => pending(),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const list = within(listRegion(canvasElement));
    const before = list.getAllByText(m.flagged).length;
    await expect(before).toBe(2);

    await userEvent.click(list.getByRole("button", { name: FLAG_ROW_CAM }));
    const dialog = within(await screenAlertDialog());
    const confirm = dialog.getByRole("button", { name: m.flagConfirm.confirm });
    await userEvent.click(confirm);

    // In flight: confirm is busy/disabled…
    await waitFor(() => expect(confirm).toBeDisabled());
    await expect(confirm).toHaveAttribute("aria-busy", "true");

    // …and the row underneath is UNTOUCHED — no extra flagged badge appeared and
    // its "Gắn cờ" action is still offered (no optimistic terminal transition).
    // `hidden: true` because Radix marks the page content aria-hidden while a
    // modal dialog is open — the row is still THERE, which is the whole point.
    await expect(list.getAllByText(m.flagged).length).toBe(before);
    await expect(
      list.getByRole("button", { name: FLAG_ROW_CAM, hidden: true }),
    ).toBeInTheDocument();
  },
};

export const FlagConfirmDialog_Success: Story = {
  args: {
    ...principalBase,
    flagAbsenceAction: fn(async () =>
      ok({ ...ROW_RECORDED_UNEXCUSED, state: "FLAGGED_UNEXCUSED" as const }),
    ),
    // After the invalidate-driven refetch the server reports the new truth.
    listAbsencesAction: async () =>
      [
        ok([
          ROW_RECORDED_EXCUSED,
          { ...ROW_RECORDED_UNEXCUSED, state: "FLAGGED_UNEXCUSED" as const },
          ROW_FLAGGED_UNEXCUSED,
          ROW_FLAGGED_EXCUSED,
        ]),
      ][0],
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const list = () => within(listRegion(canvasElement));
    await userEvent.click(list().getByRole("button", { name: FLAG_ROW_CAM }));
    const dialogEl = await screenAlertDialog();
    // The confirm copy states the action cannot be undone (AC-005.2).
    await expect(dialogEl).toHaveTextContent(m.flagConfirm.description);

    await userEvent.click(
      within(dialogEl).getByRole("button", { name: m.flagConfirm.confirm }),
    );

    await waitFor(() =>
      expect(asPrincipal(args).flagAbsenceAction).toHaveBeenCalledWith({
        classId: OWN_CLASS,
        studentMemberId: "stu-4",
        date: "2026-05-05",
      }),
    );
    // Dialog closes and, once the refetch settles, the row is flagged and no
    // longer offers "Gắn cờ" (AC-005.4).
    await waitFor(() =>
      expect(
        list().queryByRole("button", { name: FLAG_ROW_CAM, hidden: true }),
      ).toBeNull(),
    );
    await waitFor(() => expect(list().getAllByText(m.flagged).length).toBe(3));
  },
};

/** AC-005.6 — a forbidden flag keeps the dialog open with an inline error and no transition. */
export const FlagConfirmDialog_Forbidden: Story = {
  args: {
    ...principalBase,
    flagAbsenceAction: async () => failWith("forbidden"),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const list = within(listRegion(canvasElement));
    const before = list.getAllByText(m.flagged).length;

    await userEvent.click(list.getByRole("button", { name: FLAG_ROW_CAM }));
    const dialogEl = await screenAlertDialog();
    const dialog = within(dialogEl);
    await userEvent.click(
      dialog.getByRole("button", { name: m.flagConfirm.confirm }),
    );

    await waitFor(() =>
      expect(dialog.getByRole("alert")).toHaveTextContent(m.errors.forbidden),
    );
    // Dialog stays open; confirm is force-disabled (re-clicking can only fail).
    await expect(dialogEl).toBeInTheDocument();
    await expect(
      dialog.getByRole("button", { name: m.flagConfirm.confirm }),
    ).toBeDisabled();
    // No transition happened.
    await expect(list.getAllByText(m.flagged).length).toBe(before);
    await expect(
      list.getByRole("button", { name: FLAG_ROW_CAM, hidden: true }),
    ).toBeInTheDocument();
  },
};

/** AC-005.8 — the re-flag backstop surfaces as a generic inline error. */
export const FlagConfirmDialog_InvalidState: Story = {
  args: {
    ...principalBase,
    flagAbsenceAction: async () => failWith("invalid-state"),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const list = within(listRegion(canvasElement));
    await userEvent.click(list.getByRole("button", { name: FLAG_ROW_CAM }));
    const dialog = within(await screenAlertDialog());
    await userEvent.click(
      dialog.getByRole("button", { name: m.flagConfirm.confirm }),
    );
    await waitFor(() =>
      expect(dialog.getByRole("alert")).toHaveTextContent(
        m.errors["invalid-state"],
      ),
    );
  },
};

/**
 * AC-005.7 — a 404 race must NEVER look like a success. The row changed
 * elsewhere: the dialog closes and the list reconciles from the server, but the
 * outcome is ANNOUNCED via a toast (previously indistinguishable from success).
 */
export const FlagConfirmDialog_NotFound: Story = {
  args: {
    ...principalBase,
    flagAbsenceAction: async () => failWith("not-found"),
  } satisfies ScreenArgs,
  play: async ({ canvasElement }) => {
    const list = within(listRegion(canvasElement));
    await userEvent.click(list.getByRole("button", { name: FLAG_ROW_CAM }));
    const dialogEl = await screenAlertDialog();
    await userEvent.click(
      within(dialogEl).getByRole("button", { name: m.flagConfirm.confirm }),
    );

    const body = within(document.body);
    // Dialog closes (server truth wins — reconcile, not an inline retry)…
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    // …and the failure is surfaced, never silent.
    await waitFor(() =>
      expect(body.getByText(m.errors["not-found"])).toBeInTheDocument(),
    );
  },
};

/** AC-005.2 — Cancel closes without firing any request. */
export const FlagConfirmDialog_CancelFiresNothing: Story = {
  args: {
    ...principalBase,
    flagAbsenceAction: fn(async () => ok(ROW_FLAGGED_UNEXCUSED)),
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const list = within(listRegion(canvasElement));
    const trigger = list.getByRole("button", { name: FLAG_ROW_CAM });
    await userEvent.click(trigger);
    const dialogEl = await screenAlertDialog();
    await userEvent.click(
      within(dialogEl).getByRole("button", { name: m.flagConfirm.cancel }),
    );
    await expect(asPrincipal(args).flagAbsenceAction).not.toHaveBeenCalled();
    // AC-005.5 / NFR-003 — focus returns to the invoking row action, not <body>
    // (this dialog is controlled, so Radix has no triggerRef of its own).
    await waitFor(() =>
      expect(within(document.body).queryByRole("alertdialog")).toBeNull(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

// ===========================================================================
// Class filter (principal)
// ===========================================================================

export const PrincipalClassFilterRequeries: Story = {
  args: {
    ...principalBase,
    listAbsencesAction: fn(async () => ok([ROW_RECORDED_EXCUSED])),
  } satisfies ScreenArgs,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox"));
    const option = await within(document.body).findByRole("option", {
      name: "10A1",
    });
    await userEvent.click(option);

    await waitFor(() =>
      expect(args.listAbsencesAction).toHaveBeenCalledWith({
        classId: "10A1",
        from: undefined,
        to: undefined,
      }),
    );
  },
};

// ===========================================================================
// Responsive (NFR-005 / AC-008.1–.4)
// ===========================================================================

export const Responsive320: Story = {
  args: principalBase satisfies ScreenArgs,
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
  args: teacherBase satisfies ScreenArgs,
  play: async ({ canvasElement, page }) => {
    await page?.setViewportSize?.({ width: 375, height: 800 });
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Trần Văn Bình").length).toBeGreaterThan(
      0,
    );
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

export const Responsive768: Story = {
  args: teacherBase satisfies ScreenArgs,
  play: async ({ canvasElement, page }) => {
    await page?.setViewportSize?.({ width: 768, height: 900 });
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Trần Văn Bình").length).toBeGreaterThan(
      0,
    );
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

export const Responsive1280: Story = {
  args: principalBase satisfies ScreenArgs,
  play: async ({ canvasElement, page }) => {
    await page?.setViewportSize?.({ width: 1280, height: 900 });
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Lê Thị Cẩm")).toBeInTheDocument();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth + 1,
    );
  },
};

// --- helpers ---------------------------------------------------------------

/** Radix renders dialogs in a body portal — reach them from `document.body`. */
async function screenDialog(): Promise<HTMLElement> {
  return waitFor(() => within(document.body).getByRole("dialog"));
}

async function screenAlertDialog(): Promise<HTMLElement> {
  return waitFor(() => within(document.body).getByRole("alertdialog"));
}
