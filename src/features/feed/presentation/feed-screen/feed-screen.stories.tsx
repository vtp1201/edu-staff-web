import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  FeedPage,
  FeedPostEntity,
} from "../../domain/entities/feed-post.entity";
import type { ReactionState } from "../../domain/entities/reaction.entity";
import { emptyReactionCounts } from "../../domain/entities/reaction.entity";
import { FeedScreen } from "./feed-screen";
import type { FeedScreenVM } from "./feed-screen.i-vm";

function post(p: Partial<FeedPostEntity> & { postId: string }): FeedPostEntity {
  return {
    authorId: "u-principal",
    authorName: "Trần Minh Quân",
    authorRole: "principal",
    authorAvatarInitials: "TQ",
    scope: "school",
    content: "Nội dung bài viết mẫu cho bảng tin trường.",
    attachments: [],
    createdAt: "2026-07-11T09:15:00.000Z",
    pinned: false,
    reactions: { counts: emptyReactionCounts(), myReaction: null },
    commentCount: 0,
    ...p,
  };
}

const SCHOOL_POSTS: FeedPostEntity[] = [
  post({
    postId: "p-plain",
    authorId: "u-teacher",
    authorName: "Nguyễn Thị Hương",
    authorRole: "teacher",
    authorAvatarInitials: "NH",
    createdAt: "2026-07-11T08:00:00.000Z",
    content: "CLB Toán học tuyển thành viên mới.",
    reactions: {
      counts: { ...emptyReactionCounts(), like: 3 },
      myReaction: null,
    },
    commentCount: 2,
  }),
  post({
    postId: "p-pinned",
    pinned: true,
    createdAt: "2026-07-01T09:15:00.000Z",
    content: "Kỷ niệm 30 năm thành lập trường 🎓",
    reactions: {
      counts: { ...emptyReactionCounts(), celebrate: 65 },
      myReaction: "celebrate",
    },
  }),
];

const page = (posts: FeedPostEntity[], hasMore = false): FeedPage => ({
  posts,
  nextCursor: hasMore ? "next" : null,
  hasMore,
});

const resolved =
  <T,>(data: T) =>
  async () => ({ ok: true as const, data });

function baseVM(over: Partial<FeedScreenVM> = {}): FeedScreenVM {
  return {
    role: "principal",
    meId: "me",
    meDisplayName: "Bạn",
    meAvatarInitials: "B",
    myClasses: [
      { classId: "11A2", className: "11A2" },
      { classId: "12C3", className: "12C3" },
    ],
    teacherClassIds: [],
    initialSchoolPage: page(SCHOOL_POSTS),
    initialErrorKey: null,
    fetchFeedPageAction: resolved(page(SCHOOL_POSTS)),
    createPostAction: resolved(post({ postId: "p-new", content: "x" })),
    reactToPostAction: fn(
      async () =>
        ({
          ok: true,
          data: { counts: emptyReactionCounts(), myReaction: null },
        }) as {
          ok: true;
          data: ReactionState;
        },
    ),
    listCommentsAction: resolved({
      comments: [],
      nextCursor: null,
      hasMore: false,
    }),
    addCommentAction: resolved({
      commentId: "c-new",
      postId: "p-plain",
      authorId: "me",
      authorName: "Bạn",
      authorRole: "teacher",
      authorAvatarInitials: "B",
      content: "hi",
      createdAt: "2026-07-11T11:00:00.000Z",
    }),
    togglePinMockAction: fn(async (i) => ({ ok: true as const, data: i })),
    reportContentAction: fn(async () => ({ ok: true as const })),
    removeContentAction: fn(async () => ({ ok: true as const })),
    ...over,
  };
}

const meta: Meta<typeof FeedScreen> = {
  title: "Features/Feed/FeedScreen",
  component: FeedScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, retryDelay: 0 } },
      });
      // Reset any Radix portal-lock (`pointer-events:none` on body) left by a
      // previously-run story in the shared browser page.
      document.body.style.pointerEvents = "";
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-background">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof FeedScreen>;

