import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ExamBankSummary } from "../../domain/entities/exam-bank-summary.entity";
import {
  MOCK_EXAM_BANK,
  MOCK_SUBJECTS,
  MOCK_TEACHERS,
} from "../../infrastructure/repositories/mocks/fixtures";
import { ExamBankScreen } from "./exam-bank-screen";
import type { ExamBankScreenVM } from "./exam-bank-screen.i-vm";

const EXAMS: ExamBankSummary[] = MOCK_EXAM_BANK.map(
  ({ questions, ...summary }) => ({
    ...summary,
    totalQuestions: questions.length,
  }),
);

const publishAction: ExamBankScreenVM["publishAction"] = async () => ({
  ok: true,
});
const deleteAction: ExamBankScreenVM["deleteAction"] = async () => ({
  ok: true,
});

const baseProps: ExamBankScreenVM = {
  exams: EXAMS,
  subjects: MOCK_SUBJECTS,
  teachers: MOCK_TEACHERS,
  viewerRole: "teacher",
  currentTeacherId: "u-teacher-1",
  createPath: "/teacher/exam-bank/create",
  editPathPrefix: "/teacher/exam-bank",
  authoringEnabled: true,
  publishAction,
  deleteAction,
};

const meta: Meta<typeof ExamBankScreen> = {
  title: "Features/ExamBank/ExamBankScreen",
  component: ExamBankScreen,
  // The screen owns `useRouter` (create/empty-state navigation) → mount the App
  // Router so the interaction runner can render it (US-E18.15).
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-[color:var(--edu-bg)] p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamBankScreen>;

/** AC-1: skeleton while loading. */
export const ExamList_Loading: Story = {
  args: { ...baseProps, isLoading: true } as ExamBankScreenVM & {
    isLoading: boolean;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByLabelText(/Đang tải danh sách đề thi/i),
    ).toBeInTheDocument();
  },
};

/** AC-2: 3 draft + 2 published cards rendered. */
export const ExamList_DraftAndPublished: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Kho đề thi/i }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText(/Nháp/i).length).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/Đã publish/i).length).toBeGreaterThan(0);
  },
};

/** AC-11: empty state with CTA. */
export const ExamList_EmptyState: Story = {
  args: { ...baseProps, exams: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Chưa có đề thi nào/i)).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /Tạo đề thi đầu tiên/i }),
    ).toBeInTheDocument();
  },
};

/**
 * US-E18.15/ADR 0056: real mode — paper authoring (create/edit/delete) has no
 * wire endpoint, so the Create button is hidden and a translated note explains
 * why. Publish stays available (it IS wired real) — the owner's draft still
 * shows its action menu.
 */
export const TeacherRealMode_AuthoringDisabled: Story = {
  args: { ...baseProps, authoringEnabled: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /Tạo đề thi mới/i }),
    ).not.toBeInTheDocument();
    // QA (US-E18.15): the Create button must be genuinely absent from the DOM
    // (and thus the tab order) — not merely hidden via CSS on a still-focusable
    // element. `queryByRole` above already proves absence from the a11y tree;
    // this asserts no residual `<button>`/`<a>` node carries the create copy at
    // all (guards against a `display:none`/`hidden` ghost element regression).
    await expect(canvas.queryByText(/Tạo đề thi mới/i)).not.toBeInTheDocument();
    await expect(
      canvas.getByText(/chưa khả dụng trong môi trường này/i),
    ).toBeInTheDocument();
    // Publish still available → owner drafts keep their action menu.
    const menuTriggers = canvas.getAllByRole("button", {
      name: /Mở menu thao tác đề thi/i,
    });
    await expect(menuTriggers.length).toBeGreaterThan(0);

    // QA (US-E18.15): open the first owner-draft card's menu and assert it
    // genuinely OMITS Edit/Delete (not renders them disabled) while Publish
    // remains present and clickable — the prior story only checked the
    // trigger existed, never opened the menu to inspect its contents.
    await userEvent.click(menuTriggers[0]);
    const menu = within(document.body);
    await expect(
      await menu.findByRole("menuitem", { name: /Publish|Xuất bản/i }),
    ).toBeInTheDocument();
    await expect(
      menu.queryByRole("menuitem", { name: /Chỉnh sửa/i }),
    ).not.toBeInTheDocument();
    await expect(
      menu.queryByRole("menuitem", { name: /Xoá|Xóa/i }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
  },
};

/**
 * QA (US-E18.15): 3-value lifecycle (DRAFT/PUBLISHED/CONFIDENTIAL) must never
 * be color-only — every tone carries a distinct text label. CONFIDENTIAL only
 * ever appears from the real wire (admin-visible), so this story injects one
 * into the fixture set rather than mutating the shared mock fixtures (which
 * other stories/tests rely on staying draft/published-only).
 */
export const AdminView_ThreeValueStatus: Story = {
  args: {
    ...baseProps,
    viewerRole: "admin",
    createPath: "",
    authoringEnabled: false,
    exams: [
      ...EXAMS,
      {
        ...EXAMS[0],
        id: "e-confidential-1",
        title: "Đề thi bảo mật - Học kỳ cuối",
        status: "confidential",
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // All three status labels rendered as text (never color-only).
    await expect(canvas.getAllByText(/Nháp/i).length).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/Đã publish/i).length).toBeGreaterThan(0);
    // "Bảo mật" also appears as a (closed, but DOM-present) status-filter
    // option — scope to the actual card badge (`span[data-slot="badge"]`).
    const confidentialCandidates = canvas.getAllByText(/Bảo mật/i);
    const confidentialBadge = confidentialCandidates
      .map((el) => el.closest('[data-slot="badge"]'))
      .find((el): el is Element => el !== null);
    await expect(confidentialBadge).not.toBeUndefined();
    // Distinguishable tone: confidential badge is NOT the same visual tone as
    // draft (warning/amber) or published (success/green) — muted per the tone
    // map. Assert it does not carry the warning/success tone classes.
    expect(confidentialBadge?.className).not.toMatch(/warning/);
    expect(confidentialBadge?.className).not.toMatch(/success/);
  },
};

/** AC-9: admin read-only — no create button, no card action menus. */
export const AdminReadOnly_NotApplicable: Story = {
  args: {
    ...baseProps,
    viewerRole: "admin",
    createPath: "",
    authoringEnabled: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /Tạo đề thi mới/i }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Mở menu thao tác đề thi/i }),
    ).not.toBeInTheDocument();
  },
};
