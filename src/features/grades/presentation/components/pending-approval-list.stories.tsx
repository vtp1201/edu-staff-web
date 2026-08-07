import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { formatRelativeTime } from "@/shared/relative-time";
import type { PendingApprovalBatch } from "../../domain/entities/pending-approval-batch.entity";
import type {
  ClassSubjectOption,
  PendingApprovalVM,
} from "../grade-entry-screen/grade-entry-screen.i-vm";
import { PendingApprovalList } from "./pending-approval-list";

const CLASS_SUBJECTS: ClassSubjectOption[] = [
  {
    classId: "class-001",
    subjectId: "subj-toan-10",
    className: "10A1",
    subjectName: "Toán",
  },
  {
    classId: "class-002",
    subjectId: "subj-toan-10",
    className: "10A2",
    subjectName: "Toán",
  },
];

/** Deliberately old so the relative-time bucket ("… tháng trước") is stable. */
const OLD_SUBMITTED_AT = "2025-01-05T02:00:00.000Z";

const BATCHES: PendingApprovalBatch[] = [
  {
    classId: "class-001",
    subjectId: "subj-toan-10",
    termId: "HK1",
    pendingCount: 12,
    submittedAt: OLD_SUBMITTED_AT,
  },
  {
    classId: "class-002",
    subjectId: "subj-toan-10",
    termId: "HK2",
    pendingCount: 3,
    submittedAt: "2025-02-05T03:15:00.000Z",
  },
];

function seed(over: Partial<PendingApprovalVM> = {}): PendingApprovalVM {
  return {
    items: BATCHES,
    nextCursor: null,
    hasMore: false,
    error: null,
    ...over,
  };
}

const meta: Meta<typeof PendingApprovalList> = {
  title: "Features/Grades/PendingApprovalList",
  component: PendingApprovalList,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="bg-[color:var(--edu-bg)] p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: {
    seed: seed(),
    classSubjects: CLASS_SUBJECTS,
    onSelect: fn(),
    getFailureMessage: () => messages.gradeEntry.errorNetworkError,
    loadPage: async () => ({
      ok: true,
      page: { items: [], nextCursor: null, hasMore: false },
    }),
  },
};
export default meta;

type Story = StoryObj<typeof PendingApprovalList>;

/**
 * A11Y-046-01 — the row button's `aria-label` overrides its visible content, so
 * the wait time (the triage signal the whole rollup exists to surface) has to be
 * part of the accessible NAME, not only of the text a sighted user reads.
 */
export const RowLabelAnnouncesWaitTime: Story = {
  name: "A11y — the row's accessible name includes how long it has waited",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const waited = formatRelativeTime(OLD_SUBMITTED_AT, "vi");
    const row = canvas.getAllByRole("button", { name: /Mở bảng điểm/ })[0];
    // The same relative-time string a sighted user reads in the row body.
    await expect(row).toHaveAccessibleName(new RegExp(`nộp ${waited}`));
    await expect(row).toHaveAccessibleName(/10A1/);
    await expect(row).toHaveAccessibleName(/12 ô chờ duyệt/);
  },
};

/**
 * A11Y-046-02 — appended rows are invisible to a screen reader without a live
 * region, so the count that just arrived is announced politely.
 */
export const LoadMoreAnnouncesAppendedCount: Story = {
  name: "A11y — load more announces how many items were added",
  args: {
    seed: seed({ items: [BATCHES[0]], nextCursor: "cur-2", hasMore: true }),
    loadPage: async () => ({
      ok: true,
      page: { items: [BATCHES[1]], nextCursor: null, hasMore: false },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The live region exists (empty) from the first paint — an element added
    // together with its content is not reliably announced.
    const live = canvasElement.querySelector('[role="status"]');
    await expect(live).toBeInTheDocument();
    await expect(live).toHaveTextContent("");

    await userEvent.click(
      canvas.getByRole("button", { name: messages.gradeEntry.pendingLoadMore }),
    );
    await waitFor(() =>
      expect(
        canvas.getAllByRole("button", { name: /Mở bảng điểm/ }).length,
      ).toBe(2),
    );
    await expect(live).toHaveTextContent("Đã tải thêm 1 mục");
  },
};

/**
 * A `hasMore: true` response with a null `nextCursor` has no next page to ask
 * for: offering "load more" there would re-read the FIRST page over every
 * accumulated one, silently truncating the queue.
 */
export const NullCursorHidesLoadMore: Story = {
  name: "Pagination — hasMore with no cursor renders no load-more control",
  args: {
    seed: seed({ items: [BATCHES[0]], nextCursor: null, hasMore: true }),
    loadPage: fn(async () => ({
      ok: true as const,
      page: { items: BATCHES, nextCursor: null, hasMore: false },
    })),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", {
        name: messages.gradeEntry.pendingLoadMore,
      }),
    ).toBeNull();
    // No page was fetched, so the single seeded row is still the only row.
    await expect(args.loadPage).not.toHaveBeenCalled();
    await expect(
      canvas.getAllByRole("button", { name: /Mở bảng điểm/ }).length,
    ).toBe(1);
  },
};

/**
 * Regression (reviewer MUST-FIX): after approve/reject the screen revalidates
 * and the RSC page delivers a NEW seed to this already-mounted component. It
 * has to re-render from that seed — otherwise a tuple whose last pending cell
 * was just cleared stays in the queue for the rest of the session.
 */
function ReseedHarness() {
  const [items, setItems] = useState<PendingApprovalBatch[]>(BATCHES);
  return (
    <div>
      <button type="button" onClick={() => setItems([BATCHES[1]])}>
        simulate-approve-revalidate
      </button>
      <PendingApprovalList
        seed={{ items, nextCursor: null, hasMore: false, error: null }}
        classSubjects={CLASS_SUBJECTS}
        onSelect={fn()}
        getFailureMessage={() => messages.gradeEntry.errorNetworkError}
        loadPage={async () => ({
          ok: true,
          page: { items: [], nextCursor: null, hasMore: false },
        })}
      />
    </div>
  );
}

export const ReseedReplacesStaleQueue: Story = {
  name: "Seed sync — a fresh RSC seed replaces the stale queue (no remount)",
  render: () => <ReseedHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByRole("button", { name: /Mở bảng điểm/ }).length,
    ).toBe(2);

    await userEvent.click(
      canvas.getByRole("button", { name: "simulate-approve-revalidate" }),
    );

    await waitFor(async () => {
      const rows = canvas.getAllByRole("button", { name: /Mở bảng điểm/ });
      await expect(rows.length).toBe(1);
      await expect(rows[0]).toHaveAccessibleName(/10A2/);
    });
    // The cleared tuple is gone, not merely re-ordered.
    await expect(canvas.queryByRole("button", { name: /10A1/ })).toBeNull();
  },
};
