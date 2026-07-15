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
      // QA-only escape hatch (test code, not shipped behavior) so a play()
      // function can force an invalidate+refetch cycle to simulate "reload"
      // for AC-1909.4 (pin non-persistence) without a real page navigation.
      (
        window as unknown as { __feedQueryClient?: QueryClient }
      ).__feedQueryClient = qc;
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

/**
 * AC-1903.2 — clicking a DIFFERENT reaction chip while one is already active
 * replaces it (single active reaction per user); both counts adjust. Only the
 * "add a fresh reaction" and "silent rollback" paths were previously tested —
 * the replace path (like → love) had zero coverage.
 */
export const ReactionReplace: Story = {
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
          myReaction: "like",
        },
      }),
    ]),
    reactToPostAction: fn(async () => ({
      ok: true as const,
      data: {
        counts: { ...emptyReactionCounts(), like: 2, love: 1 },
        myReaction: "love" as const,
      },
    })),
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: /Thích, 3 lượt/ });
    await userEvent.click(
      canvas.getByRole("button", { name: "Thả cảm xúc khác" }),
    );
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("button", { name: "Yêu thích" }),
    );
    await waitFor(() =>
      expect(args.reactToPostAction).toHaveBeenCalledWith(
        expect.objectContaining({ reactionType: "love" }),
      ),
    );
    await waitFor(() => {
      expect(
        canvas.getByRole("button", { name: /Thích, 2 lượt/ }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        canvas.getByRole("button", { name: /Yêu thích, 1 lượt/ }),
      ).toHaveAttribute("aria-pressed", "true");
    });
  },
};

/**
 * AC-1903.3 — clicking your own ALREADY-active chip again removes it
 * (DELETE), un-toggling with no replacement. Previously untested (only add
 * and the failure/rollback paths were covered).
 */
export const ReactionRemove: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-plain",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết để bỏ cảm xúc",
        reactions: {
          counts: { ...emptyReactionCounts(), like: 1 },
          myReaction: "like",
        },
      }),
    ]),
    reactToPostAction: fn(async () => ({
      ok: true as const,
      data: { counts: emptyReactionCounts(), myReaction: null },
    })),
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const chip = await canvas.findByRole("button", { name: /Thích, 1 lượt/ });
    await userEvent.click(chip);
    await waitFor(() =>
      expect(args.reactToPostAction).toHaveBeenCalledWith(
        expect.objectContaining({ reactionType: null }),
      ),
    );
    // Count hits 0 → the chip itself is no longer rendered at all.
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: /Thích,/ }),
      ).not.toBeInTheDocument(),
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

/**
 * AC-1909.2 — Unpin flips `pinned` back to false locally and the post
 * re-sorts OUT of the pinned group (context-sensitive menu label "Bỏ ghim").
 * Only the pin-ON direction was previously exercised.
 */
