import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { HomeroomEntry } from "@/features/class-log/domain/entities/homeroom-entry.entity";
import type { PeriodLog } from "@/features/period-log/domain/entities/period-log.entity";
import type { PeriodPrep } from "@/features/period-log/domain/entities/period-prep.entity";
import type {
  PeriodRowVm,
  TimetableDayVm,
  TimetableTabActions,
  TimetableTabVm,
} from "./timetable-tab.i-vm";
import { TimetableTabBody } from "./timetable-tab-body";

const ME = "member-me";
const OTHER = "member-other";
const MON = "2026-08-31";
const TUE = "2026-09-01";

function period(over: Partial<PeriodRowVm> = {}): PeriodRowVm {
  return {
    periodNumber: 1,
    subjectName: "Toán",
    teacherName: "Cô Nguyễn Thị Hương",
    teacherMemberId: ME,
    room: "P.302",
    isMine: true,
    isLive: false,
    ...over,
  };
}

function day(over: Partial<TimetableDayVm> = {}): TimetableDayVm {
  return {
    date: MON,
    dayLabel: "Thứ Hai · 31/08",
    isToday: true,
    periods: [
      period({ periodNumber: 1, timeRangeLabel: "07:00–07:45" }),
      period({
        periodNumber: 2,
        subjectName: "Vật lý",
        teacherName: "Thầy Trần Văn Minh",
        teacherMemberId: OTHER,
        isMine: false,
      }),
    ],
    ...over,
  };
}

const SAVED_LOG: PeriodLog = {
  classId: "c-1",
  date: MON,
  periodNumber: 2,
  termId: "t-1",
  dayOfWeek: "MON",
  subjectId: "phys",
  teacherMemberId: OTHER,
  lessonTitle: "Điện từ trường (tiết 2)",
  remark: "Một số em chưa mang SGK.",
  grade: "B",
  absentCount: 2,
  createdAt: "2026-08-31T02:00:00Z",
  updatedAt: "2026-08-31T02:00:00Z",
};

const SAVED_PREP: PeriodPrep = {
  classId: "c-1",
  date: MON,
  periodNumber: 1,
  termId: "t-1",
  dayOfWeek: "MON",
  subjectId: "math",
  teacherMemberId: ME,
  note: "Ôn lại quy tắc chuỗi.",
  lessonPlanId: "lp-1",
  materials: [{ title: "GeoGebra", url: "https://geogebra.org/m/abc" }],
  createdAt: "2026-08-31T01:00:00Z",
  updatedAt: "2026-08-31T01:00:00Z",
};

function entry(over: Partial<HomeroomEntry> = {}): HomeroomEntry {
  return {
    entryId: "e-1",
    classId: "c-1",
    entryDate: MON,
    summary: "Lớp trật tự, đủ sĩ số.",
    status: "DRAFT",
    authorMemberId: ME,
    createdAt: "2026-08-31T09:00:00Z",
    updatedAt: "2026-08-31T09:00:00Z",
    ...over,
  };
}

/** Every action resolves successfully with an echo of what was sent, so the
 *  stories exercise the real await→merge path (not a stub that never resolves). */
const actions: TimetableTabActions = {
  savePeriodLog: async (classId, date, periodNumber, teacher, input) => ({
    ok: true,
    data: {
      ...SAVED_LOG,
      classId,
      date,
      periodNumber,
      teacherMemberId: teacher,
      lessonTitle: input.lessonTitle,
      remark: input.remark ?? "",
      grade: input.grade,
      absentCount: input.absentCount,
    },
  }),
  deletePeriodLog: async () => ({ ok: true, data: null }),
  savePeriodPrep: async (classId, date, periodNumber, teacher, input) => ({
    ok: true,
    data: {
      ...SAVED_PREP,
      classId,
      date,
      periodNumber,
      teacherMemberId: teacher,
      note: input.note ?? "",
      lessonPlanId: input.lessonPlanId ?? null,
      materials: input.materials,
    },
  }),
  deletePeriodPrep: async () => ({ ok: true, data: null }),
  saveDailyEntry: async (classId, entryDate, summary) => ({
    ok: true,
    entry: entry({ classId, entryDate, summary, status: "DRAFT" }),
  }),
  submitDailyEntry: async () => ({
    ok: true,
    entry: entry({ status: "SUBMITTED" }),
  }),
  reviseDailyEntry: async () => ({
    ok: true,
    entry: entry({ status: "DRAFT" }),
  }),
};

