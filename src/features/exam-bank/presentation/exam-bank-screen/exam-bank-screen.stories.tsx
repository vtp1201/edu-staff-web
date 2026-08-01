import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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
  editingEnabled: true,
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
 * US-E18.28 (supersedes the US-E18.15 real-mode story): real mode still has no
 * create-with-questions endpoint, so the Create button stays hidden with a
 * translated note — but editing, deleting and publishing an OWNED DRAFT are
 * wired real now, so the owner's draft menu offers all three.
 */
export const TeacherRealMode_CreateDisabledEditDeleteWired: Story = {
  args: { ...baseProps, authoringEnabled: false, editingEnabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /Tạo đề thi mới/i }),
    ).not.toBeInTheDocument();
    // QA (US-E18.15): the Create affordance must be genuinely absent from the
    // DOM (and thus the tab order) — not merely hidden via CSS on a
    // still-focusable element. `queryByRole` above proves absence from the a11y
    // tree; this guards against a `display:none`/`hidden` ghost link.
    await expect(
      canvas.queryByRole("link", { name: /Tạo đề thi mới/i }),
    ).not.toBeInTheDocument();
    // The only node carrying the create wording is the explanatory note, which
    // must name ONLY create as unavailable now (US-E18.28).
    const createCopyNodes = canvas.getAllByText(/tạo đề thi mới/i);
    await expect(createCopyNodes).toHaveLength(1);
    // A11Y-401 fix: static-for-the-mount-lifetime copy is a plain paragraph,
    // not `role="status"` (that role is for post-mount live updates).
    await expect(createCopyNodes[0]).not.toHaveAttribute("role", "status");
    await expect(createCopyNodes[0]).toHaveTextContent(
      /Việc tạo đề thi mới chưa khả dụng/i,
    );
    await expect(createCopyNodes[0]).toHaveTextContent(
      /vẫn có thể chỉnh sửa, xoá bản nháp/i,
    );

    // Owner DRAFT card: open the menu and assert Edit + Publish + Delete are
    // all genuinely present (they were omitted before this US).
    const menuTriggers = canvas.getAllByRole("button", {
      name: /Mở menu thao tác đề thi/i,
    });
    await expect(menuTriggers.length).toBeGreaterThan(0);
    await userEvent.click(menuTriggers[0]);
    const menu = within(document.body);
    await expect(
      await menu.findByRole("menuitem", { name: /Chỉnh sửa/i }),
    ).toBeInTheDocument();
    await expect(
      menu.getByRole("menuitem", { name: /Publish|Xuất bản/i }),
    ).toBeInTheDocument();
    await expect(
      menu.getByRole("menuitem", { name: /Xoá|Xóa/i }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
  },
};

/**
 * QA (US-E18.28): the click → confirm → mutation → list-refresh chain for the
 * NOW-REAL delete action, specifically in real mode (`authoringEnabled: false`,
 * `editingEnabled: true` — the exact real-mode props combination this US wires).
 * Prior coverage only asserted the "Xoá" menu item is present/absent; this is
 * the first test to actually drive `DestructiveConfirmDialog` through to a
 * `deleteAction` call and the resulting card removal for the real-mode path.
 */
export const TeacherRealMode_DeleteConfirmFlow: Story = {
  args: {
    ...baseProps,
    authoringEnabled: false,
    editingEnabled: true,
    exams: EXAMS.filter(
      (e) => e.teacherId === "u-teacher-1" && e.status === "draft",
    ),
    deleteAction: fn(async () => ({ ok: true }) as const),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const beforeCount = canvas.getAllByRole("heading", { level: 3 }).length;
    await expect(beforeCount).toBeGreaterThan(0);

    const menuTrigger = canvas.getAllByRole("button", {
      name: /Mở menu thao tác đề thi/i,
    })[0];
    await userEvent.click(menuTrigger);
    const menu = within(document.body);
    await userEvent.click(
      await menu.findByRole("menuitem", { name: /Xoá|Xóa/i }),
    );

    // Confirm dialog opens (destructive confirm, not an immediate delete).
    const dialog = within(document.body);
    const confirmBtn = await dialog.findByRole("button", {
      name: /^Xoá$|^Xóa$/i,
    });
    await expect(dialog.getByText(/không thể hoàn tác/i)).toBeInTheDocument();

    await userEvent.click(confirmBtn);

    // Dialog closes once the (fake) mutation resolves — wait for it rather
    // than asserting mid-transition, when the background is still aria-hidden.
    await waitFor(() =>
      expect(dialog.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );

    // Mutation actually called, and the card list reflects the removal.
    await expect(args.deleteAction).toHaveBeenCalledTimes(1);
    await expect(canvas.getAllByRole("heading", { level: 3 }).length).toBe(
      beforeCount - 1,
    );
  },
};

/**
 * US-E18.28: in real mode a PUBLISHED paper is immutable server-side
 * (`requireDraft()`), so even its own author gets no edit/delete/publish
 * affordance — the card renders no action menu at all rather than a menu whose
 * every item would fail.
 */
export const TeacherRealMode_PublishedOwnPaperHasNoActions: Story = {
  args: {
    ...baseProps,
    authoringEnabled: false,
    editingEnabled: true,
    // "Đề thi giữa kỳ - Hình học" — owned by u-teacher-1, already published.
    exams: EXAMS.filter(
      (e) => e.teacherId === "u-teacher-1" && e.status === "published",
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/Đã publish/i).length).toBeGreaterThan(0);
    await expect(
      canvas.queryByRole("button", { name: /Mở menu thao tác đề thi/i }),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.28: another teacher's DRAFT is never actionable, even in real mode
 * where edit/delete are wired (the server would 403 — the UI must not offer it).
 */
export const TeacherRealMode_OtherTeacherDraftHasNoActions: Story = {
  args: {
    ...baseProps,
    authoringEnabled: false,
    editingEnabled: true,
    exams: EXAMS.filter((e) => e.teacherId === "u-teacher-2"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /Mở menu thao tác đề thi/i }),
    ).not.toBeInTheDocument();
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
    editingEnabled: false,
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
    editingEnabled: false,
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