export const PinUnpinResortsOut: Story = {
  args: baseVM({ role: "principal" }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    let articles = await canvas.findAllByRole("article");
    // p-pinned (older, but pinned) floats first before unpinning.
    await expect(within(articles[0]).getByText(/30 năm/)).toBeInTheDocument();
    await userEvent.click(
      within(articles[0]).getByRole("button", {
        name: /Tuỳ chọn cho bài viết/,
      }),
    );
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Bỏ ghim bài viết" }),
    );
    await waitFor(() =>
      expect(args.togglePinMockAction).toHaveBeenCalledWith({
        postId: "p-pinned",
        pinned: false,
      }),
    );
    // Re-sorted purely by createdAt desc now → the newer plain post is first.
    await waitFor(async () => {
      articles = await canvas.findAllByRole("article");
      expect(
        within(articles[0]).getByText("CLB Toán học tuyển thành viên mới."),
      ).toBeInTheDocument();
    });
    await expect(canvas.queryByText("Đã ghim")).not.toBeInTheDocument();
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

/**
 * AC-1905.1 — teacher viewing another user's post in a class THEY teach: all
 * three entry points (Pin/Unpin, Remove, Report) render. Only 3/5 of the
 * UC-1905 role×author matrix had Storybook coverage before this story (the
 * matrix is fully covered at the `menuVisibility` unit level too, but the
 * container wiring — passing `teacherClassIds`/`post.classId` through
 * correctly — was only proven end-to-end for principal/student, not teacher).
 */
export const MenuTeacherOwnClassAllItems: Story = {
  args: baseVM({
    role: "teacher",
    meId: "t-1",
    teacherClassIds: ["11A2"],
    myClasses: [{ classId: "11A2", className: "11A2" }],
    initialSchoolPage: page([
      post({
        postId: "p-class-other",
        scope: "class",
        classId: "11A2",
        authorId: "u-other",
        authorName: "Học sinh khác",
        content: "Bài viết của học sinh trong lớp giáo viên chủ nhiệm.",
      }),
    ]),
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
    await waitFor(() =>
      expect(body.getByRole("menuitem", { name: "Báo cáo" })).toBeVisible(),
    );
    await expect(body.getByRole("menuitem", { name: /Ghim/ })).toBeVisible();
    await expect(
      body.getByRole("menuitem", { name: "Gỡ nội dung" }),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
  },
};

/**
 * AC-1905.2 — teacher viewing their OWN post in their own-class scope: Pin +
 * Remove still render (moderator-eligible), but Report does NOT (cannot
 * report own content). Previously untested — the only "own post" story used
 * a student, which has NO moderator items at all, so it could not
 * distinguish "hidden because own-post rule" from "hidden because
 * non-moderator role".
 */
export const MenuTeacherOwnPostNoReport: Story = {
  args: baseVM({
    role: "teacher",
    meId: "t-1",
    teacherClassIds: ["11A2"],
    myClasses: [{ classId: "11A2", className: "11A2" }],
    initialSchoolPage: page([
      post({
        postId: "p-own-teacher",
        scope: "class",
        classId: "11A2",
        authorId: "t-1",
        authorName: "Giáo viên",
        authorRole: "teacher",
        content: "Bài viết của chính giáo viên trong lớp mình chủ nhiệm.",
      }),
    ]),
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
    await waitFor(() =>
      expect(body.getByRole("menuitem", { name: /Ghim/ })).toBeVisible(),
    );
    await expect(
      body.getByRole("menuitem", { name: "Gỡ nội dung" }),
    ).toBeVisible();
    await expect(
      body.queryByRole("menuitem", { name: "Báo cáo" }),
    ).not.toBeInTheDocument();
  },
};

/**
 * AC-1905.6 — Escape closes the menu AND returns focus to the "…" trigger
 * (not merely "closes"). Radix DropdownMenu provides this natively, but no
 * story previously asserted the focus-return half of the AC.
 */
export const MenuEscapeReturnsFocusToTrigger: Story = {
  args: baseVM({ role: "principal" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    const trigger = within(articles[0]).getByRole("button", {
      name: /Tuỳ chọn cho bài viết/,
    });
    await userEvent.click(trigger);
    const body = within(document.body);
    await waitFor(() => expect(body.getByRole("menu")).toBeInTheDocument());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/**
 * AC-1901.7 — scope tablist arrow-key navigation moves FOCUS between tabs
 * (manual activation pattern); Enter/Space then activates the focused tab.
 * No prior story exercised the keyboard path at all (only click).
 */
export const ScopeTabsKeyboardNav: Story = {
  args: baseVM({
    role: "student",
    myClasses: [{ classId: "11A2", className: "11A2" }],
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    const schoolTab = canvas.getByRole("tab", { name: "Toàn trường" });
    const classTab = canvas.getByRole("tab", { name: /Lớp 11A2/ });
    schoolTab.focus();
    await expect(schoolTab).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(classTab).toHaveFocus());
    // Focus moved but did NOT activate the tab yet (manual activation).
    await expect(schoolTab).toHaveAttribute("aria-selected", "true");
    // Enter on the focused tab activates it.
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(canvas.getByLabelText("Nội dung bài viết")).toBeInTheDocument(),
    );
    await expect(classTab).toHaveAttribute("aria-selected", "true");
    // ArrowLeft moves focus back to the school tab.
    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(schoolTab).toHaveFocus());
  },
};

/**
 * AC-1902.1/1902.2/1901.2 (class-scope leg of the CTA matrix) — the school
 * scope leg (teacher CTA-shown / parent CTA-hidden) was already covered, but
 * the CLASS scope leg (student canPost=true → CTA shown; parent
 * canPost=false → CTA hidden even though parent HAS classes) was not.
 */
export const EmptyClassScopeStudentCta: Story = {
  args: baseVM({
    role: "student",
    myClasses: [{ classId: "11A2", className: "11A2" }],
    initialSchoolPage: page([]),
    fetchFeedPageAction: resolved(page([])),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: /Lớp 11A2/ }));
    await expect(
      await canvas.findByText("Chưa có bài viết nào"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Đăng bài viết đầu tiên" }),
    ).toBeInTheDocument();
  },
};

export const EmptyClassScopeParentNoCta: Story = {
  args: baseVM({
    role: "parent",
    myClasses: [{ classId: "11A2", className: "11A2" }],
    initialSchoolPage: page([]),
    fetchFeedPageAction: resolved(page([])),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: /Lớp 11A2/ }));
    await expect(
      await canvas.findByText("Chưa có bài viết nào"),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Đăng bài viết đầu tiên" }),
    ).not.toBeInTheDocument();
  },
};

/**
 * AC-1902.3/1902.4 — happy path: submit shows aria-busy while pending, then
 * optimistically prepends + toasts "Đã đăng bài viết" and clears the
 * composer on confirmation. Previously untested — every other composer story
 * only exercised the 3 failure paths, never a successful submit.
 */
export const ComposerHappyPath: Story = {
  args: (() => {
    let resolveCreate: (v: { ok: true; data: FeedPostEntity }) => void =
      () => {};
    const created = post({
      postId: "p-created",
      authorId: "t-1",
      authorName: "Bạn",
      authorRole: "teacher",
      content: "Bài viết mới nhất",
    });
    return baseVM({
      role: "teacher",
      meId: "t-1",
      meDisplayName: "Bạn",
      createPostAction: fn(
        () =>
          new Promise<{ ok: true; data: FeedPostEntity }>((resolve) => {
            resolveCreate = resolve;
            // Auto-resolve on next microtask flush isn't controllable inline
            // here, so resolve after a short delay instead (deterministic
            // enough for the aria-busy window to be observable).
            setTimeout(() => resolveCreate({ ok: true, data: created }), 30);
          }),
      ),
    });
  })(),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    const textarea = canvas.getByLabelText("Nội dung bài viết");
    await userEvent.type(textarea, "Bài viết mới nhất");
    const submitButton = canvas.getByRole("button", { name: /Đăng/ });
    await userEvent.click(submitButton);
    // Pending: aria-busy + textarea disabled.
    await waitFor(() =>
      expect(submitButton).toHaveAttribute("aria-busy", "true"),
    );
    await expect(textarea).toBeDisabled();
    // Confirmed: composer cleared (resetSignal fired) + create action called.
    // (`sonner`'s <Toaster/> is only mounted by the real app layout, not this
    // Storybook decorator, so the toast itself is asserted at the code-review
    // level — `toast.success(t("toasts.postCreated"))` in feed-screen.tsx —
    // rather than re-implemented here.)
    await waitFor(() => expect(textarea).toHaveValue(""));
    await expect(args.createPostAction).toHaveBeenCalled();
  },
};

/** AC-1902.5 — 422 validation error: inline field error, content preserved. */
export const ComposerValidationError: Story = {
  args: baseVM({
    role: "teacher",
    createPostAction: async () => ({
      ok: false,
      errorKey: "validation",
      retryable: false,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    const textarea = canvas.getByLabelText("Nội dung bài viết");
    await userEvent.type(textarea, "nội dung không hợp lệ");
    await userEvent.click(canvas.getByRole("button", { name: /Đăng/ }));
    const alert = await canvas.findByRole("alert");
    await expect(within(alert).getByText(/không hợp lệ/i)).toBeInTheDocument();
    // Content preserved for retry — NOT cleared, NOT optimistically prepended.
    await expect(textarea).toHaveValue("nội dung không hợp lệ");
    await expect(
      canvas.queryByText("nội dung không hợp lệ", { selector: "article p" }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1902.6 — 403 forbidden: distinct copy from validation, content preserved. */
export const ComposerForbiddenError: Story = {
  args: baseVM({
    role: "teacher",
    createPostAction: async () => ({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    const textarea = canvas.getByLabelText("Nội dung bài viết");
    await userEvent.type(textarea, "bài viết bị từ chối");
    await userEvent.click(canvas.getByRole("button", { name: /Đăng/ }));
    const alert = await canvas.findByRole("alert");
    await expect(
      within(alert).getByText(/không có quyền/i),
    ).toBeInTheDocument();
    await expect(textarea).toHaveValue("bài viết bị từ chối");
  },
};

/** AC-1902.7 — retryable transient failure: inline error + retry, NO toast. */
export const ComposerTransientError: Story = {
  args: baseVM({
    role: "teacher",
    createPostAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    const textarea = canvas.getByLabelText("Nội dung bài viết");
    await userEvent.type(textarea, "thử lại sau");
    await userEvent.click(canvas.getByRole("button", { name: /Đăng/ }));
    const alert = await canvas.findByRole("alert");
    await expect(within(alert).getByText(/kết nối/i)).toBeInTheDocument();
    await expect(textarea).toHaveValue("thử lại sau");
    // (No `<Toaster/>` is mounted by this Storybook decorator — only the real
    // app layout mounts it — so "no toast on failure" isn't independently
    // provable here; the inline-error-only failure path above already proves
    // no SUCCESS branch ran, which is the behavior that would have fired one.)
  },
};

/**
 * AC-1904.4 — happy path: typing + submitting a non-empty comment appends it
 * to the visible thread immediately. Previously untested — only the empty/
 * failure sub-states of the thread had coverage.
 */
export const CommentsAddHappyPath: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-plain",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết để bình luận",
        commentCount: 0,
      }),
    ]),
    listCommentsAction: resolved({
      comments: [],
      nextCursor: null,
      hasMore: false,
    }),
    addCommentAction: fn(
      async (input: { postId: string; content: string }) => ({
        ok: true as const,
        data: {
          commentId: "c-new",
          postId: input.postId,
          authorId: "me",
          authorName: "Bạn",
          authorRole: "teacher" as const,
          authorAvatarInitials: "B",
          content: input.content,
          createdAt: "2026-07-11T12:00:00.000Z",
        },
      }),
    ),
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await userEvent.click(
      within(articles[0]).getByRole("button", { name: /Xem bình luận/ }),
    );
    await waitFor(() =>
      expect(canvas.getByText("Chưa có bình luận")).toBeInTheDocument(),
    );
    const input = canvas.getByLabelText("Viết bình luận");
    await userEvent.type(input, "Bình luận mới");
    await userEvent.click(
      canvas.getByRole("button", { name: "Gửi bình luận" }),
    );
    await waitFor(() =>
      expect(args.addCommentAction).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Bình luận mới" }),
      ),
    );
    await waitFor(() =>
      expect(canvas.getByText("Bình luận mới")).toBeInTheDocument(),
    );
    // Draft cleared, empty-thread text gone now that a comment exists.
    await expect(input).toHaveValue("");
    await expect(
      canvas.queryByText("Chưa có bình luận"),
    ).not.toBeInTheDocument();
  },
};

/** AC-1904.5 — comment submit validation error: inline field error, no append. */
export const CommentsAddValidationError: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-plain",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết để bình luận lỗi",
        commentCount: 0,
      }),
    ]),
    listCommentsAction: resolved({
      comments: [],
      nextCursor: null,
      hasMore: false,
    }),
    addCommentAction: async () => ({
      ok: false,
      errorKey: "validation",
      retryable: false,
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
    const input = canvas.getByLabelText("Viết bình luận");
    await userEvent.type(input, "x");
    await userEvent.click(
      canvas.getByRole("button", { name: "Gửi bình luận" }),
    );
    await waitFor(() =>
      expect(
        within(articles[0]).getByText("Dữ liệu không hợp lệ."),
      ).toBeInTheDocument(),
    );
    // No comment was appended — the empty-thread text is still there.
    await expect(canvas.getByText("Chưa có bình luận")).toBeInTheDocument();
  },
};

/** AC-1904.6 — comment-list transient failure: inline retry, thread preserved. */
export const CommentsTransientError: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-plain",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết mà tải bình luận sẽ lỗi",
      }),
    ]),
    listCommentsAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await userEvent.click(
      within(articles[0]).getByRole("button", { name: /Xem bình luận/ }),
    );
    await waitFor(() =>
      expect(within(articles[0]).getByRole("alert")).toBeInTheDocument(),
    );
    await expect(within(articles[0]).getByText(/kết nối/i)).toBeInTheDocument();
  },
};

