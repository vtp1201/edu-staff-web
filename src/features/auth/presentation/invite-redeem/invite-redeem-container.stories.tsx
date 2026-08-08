import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { InvitationPreview } from "@/features/auth/domain/entities/invitation-preview.entity";
import type { RedeemedInvitation } from "@/features/auth/domain/entities/redeemed-invitation.entity";
import type { InvitationRedeemFailure } from "@/features/auth/domain/failures/invitation-redeem.failure";
import type {
  IInvitationRedeemRepository,
  RedeemInvitationCommand,
} from "@/features/auth/domain/repositories/i-invitation-redeem.repository";
import { InviteRedeemContainer } from "./invite-redeem-container";

/**
 * Interaction coverage for the BROWSER-DIRECT redemption flow (US-E18.59,
 * ADR 0072). The container owns the two IAM calls, so every story injects a
 * stub repository through the `repository` seam — the same interface the real
 * `fetch` repository implements — and asserts the state the screen derives
 * from it, including the `loading` state that only exists now that the lookup
 * left the server.
 */

const PREVIEW: InvitationPreview = {
  email: "lan.pham@nguyendu.edu.vn",
  tenantName: "THPT Nguyễn Du",
  roles: ["TEACHER"],
  expiresAt: "2026-08-14T02:00:00Z",
};

const REDEEMED: RedeemedInvitation = {
  member: {
    tenantId: "t-9",
    userId: "u-9",
    roles: ["TEACHER"],
    status: "ACTIVE",
  },
  tokens: { accessToken: "a", refreshToken: "r", sessionId: "s" },
};

/** Stub repository: scripted lookup + redeem outcomes, no network. */
function stubRepo(script: {
  lookup?: InvitationPreview | InvitationRedeemFailure | "pending";
  redeem?: RedeemedInvitation | InvitationRedeemFailure;
}): IInvitationRedeemRepository {
  const settle = <T,>(outcome: T | InvitationRedeemFailure): Promise<T> =>
    outcome && typeof outcome === "object" && "type" in outcome
      ? Promise.reject(outcome)
      : Promise.resolve(outcome as T);
  return {
    lookup: async () =>
      script.lookup === "pending"
        ? new Promise<InvitationPreview>(() => {})
        : settle<InvitationPreview>(script.lookup ?? PREVIEW),
    redeem: async (_command: RedeemInvitationCommand) =>
      settle<RedeemedInvitation>(script.redeem ?? REDEEMED),
  };
}

const meta = {
  title: "Auth/InviteRedeemContainer",
  component: InviteRedeemContainer,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    token: "tok-1",
    loginHref: "/vi/login",
    acceptHref: "/vi/invitations/accept?token=tok-1",
    onFinalize: fn(async () => {}),
    repository: stubRepo({}),
  },
} satisfies Meta<typeof InviteRedeemContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fill the three inputs so the submit gate opens. */
async function fillForm(
  canvas: ReturnType<typeof within>,
  password = "Matkhau@123",
) {
  await waitFor(() => canvas.getByLabelText("Họ và tên"));
  await userEvent.type(canvas.getByLabelText("Họ và tên"), "Phạm Thị Lan");
  await userEvent.type(canvas.getByLabelText("Mật khẩu"), password);
  await userEvent.type(canvas.getByLabelText("Nhập lại mật khẩu"), password);
}

const submitButton = (canvas: ReturnType<typeof within>) =>
  canvas.getByRole("button", { name: "Tạo tài khoản và tham gia" });

/**
 * The state ADR 0072 introduces: the preview is fetched by the browser, so
 * there is a real pending moment, announced politely rather than silently.
 */
export const LookupLoading: Story = {
  args: { repository: stubRepo({ lookup: "pending" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = await waitFor(() => {
      const busy = canvas
        .getAllByRole("status")
        .find((el) => el.getAttribute("aria-busy") === "true");
      if (!busy) throw new Error("no aria-busy status region yet");
      return busy;
    });
    await expect(status).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByText("Đang tải lời mời…")).toBeInTheDocument();
    await expect(canvas.queryByLabelText("Mật khẩu")).toBeNull();
    // Nothing resolved yet → the success live region is present but silent.
    await expect(canvas.getByTestId("redeem-announcement")).toHaveTextContent(
      "",
    );
  },
};

/**
 * Lookup resolves → the read-only summary + the form, skeleton gone, and the
 * resolution ANNOUNCED (A11Y-001): the failure transitions already announce via
 * `role="alert"`; this is the success half of that symmetry, driven here by the
 * real `useQuery` transition rather than a hand-set VM.
 */
export const LookupResolvesToForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const live = canvas.getByTestId("redeem-announcement");
    await waitFor(async () => {
      await expect(canvas.getByText("Giáo viên")).toBeVisible();
    });
    await expect(canvas.getByText("lan.pham@nguyendu.edu.vn")).toBeVisible();
    // The busy skeleton region is gone…
    await expect(
      canvas
        .queryAllByRole("status")
        .find((el) => el.getAttribute("aria-busy") === "true"),
    ).toBeUndefined();
    // …and the SAME persistent region now carries the resolution.
    await expect(canvas.getByTestId("redeem-announcement")).toBe(live);
    await waitFor(async () => {
      await expect(live).toHaveTextContent(
        "Đã tải xong lời mời. Vui lòng điền thông tin bên dưới.",
      );
    });
    await expect(submitButton(canvas)).toBeDisabled();
  },
};