/** A slot-forbidden write — the ONE banner a 403 and a 422 both produce. */
const forbiddenActions: TimetableTabActions = {
  ...actions,
  savePeriodLog: async () => ({
    ok: false,
    errorKey: "slot-forbidden-or-missing",
  }),
  savePeriodPrep: async () => ({
    ok: false,
    errorKey: "slot-forbidden-or-missing",
  }),
};

function vm(over: Partial<TimetableTabVm> = {}): TimetableTabVm {
  return {
    classId: "c-1",
    myMemberId: ME,
    isHomeroom: false,
    weekParam: "2026-W36",
    weekRangeLabel: "31/08 – 05/09",
    prevWeekHref: "?tab=timetable&week=2026-W35",
    nextWeekHref: "?tab=timetable&week=2026-W37",
    days: [day()],
    logs: [],
    preps: [],
    homeroomEntries: [],
    lessonPlans: [
      { planId: "lp-1", title: "Quy tắc tính đạo hàm (ôn tập)" },
      { planId: "lp-2", title: "Ứng dụng đạo hàm" },
    ],
    upcoming: {
      date: MON,
      dayLabel: "Thứ Hai · 31/08",
      periodNumber: 1,
      subjectName: "Toán",
      timeRangeLabel: "07:00–07:45",
      room: "P.302",
    },
    shortcuts: {
      teachingPlanHref: "/vi/t/t1/teacher/teaching-plan",
      attendanceHref: "/vi/t/t1/teacher/attendance?classId=c-1",
      classLogHref: "/vi/t/t1/teacher/class-log?classId=c-1",
    },
    ...over,
  };
}

const meta = {
  title: "Teacher/ClassHub/TimetableTab",
  component: TimetableTabBody,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
} satisfies Meta<typeof TimetableTabBody>;

export default meta;
type Story = StoryObj<typeof meta>;

/** GVBM + GVCN on "today": own slots carry both actions, the daily strip is
 *  editable, and another teacher's logged period is readable but not writable. */