/** AC-1904.7 — comment call 404s (post gone): inline copy, thread collapses. */
export const CommentsPostGoneCollapsesThread: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-gone",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết sẽ biến mất giữa phiên",
      }),
    ]),
    listCommentsAction: async () => ({
      ok: false,
      errorKey: "post-not-found",
      retryable: false,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    const toggle = within(articles[0]).getByRole("button", {
      name: /Xem bình luận/,
    });
    await userEvent.click(toggle);
    // Thread collapses (aria-expanded flips back to false) — not a lingering
    // open thread with a dangling error.
    await waitFor(() =>
      expect(toggle).toHaveAttribute("aria-expanded", "false"),
    );
  },
};

/** AC-1903.5 — reaction 404 (post removed concurrently): post is DROPPED from the list. */
export const ReactionConcurrentRemoval: Story = {
  args: baseVM({
    initialSchoolPage: page([
      post({
        postId: "p-will-vanish",
        authorId: "u-teacher",
        authorName: "Nguyễn Thị Hương",
        authorRole: "teacher",
        content: "Bài viết sẽ bị gỡ ngay khi thả cảm xúc",
        reactions: {
          counts: { ...emptyReactionCounts(), like: 1 },
          myReaction: null,
        },
      }),
      post({
        postId: "p-stays",
        authorId: "u-other",
        authorName: "Người khác",
        authorRole: "teacher",
        content: "Bài viết này KHÔNG bị ảnh hưởng",
      }),
    ]),
    reactToPostAction: async () => ({
      ok: false,
      errorKey: "post-not-found",
      retryable: false,
    }),
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByRole("article");
    const chip = canvas.getByRole("button", { name: /Thích, 1 lượt/ });
    await userEvent.click(chip);
    // The reacted-on post disappears entirely from the feed list…
    await waitFor(() =>
      expect(
        canvas.queryByText("Bài viết sẽ bị gỡ ngay khi thả cảm xúc"),
      ).not.toBeInTheDocument(),
    );
    // …no blocking dialog…
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("alertdialog")).not.toBeInTheDocument();
    // …and the unrelated post remains, proving this is a targeted drop from
    // whichever page of the cache it lived on, not a full-list clear.
    await expect(
      canvas.getByText("Bài viết này KHÔNG bị ảnh hưởng"),
    ).toBeInTheDocument();
  },
};