/** A terminal lookup failure must NOT claim the invitation loaded. */
export const LookupFailureAnnouncesOnlyTheAlert: Story = {
  args: { repository: stubRepo({ lookup: { type: "link-expired" } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(canvas.getByText("Lời mời đã hết hạn")).toBeVisible();
    });
    await expect(canvas.getByRole("alert")).toBeVisible();
    await expect(canvas.getByTestId("redeem-announcement")).toHaveTextContent(
      "",
    );
  },
};

export const LookupLinkInvalid: Story = {
  args: { repository: stubRepo({ lookup: { type: "link-invalid" } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(async () => {
      await expect(
        canvas.getByText("Liên kết không còn hiệu lực"),
      ).toBeVisible();
    });
    await expect(canvas.queryByLabelText("Mật khẩu")).toBeNull();
  },
};

export const LookupExpired: Story = {
  args: { repository: stubRepo({ lookup: { type: "link-expired" } }) },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(
        within(canvasElement).getByText("Lời mời đã hết hạn"),
      ).toBeVisible();
    });
  },
};

/** 429 on the shared lookup+redeem budget — the defect ADR 0072 exists to bound. */
export const LookupRateLimited: Story = {
  args: {
    repository: stubRepo({
      lookup: { type: "rate-limited", retryAfterSeconds: 60 },
    }),
  },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(
        within(canvasElement).getByText("Bạn đã thử quá nhiều lần"),
      ).toBeVisible();
    });
  },
};

export const LookupTenantInactive: Story = {
  args: { repository: stubRepo({ lookup: { type: "tenant-inactive" } }) },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(
        within(canvasElement).getByText("Trường chưa hoạt động"),
      ).toBeVisible();
    });
  },
};

/** A rejected browser `fetch` (offline/CORS) — the one state that invites a reload. */
export const LookupNetworkError: Story = {
  args: { repository: stubRepo({ lookup: { type: "network-error" } }) },
  play: async ({ canvasElement }) => {
    await waitFor(async () => {
      await expect(
        within(canvasElement).getByText("Không tải được lời mời"),
      ).toBeVisible();
    });
  },
};

/**
 * Happy path: the BROWSER redeems, then the narrow Server Action receives the
 * SERVER's member/tokens to write the session cookies and redirect.
 */
export const SubmitSuccessFinalizesSession: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(submitButton(canvas));
    await waitFor(() =>
      expect(args.onFinalize).toHaveBeenCalledWith(
        REDEEMED.member,
        REDEEMED.tokens,
      ),
    );
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** 409: routed into the signed-in accept flow, and no session is minted. */
export const SubmitAccountExists: Story = {
  args: { repository: stubRepo({ redeem: { type: "account-exists" } }) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(submitButton(canvas));
    await waitFor(async () => {
      await expect(canvas.getByText("Email này đã có tài khoản")).toBeVisible();
    });
    await expect(
      canvas.getByRole("link", { name: "Đăng nhập để tham gia" }),
    ).toHaveAttribute("href", "/vi/invitations/accept?token=tok-1");
    await expect(args.onFinalize).not.toHaveBeenCalled();
  },
};

/** BE's password policy blames the password field; the form stays usable. */
export const SubmitWeakPassword: Story = {
  args: {
    repository: stubRepo({
      redeem: { type: "invalid-input", issues: ["passwordWeak"] },
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas, "matkhau1");
    await userEvent.click(submitButton(canvas));
    await waitFor(async () => {
      await expect(canvas.getByText(/Mật khẩu chưa đủ mạnh/)).toBeVisible();
    });
    await expect(canvas.getByLabelText("Mật khẩu")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(args.onFinalize).not.toHaveBeenCalled();
  },
};

/** A REPLAYED token is 410, never 409 — dead-link copy, form removed. */
export const SubmitReplayedTokenIsDeadLink: Story = {
  args: { repository: stubRepo({ redeem: { type: "link-invalid" } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillForm(canvas);
    await userEvent.click(submitButton(canvas));
    await waitFor(async () => {
      await expect(
        canvas.getByText("Liên kết không còn hiệu lực"),
      ).toBeVisible();
    });
    await expect(canvas.queryByText("Email này đã có tài khoản")).toBeNull();
  },
};

/**
 * Defensive twin of the RSC short-circuit: even if a blank token reaches the
 * container, the repository is never called — no slot of the shared per-IP
 * budget is spent on a link that cannot work.
 */
const blankTokenRepo: IInvitationRedeemRepository = {
  lookup: fn(async () => PREVIEW),
  redeem: fn(async () => REDEEMED),
};

export const BlankTokenNeverCalls: Story = {
  args: { token: "   ", repository: blankTokenRepo },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Liên kết không còn hiệu lực")).toBeVisible();
    await expect(blankTokenRepo.lookup).not.toHaveBeenCalled();
  },
};