/** AC-1901.1 — 3 skeleton rows while the first fetch is pending. */
export const Loading: Story = {
  args: baseVM({
    initialSchoolPage: null,
    fetchFeedPageAction: () => new Promise(() => {}),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByTestId("feed-skeleton")).toBeInTheDocument(),
    );
  },
};

/** AC-1901.5/1907.1/1907.3 — populated, pinned-first, icon+text marker. */
export const Populated: Story = {
  args: baseVM(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    // Pinned post floats first despite being older.
    await expect(within(articles[0]).getByText(/30 năm/)).toBeInTheDocument();
    await expect(within(articles[0]).getByText("Đã ghim")).toBeInTheDocument();
  },
};

/** AC-1901.2 — empty + CTA for a role that canPost. */
export const EmptyWithCta: Story = {
  args: baseVM({
    role: "teacher",
    initialSchoolPage: page([]),
    fetchFeedPageAction: resolved(page([])),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Chưa có bài viết nào"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Đăng bài viết đầu tiên" }),
    ).toBeInTheDocument();
  },
};

/** AC-1901.2 — empty WITHOUT CTA for parent (cannot post). */
export const EmptyNoCta: Story = {
  args: baseVM({
    role: "parent",
    initialSchoolPage: page([]),
    fetchFeedPageAction: resolved(page([])),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Chưa có bài viết nào"),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Đăng bài viết đầu tiên" }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1901.3 — retryable error shows retry. */
export const ErrorRetryable: Story = {
  args: baseVM({
    initialSchoolPage: null,
    fetchFeedPageAction: async () => ({
      ok: false,
      errorKey: "fetch-failed",
      retryable: true,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};

/** AC-1901.4 — forbidden error, NO retry, distinct copy. */
export const ErrorForbidden: Story = {
  args: baseVM({
    initialSchoolPage: null,
    fetchFeedPageAction: async () => ({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(
      within(alert).getByText(/không có quyền/i),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Thử lại" }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1902.1 — parent sees NO composer in school scope. */
export const ComposerHiddenParent: Story = {
  args: baseVM({ role: "parent" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    await expect(
      canvas.queryByLabelText("Nội dung bài viết"),
    ).not.toBeInTheDocument();
  },
};

/** AC-1902.1 — student sees NO composer in school scope; AC-1902.2 — sees it in class. */
export const StudentComposerScopeMatrix: Story = {
  args: baseVM({
    role: "student",
    myClasses: [{ classId: "11A2", className: "11A2" }],
    teacherClassIds: [],
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    // School scope: no composer.
    await expect(
      canvas.queryByLabelText("Nội dung bài viết"),
    ).not.toBeInTheDocument();
    // Switch to the class tab → composer appears.
    await userEvent.click(canvas.getByRole("tab", { name: /Lớp 11A2/ }));
    await waitFor(() =>
      expect(canvas.getByLabelText("Nội dung bài viết")).toBeInTheDocument(),
    );
  },
};

/**
 * AC-1901.6 — scope switch triggers an independent load cycle.
 * A11Y-002 — a MULTI-CLASS viewer's first click on the class tab opens the
 * listbox chooser; it must NOT silently jump to a specific class. Only after
 * picking an option does the class feed load.
 */
export const ScopeSwitch: Story = {
  args: baseVM({
    fetchFeedPageAction: fn(async ({ selection }) => ({
      ok: true as const,
      data:
        selection.scope === "class"
          ? page([
              post({
                postId: "p-class",
                scope: "class",
                classId: "11A2",
                content: "Bài viết của lớp 11A2",
              }),
            ])
          : page(SCHOOL_POSTS),
    })),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    // First click on the class tab opens the listbox (portal) — NO silent switch.
    await userEvent.click(canvas.getByRole("tab", { name: /Lớp 11A2/ }));
    const body = within(document.body);
    await waitFor(() => expect(body.getByRole("listbox")).toBeInTheDocument());
    // The class feed has NOT loaded yet — no class was silently selected.
    await expect(
      canvas.queryByText("Bài viết của lớp 11A2"),
    ).not.toBeInTheDocument();
    // Picking an option performs the actual scope switch.
    await userEvent.click(body.getByRole("option", { name: /Lớp 11A2/ }));
    await waitFor(() =>
      expect(canvas.getByText("Bài viết của lớp 11A2")).toBeInTheDocument(),
    );
    // Previous school-only post is gone.
    await expect(canvas.queryByText(/30 năm/)).not.toBeInTheDocument();
  },
};

/** AC-1903.1 — clicking a reaction sets aria-pressed + increments. */
export const ReactionAdd: Story = {
  args: (() => {
    const vm = baseVM({
      initialSchoolPage: page([
        post({
          postId: "p-plain",
          authorId: "u-teacher",
          authorName: "Nguyễn Thị Hương",
          authorRole: "teacher",
          content: "Bài viết để thả cảm xúc",
          reactions: {
            counts: { ...emptyReactionCounts(), like: 3 },
            myReaction: null,
          },
        }),
      ]),
      fetchFeedPageAction: resolved(
        page([
          post({
            postId: "p-plain",
            authorId: "u-teacher",
            authorName: "Nguyễn Thị Hương",
            authorRole: "teacher",
            content: "Bài viết để thả cảm xúc",
            reactions: {
              counts: { ...emptyReactionCounts(), like: 3 },
              myReaction: null,
            },
          }),
        ]),
      ),
      reactToPostAction: async () => ({
        ok: true as const,
        data: {
          counts: { ...emptyReactionCounts(), like: 4 },
          myReaction: "like" as const,
        },
      }),
    });
    return vm;
  })(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chip = await canvas.findByRole("button", { name: /Thích, 3 lượt/ });
    await userEvent.click(chip);
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Thích, 4 lượt/ }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
  },
};

/** AC-1903.4 — reaction failure rolls back silently (no toast). */
export const ReactionRollback: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-plain",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết để thả cảm xúc",
        reactions: {
          counts: { ...emptyReactionCounts(), like: 3 },
          myReaction: null,
        },
      }),
    ]),
    reactToPostAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chip = await canvas.findByRole("button", { name: /Thích, 3 lượt/ });
    await userEvent.click(chip);
    // Reverts to the pre-click count; no error alert / toast.
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Thích, 3 lượt/ }),
      ).toHaveAttribute("aria-pressed", "false"),
    );
  },
};

/** AC-1905.4 — student on others' post → menu shows ONLY report. */
export const MenuStudentReportOnly: Story = {
  args: baseVM({
    role: "student",
    myClasses: [{ classId: "11A2", className: "11A2" }],
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    const trigger = within(articles[0]).getByRole("button", {
      name: /Tuỳ chọn cho bài viết/,
    });
    await userEvent.click(trigger);
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByRole("menuitem", { name: "Báo cáo" })).toBeVisible(),
    );
    await expect(
      body.queryByRole("menuitem", { name: /Ghim/ }),
    ).not.toBeInTheDocument();
    await expect(
      body.queryByRole("menuitem", { name: "Gỡ nội dung" }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1905.3 — principal → pin + report + remove all present. */
export const MenuPrincipalAllItems: Story = {
  args: baseVM({ role: "principal" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await userEvent.click(
      within(articles[0]).getByRole("button", {
        name: /Tuỳ chọn cho bài viết/,
      }),
    );
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByRole("menuitem", { name: "Báo cáo" })).toBeVisible(),
    );
    await expect(body.getByRole("menuitem", { name: /ghim/i })).toBeVisible();
    await expect(
      body.getByRole("menuitem", { name: "Gỡ nội dung" }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
  },
};

/** AC-1905.5 — student's own post → the "…" trigger itself is absent. */
export const MenuOwnPostHidden: Story = {
  args: baseVM({
    role: "student",
    meId: "u-self",
    myClasses: [{ classId: "11A2", className: "11A2" }],
    initialSchoolPage: page([
      post({
        postId: "p-own",
        authorId: "u-self",
        authorName: "Bạn",
        authorRole: "student",
        content: "Bài viết của chính mình",
      }),
    ]),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await expect(
      within(articles[0]).queryByRole("button", {
        name: /Tuỳ chọn cho bài viết/,
      }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1906.3 — report entry point opens the SHARED ReportContentDialog. */
export const ReportOpensSharedDialog: Story = {
  args: baseVM({
    role: "student",
    myClasses: [{ classId: "11A2", className: "11A2" }],
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await userEvent.click(
      within(articles[0]).getByRole("button", {
        name: /Tuỳ chọn cho bài viết/,
      }),
    );
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Báo cáo" }),
    );
    await waitFor(() => expect(body.getByRole("dialog")).toBeInTheDocument());
    // The shared dialog frames the reported author.
    await expect(
      within(body.getByRole("dialog")).getByText("Báo cáo nội dung"),
    ).toBeInTheDocument();
  },
};

/** AC-1910.1/.2 — remove entry point opens the SHARED confirm dialog. */
export const RemoveOpensConfirm: Story = {
  args: baseVM({ role: "principal" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await userEvent.click(
      within(articles[0]).getByRole("button", {
        name: /Tuỳ chọn cho bài viết/,
      }),
    );
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Gỡ nội dung" }),
    );
    await waitFor(() =>
      expect(body.getByRole("alertdialog")).toBeInTheDocument(),
    );
  },
};

/** AC-1909.1/.2/1907.4 — pin toggle fires NO fetch, re-sorts, uses the mock action. */
export const PinTogglesNoNetwork: Story = {
  args: baseVM({
    role: "principal",
    // Spy that stays uncalled: the school scope is RSC-seeded, so no fetch runs.
    fetchFeedPageAction: fn(async () => ({
      ok: true as const,
      data: page(SCHOOL_POSTS),
    })),
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    // p-plain (non-pinned) is currently first (pinned p-pinned is older but pinned → first).
    // Open the non-pinned teacher post's menu and pin it.
    const teacherArticle = articles.find((a) =>
      within(a).queryByText("CLB Toán học tuyển thành viên mới."),
    );
    if (!teacherArticle) throw new Error("teacher article not found");
    await userEvent.click(
      within(teacherArticle).getByRole("button", {
        name: /Tuỳ chọn cho bài viết/,
      }),
    );
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Ghim bài viết" }),
    );
    await waitFor(() =>
      expect(args.togglePinMockAction).toHaveBeenCalledWith({
        postId: "p-plain",
        pinned: true,
      }),
    );
    // No feed refetch was triggered by the pin toggle.
    expect(args.fetchFeedPageAction).not.toHaveBeenCalled();
  },
};

/** AC-1908.2/.3 — end-of-feed marker when hasMore=false, no load-more button. */
export const EndOfFeed: Story = {
  args: baseVM(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    await expect(
      canvas.getByText("Bạn đã xem hết bảng tin"),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Tải thêm bài viết" }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1908.1 — load-more appends the next page. */
export const Pagination: Story = {
  args: baseVM({
    initialSchoolPage: page(SCHOOL_POSTS, true),
    fetchFeedPageAction: fn(async ({ cursor }) => ({
      ok: true as const,
      data: cursor
        ? page([post({ postId: "p-next", content: "Bài viết trang 2" })])
        : page(SCHOOL_POSTS, true),
    })),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    const loadMore = canvas.getByRole("button", { name: "Tải thêm bài viết" });
    await userEvent.click(loadMore);
    await waitFor(() =>
      expect(canvas.getByText("Bài viết trang 2")).toBeInTheDocument(),
    );
  },
};

/** AC-1904.1/.2 — expand thread shows the inline empty text (NOT EmptyState). */
export const CommentsEmpty: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-plain",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết chưa có bình luận",
        commentCount: 0,
      }),
    ]),
    listCommentsAction: resolved({
      comments: [],
      nextCursor: null,
      hasMore: false,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await userEvent.click(
      within(articles[0]).getByRole("button", { name: /Xem bình luận/ }),
    );
    await waitFor(() =>
      expect(canvas.getByText("Chưa có bình luận")).toBeInTheDocument(),
    );
  },
};