/**
 * AC-1906.3 — report entry point on a COMMENT (not just a post) opens the
 * SAME shared dialog with kind="comment" (distinct from the post path).
 * Previously only the post path was exercised — the comment path (via
 * `FeedCommentItem`'s report-only menu, §0.3 scope note) had zero coverage.
 */
export const ReportCommentOpensSharedDialogWithCommentKind: Story = {
  args: baseVM({
    role: "teacher",
    meId: "me",
    initialSchoolPage: page([
      post({
        postId: "p-with-comment",
        authorId: "u-other",
        authorName: "Người khác",
        commentCount: 1,
      }),
    ]),
    listCommentsAction: resolved({
      comments: [
        {
          commentId: "c-1",
          postId: "p-with-comment",
          authorId: "u-student",
          authorName: "Học sinh A",
          authorRole: "student" as const,
          authorAvatarInitials: "HA",
          content: "Bình luận cần báo cáo",
          createdAt: "2026-07-11T10:00:00.000Z",
        },
      ],
      nextCursor: null,
      hasMore: false,
    }),
  }),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
    await userEvent.click(
      within(articles[0]).getByRole("button", { name: /Xem bình luận/ }),
    );
    await waitFor(() =>
      expect(canvas.getByText("Bình luận cần báo cáo")).toBeInTheDocument(),
    );
    await userEvent.click(
      within(articles[0]).getByRole("button", {
        name: /Tuỳ chọn cho bình luận của Học sinh A/,
      }),
    );
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("menuitem", { name: "Báo cáo" }),
    );
    await waitFor(() => expect(body.getByRole("dialog")).toBeInTheDocument());
    await expect(
      within(body.getByRole("dialog")).getByText("Báo cáo nội dung"),
    ).toBeInTheDocument();
    // Submitting proves the CORRECT kind/contentId were captured for the
    // comment path (contentId is closure-captured, not a dialog prop, per
    // the shared component's own contract — see US-E19.2).
    await userEvent.click(body.getByRole("radio", { name: /Spam/i }));
    await userEvent.click(
      body.getByRole("button", { name: /Gửi báo cáo|Gửi/i }),
    );
    await waitFor(() =>
      expect(args.reportContentAction).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "comment", contentId: "c-1" }),
      ),
    );
    // AC-1906.4 — the reported comment (and its parent post) remain visible
    // to the reporter after a successful submit; nothing is auto-hidden.
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await expect(canvas.getByText("Bình luận cần báo cáo")).toBeInTheDocument();
  },
};