export const BothRolesToday: Story = {
  args: {
    vm: vm({
      isHomeroom: true,
      logs: [SAVED_LOG],
      preps: [SAVED_PREP],
      homeroomEntries: [entry()],
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Hôm nay")).toBeVisible();
    // Own slot: labelled, and already-done state is TEXT, not colour alone.
    await expect(canvas.getByText("— tiết của bạn")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /Đã chuẩn bị/ }),
    ).toBeVisible();
    // Someone else's logged period → read-only strip for the GVCN.
    await expect(canvas.getByText("Sổ tiết (GVCN chỉ đọc)")).toBeVisible();
    await expect(canvas.getByText("Điện từ trường (tiết 2)")).toBeVisible();
    // Daily strip: the DRAFT is already saved, so the only action is submit —
    // there is no update endpoint, and the lock is stated in visible text.
    await expect(
      canvas.getByRole("button", { name: "Gửi BGH duyệt" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Sửa" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("đã chuẩn bị")).toBeVisible();
  },
};

/** Subject-only teacher: the daily homeroom strip is ABSENT entirely (core's
 *  homeroom-entries list is GVCN/BGH-only — a read-only box would be
 *  permanently empty), and no peek at another teacher's period log. */
export const SubjectOnly: Story = {
  args: { vm: vm({ logs: [SAVED_LOG] }), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByText("Sổ chủ nhiệm (theo ngày)"),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Viết sổ/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText("Sổ tiết (GVCN chỉ đọc)"),
    ).not.toBeInTheDocument();
    // Their OWN period still carries both write affordances.
    await expect(
      canvas.getAllByRole("button", { name: "Ghi sổ đầu bài tiết" }).length,
    ).toBeGreaterThan(0);
  },
};

/** A homeroom teacher looking at a period that is NOT theirs: read-only, with
 *  no write affordance anywhere on that row. */
export const HomeroomReadOnlyPeriod: Story = {
  args: {
    vm: vm({
      isHomeroom: true,
      logs: [SAVED_LOG],
      days: [
        day({
          periods: [
            period({
              periodNumber: 2,
              subjectName: "Vật lý",
              teacherMemberId: OTHER,
              isMine: false,
            }),
          ],
        }),
      ],
      upcoming: null,
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Sổ tiết (GVCN chỉ đọc)")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Ghi sổ đầu bài tiết/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByText("Không có tiết sắp tới trong tuần này."),
    ).toBeVisible();
  },
};

/** A returned daily entry shows the reason as TEXT and offers "Sửa & gửi lại". */
export const RejectedDaily: Story = {
  args: {
    vm: vm({
      isHomeroom: true,
      homeroomEntries: [
        entry({ status: "REJECTED", reason: "Thiếu nhận xét tiết 3" }),
      ],
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Từ chối")).toBeVisible();
    await expect(
      canvas.getByText("Lý do trả lại: Thiếu nhận xét tiết 3"),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Sửa & gửi lại" }),
    ).toBeVisible();
  },
};

/** Public holiday: the day's NAME is shown and no periods/daily strip render. */
export const Holiday: Story = {
  args: {
    vm: vm({
      days: [
        day({
          holidayLabel: "Nghỉ lễ Quốc khánh 02/09",
          isToday: false,
          periods: [],
        }),
      ],
      upcoming: null,
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nghỉ lễ Quốc khánh 02/09")).toBeVisible();
    await expect(canvas.queryByText("Sổ chủ nhiệm (theo ngày)")).toBeNull();
  },
};

/** A scheduled day with nothing on it says so explicitly (never a blank card). */
export const NoSlots: Story = {
  args: {
    vm: vm({ days: [day({ periods: [] })], upcoming: null }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Không có tiết")).toBeVisible();
  },
};

/** Writing a log: the form validates client-side, then the saved entity flips
 *  BOTH the row's button and the aside chip — the shared-map contract. */
export const SaveLogUpdatesAsideChip: Story = {
  args: { vm: vm(), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("chưa ghi")).toBeVisible();

    await userEvent.click(
      canvas.getAllByRole("button", { name: "Ghi sổ đầu bài tiết" })[0],
    );
    // Empty title is refused before any action call.
    await userEvent.click(canvas.getByRole("button", { name: "Lưu sổ tiết" }));
    await expect(canvas.getByText("Tên bài dạy là bắt buộc")).toBeVisible();

    await userEvent.type(
      canvas.getByLabelText(/Tên bài dạy/),
      "Đạo hàm và vi phân",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Lưu sổ tiết" }));

    await expect(
      await canvas.findByRole("button", { name: /Đã ghi sổ tiết/ }),
    ).toBeVisible();
    await expect(await canvas.findByText("đã ghi")).toBeVisible();
  },
};

/** Every write denial — 403, wrong teacher, weekend, out-of-term — renders the
 *  SAME banner: the client must not rebuild the oracle the BE removed. */
export const WriteForbidden: Story = {
  args: { vm: vm(), actions: forbiddenActions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Ghi sổ đầu bài tiết" })[0],
    );
    await userEvent.type(canvas.getByLabelText(/Tên bài dạy/), "Bài 1");
    await userEvent.click(canvas.getByRole("button", { name: "Lưu sổ tiết" }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(
      "Bạn không được phân công tiết này hoặc ngày ngoài học kỳ",
    );
  },
};

/** Materials cap: the 21st link is blocked by a DISABLED button plus a visible
 *  status message explaining why (never a silently dead control). */
export const MaterialsAtCap: Story = {
  args: {
    vm: vm({
      preps: [
        {
          ...SAVED_PREP,
          materials: Array.from({ length: 20 }, (_, i) => ({
            title: `Tài liệu ${i + 1}`,
            url: `https://example.org/${i + 1}`,
          })),
        },
      ],
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Đã chuẩn bị/ })[0],
    );
    const add = await canvas.findByRole("button", { name: "Thêm tài liệu" });
    await expect(add).toBeDisabled();
    await expect(
      canvas.getByText("Đã đạt giới hạn 20 tài liệu."),
    ).toBeVisible();
  },
};

/** Mobile 375: one column, forms and material rows wrap instead of overflowing. */
export const Mobile375: Story = {
  args: {
    vm: vm({ isHomeroom: true, logs: [SAVED_LOG], preps: [SAVED_PREP] }),
    actions,
  },
  globals: { viewport: { value: "mobile1", isRotated: false } },
};

/** Multi-day week with a live period — the badge carries a word, not just a dot. */
export const LivePeriod: Story = {
  args: {
    vm: vm({
      days: [
        day({
          periods: [
            period({
              periodNumber: 3,
              timeRangeLabel: "08:45–09:30",
              isLive: true,
            }),
          ],
        }),
        day({
          date: TUE,
          dayLabel: "Thứ Ba · 01/09",
          isToday: false,
          periods: [period({ periodNumber: 1 })],
        }),
      ],
    }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Đang diễn ra")).toBeVisible();
    await expect(canvas.getByText("08:45–09:30")).toBeVisible();
  },
};

/**
 * A DRAFT that is ALREADY SAVED: the only path forward is "Gửi BGH duyệt",
 * which submits BY ID. Re-opening the editor would route back through create →
 * 409 `HOMEROOM_ENTRY_ALREADY_EXISTS` (one entry per class per date, no update
 * endpoint), which is exactly the dead end this story pins shut.
 */
export const SavedDraftSubmits: Story = {
  args: {
    vm: vm({ isHomeroom: true, homeroomEntries: [entry({ status: "DRAFT" })] }),
    actions: {
      ...actions,
      // Fails loudly if the UI ever routes an existing entry through create.
      saveDailyEntry: async () => {
        throw new Error("create must NOT be called for an existing entry");
      },
      submitDailyEntry: async (_classId, entryId) => ({
        ok: true,
        entry: entry({ entryId, status: "SUBMITTED" }),
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nháp")).toBeVisible();
    await expect(
      canvas.getByText(
        "Nháp đã lưu — hệ thống chưa hỗ trợ sửa nội dung, bạn chỉ có thể gửi BGH duyệt.",
      ),
    ).toBeVisible();

    await userEvent.click(
      canvas.getByRole("button", { name: "Gửi BGH duyệt" }),
    );

    await expect(await canvas.findByText("Chờ duyệt")).toBeVisible();
    // Submitted work exposes no further action to its author.
    await expect(
      canvas.queryByRole("button", { name: "Gửi BGH duyệt" }),
    ).not.toBeInTheDocument();
  },
};

/**
 * REJECTED → "Sửa & gửi lại" calls the REVISE action (never create), which
 * returns the entry to DRAFT — from where the submit button reappears.
 */
export const RejectedRevisesThenSubmits: Story = {
  args: {
    vm: vm({
      isHomeroom: true,
      homeroomEntries: [
        entry({ status: "REJECTED", reason: "Thiếu nhận xét tiết 3" }),
      ],
    }),
    actions: {
      ...actions,
      saveDailyEntry: async () => {
        throw new Error("create must NOT be called for a rejected entry");
      },
      reviseDailyEntry: async (_classId, entryId) => ({
        ok: true,
        entry: entry({ entryId, status: "DRAFT" }),
      }),
      submitDailyEntry: async (_classId, entryId) => ({
        ok: true,
        entry: entry({ entryId, status: "SUBMITTED" }),
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Sửa & gửi lại" }),
    );

    // Back to DRAFT: submit-only, no editor.
    await expect(
      await canvas.findByRole("button", { name: "Gửi BGH duyệt" }),
    ).toBeVisible();

    await userEvent.click(
      canvas.getByRole("button", { name: "Gửi BGH duyệt" }),
    );
    await expect(await canvas.findByText("Chờ duyệt")).toBeVisible();
  },
};

/** No entry yet: the editor IS available, and "Gửi BGH duyệt" does create-then-submit. */
export const NewEntryCreatesThenSubmits: Story = {
  args: { vm: vm({ isHomeroom: true }), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Viết sổ/ }));
    await userEvent.type(
      canvas.getByLabelText(/Nhận xét chung về lớp trong ngày/),
      "Lớp trật tự, đủ sĩ số.",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Gửi BGH duyệt" }),
    );

    await expect(await canvas.findByText("Chờ duyệt")).toBeVisible();
  },
};

/**
 * QA gap-fill (US-E24.9): the AC asks for client-side ≤200/≤2000/0–200 bounds
 * on the period-log form. `MaterialsAtCap` already proves the materials-count
 * cap end-to-end, but nothing exercised the sổ-tiết field bounds themselves —
 * this drives the real `PeriodLogForm` (via the shared zod schema, no
 * production code touched) past `remark`'s 2000-char cap and `absentCount`'s
 * 0–200 range and asserts the exact i18n validation copy renders.
 */
export const PeriodLogValidationBoundaries: Story = {
  args: { vm: vm(), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Ghi sổ đầu bài tiết" })[0],
    );
    await userEvent.type(canvas.getByLabelText(/Tên bài dạy/), "Bài 1");

    // absentCount out of range (HTML `max` does not block typed input) →
    // the zod bound must catch it before any action call.
    const absentInput = canvas.getByLabelText("Số HS vắng");
    await userEvent.clear(absentInput);
    await userEvent.type(absentInput, "500");

    // remark past its 2000-char cap: the <textarea> ALSO carries a native
    // `maxLength`, so typing past it is a no-op — assert the input is
    // capped (defense-in-depth #1) rather than fighting the DOM to prove
    // defense-in-depth #2 (the zod `.max()`) in a browser test.
    // `userEvent.type` simulates one keystroke per char — 2010 keystrokes
    // makes this test flake against the interaction-test timeout under load.
    // `paste` sets the value in one native input event; the native
    // `maxLength` cap fires identically either way, so the assertion below
    // still proves defense-in-depth #1.
    const remarkInput = canvas.getByLabelText(/Nhận xét/);
    await userEvent.click(remarkInput);
    await userEvent.paste("x".repeat(2010));
    await expect((remarkInput as HTMLTextAreaElement).value).toHaveLength(2000);

    await userEvent.click(canvas.getByRole("button", { name: "Lưu sổ tiết" }));

    await expect(
      await canvas.findByText("Số HS vắng phải trong khoảng 0–200"),
    ).toBeVisible();
    // The invalid submit must never reach the action.
    await expect(
      canvas.queryByRole("button", { name: /Đã ghi sổ tiết/ }),
    ).not.toBeInTheDocument();
  },
};

/**
 * QA gap-fill (US-E24.9): `MaterialsAtCap` proves the 20-link cap, but no
 * story drove an actually-invalid (non-http(s)) material URL through the
 * real `PeriodPrepForm` — this closes that gap against the shared
 * `periodPrepSchema` (also unit-tested directly, see
 * `period-prep-form.schema.test.ts`).
 */
export const PeriodPrepInvalidUrlBlocked: Story = {
  args: { vm: vm(), actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Chuẩn bị tiết" })[0],
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Thêm tài liệu" }),
    );
    await userEvent.type(
      canvas.getByLabelText("Tiêu đề tài liệu"),
      "Ghi chú nội bộ",
    );
    await userEvent.type(
      canvas.getByLabelText("Đường dẫn tài liệu"),
      "ftp://not-http.example.com/x",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Lưu chuẩn bị" }));

    await expect(
      await canvas.findByText(
        "Đường dẫn phải bắt đầu bằng http:// hoặc https://",
      ),
    ).toBeVisible();
  },
};

/**
 * A period-log/prep read that FAILED must not masquerade as "chưa ghi": the
 * next save is a full-replace PUT, so the week carries a non-blocking warning.
 */
export const SecondaryReadFailed: Story = {
  args: {
    vm: vm({ secondaryErrorKey: "network-error" }),
    actions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const notice = await canvas.findByRole("status");
    await expect(notice).toHaveTextContent("Lỗi kết nối mạng");
    // Non-blocking: the week itself still renders.
    await expect(canvas.getByText("Toán")).toBeVisible();
  },
};