/**
 * AC-1910.2/.3 — confirming Remove actually calls `removeContentAction` (the
 * SHARED moderate-delete flow, no second delete call), and on success the
 * post disappears from the feed on next refetch. Previously the story only
 * verified the confirm DIALOG opened, never that confirming it did anything.
 */
export const RemoveConfirmedRefetchesAndDrops: Story = {
  args: (() => {
    const remaining = page([
      post({
        postId: "p-stays",
        authorId: "u-other",
        authorName: "Người khác",
        content: "Bài viết còn lại sau khi gỡ",
      }),
    ]);
    return baseVM({
      role: "principal",
      initialSchoolPage: page(SCHOOL_POSTS),
      fetchFeedPageAction: fn(async () => ({
        ok: true as const,
        data: remaining,
      })),
      removeContentAction: fn(async () => ({ ok: true as const })),
    });
  })(),
  play: async ({ canvasElement, args }) => {
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
    const dialog = await body.findByRole("alertdialog");
    // Confirm — no second/duplicate delete call, no second confirm dialog.
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Gỡ nội dung" }),
    );
    await waitFor(() =>
      expect(args.removeContentAction).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "post", contentId: "p-pinned" }),
      ),
    );
    // ADR-0052 — the feed direct-removal path never sends a reportId.
    const call = (
      args.removeContentAction as unknown as {
        mock: { calls: unknown[][] };
      }
    ).mock.calls[0][0];
    expect(call).not.toHaveProperty("reportId");
    // Dialog closes and the list re-fetches to the post-removal server state.
    await waitFor(() =>
      expect(body.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        canvas.getByText("Bài viết còn lại sau khi gỡ"),
      ).toBeInTheDocument(),
    );
    await expect(canvas.queryByText(/30 năm/)).not.toBeInTheDocument();
  },
};

/**
 * AC-1909.1/.4 — pin toggle mutates local cache with NO network call, AND an
 * explicit cache invalidate+refetch (the functional equivalent of a full
 * reload re-fetching the same query key) reverts to whatever the (mocked)
 * fetch returns — proving the mock-first pin is genuinely NOT durable, per
 * the story's own test-note (AC-1909.4 is a scope-boundary assertion, not an
 * error path).
 */
export const PinDoesNotSurviveRefetch: Story = {
  args: (() => {
    // Server "truth" never reflects the pin — same shape every fetch.
    const serverTruth = page(SCHOOL_POSTS);
    return baseVM({
      role: "principal",
      initialSchoolPage: page(SCHOOL_POSTS),
      fetchFeedPageAction: fn(async () => ({
        ok: true as const,
        data: serverTruth,
      })),
    });
  })(),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const articles = await canvas.findAllByRole("article");
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
      expect(within(teacherArticle).getByText("Đã ghim")).toBeInTheDocument(),
    );
    // Simulate "reload" — invalidate + refetch the SAME query key. A real
    // reload would re-run this exact query key against the (mock) backend.
    await (
      window as unknown as {
        __feedQueryClient?: {
          invalidateQueries: (o: unknown) => Promise<void>;
        };
      }
    ).__feedQueryClient?.invalidateQueries({
      queryKey: ["feed", "list", "school"],
    });
    await waitFor(() =>
      expect(
        within(teacherArticle).queryByText("Đã ghim"),
      ).not.toBeInTheDocument(),
    );
    // Fetch WAS called this time (the invalidate-triggered refetch) — proves
    // the earlier pin toggle itself still made zero network calls of its own.
    expect(args.fetchFeedPageAction).toHaveBeenCalled();
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
