import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import type { SearchStudent } from "../../domain/entities/search-student.entity";
import { toRosterStudentFromEnrollment } from "../../infrastructure/mappers/roster.mapper";
import { StudentRosterScreen } from "./student-roster-screen";
import type { StudentRosterScreenVm } from "./student-roster-screen.i-vm";

const classes: ClassSummary[] = [
  {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    homeroomTeacher: "Nguyễn Thị Hương",
    year: "2025–2026",
  },
  {
    id: "cls-10a2",
    name: "10A2",
    gradeLevel: 10,
    homeroomTeacher: "Trần Văn Minh",
    year: "2025–2026",
  },
  {
    id: "cls-10b3",
    name: "10B3",
    gradeLevel: 10,
    homeroomTeacher: null,
    year: "2025–2026",
  },
];

const genders: Array<"F" | "M"> = ["F", "M"];
const roster32: RosterStudent[] = Array.from({ length: 32 }, (_, i) => ({
  id: `HS250${String(i + 1).padStart(2, "0")}`,
  code: `HS250${String(i + 1).padStart(2, "0")}`,
  name: `Học sinh ${i + 1}`,
  dob: "01/01/2010",
  gender: genders[i % 2],
  status: i === 7 || i === 18 ? "transferred" : "active",
}));

/**
 * REAL-mode rows (US-E18.35), built by running the actual mapper over a real
 * wire `EnrollmentResponse` + the IAM detail map — a hand-written fixture would
 * keep passing even if the join regressed.
 *
 * The four cases the screen must survive: fully decorated, PII unset
 * (ADR-0122), self-reported "OTHER", and a member IAM could not resolve.
 */
const realRoster: RosterStudent[] = (
  [
    [
      "8f14e45f-ceea-467a-9d0b-2c1a4b9e7d31",
      {
        name: "Nguyễn Minh Anh",
        dob: "2010-03-15T00:00:00Z",
        gender: "FEMALE" as const,
      },
    ],
    ["b2c3d4e5-1111-4444-8888-222233334444", { name: "Trần Văn Bình" }],
    [
      "c3d4e5f6-2222-4444-8888-333344445555",
      { name: "Lê Thị Cẩm", gender: "OTHER" as const },
    ],
    ["d4e5f6a7-3333-4444-8888-444455556666", undefined],
  ] as const
).map(([studentMemberId, detail]) =>
  toRosterStudentFromEnrollment(
    {
      enrollmentId: `enr-${studentMemberId}`,
      classId: "cls-10a1",
      studentMemberId,
      academicYearLabel: "2025–2026",
      enrolledAt: "2025-09-05T02:00:00Z",
    },
    detail,
  ),
);

const searchPool: SearchStudent[] = [
  {
    id: "HS25201",
    name: "Nguyễn Hồng Quân",
    currentClassId: null,
    currentClassName: null,
  },
  {
    id: "HS25202",
    name: "Trần Thuỵ Vân",
    currentClassId: "cls-10a2",
    currentClassName: "10A2",
  },
  {
    id: "HS25203",
    name: "Phạm Quang Vinh",
    currentClassId: null,
    currentClassName: null,
  },
];

const baseVm: StudentRosterScreenVm = {
  classes,
  currentClass: classes[0],
  roster: roster32,
  activeCount: roster32.filter((s) => s.status === "active").length,
  transferredCount: roster32.filter((s) => s.status === "transferred").length,
  searchPool,
  fetchError: null,
  poolError: null,
};

const emptyVm: StudentRosterScreenVm = {
  classes,
  currentClass: classes[2],
  roster: [],
  activeCount: 0,
  transferredCount: 0,
  searchPool,
  fetchError: null,
  poolError: null,
};

const ok = async () => ({ ok: true as const });
const fail = async () => ({
  ok: false as const,
  errorKey: "network-error" as const,
});

const handlers = {
  onEnroll: ok,
  onUnenroll: ok,
  onUnenrollMany: ok,
  onTransfer: ok,
};

const meta: Meta<typeof StudentRosterScreen> = {
  title: "Admin/StudentRosterScreen",
  component: StudentRosterScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof StudentRosterScreen>;

export const Populated: Story = {
  args: { vm: baseVm, ...handlers },
};

export const EmptyClass: Story = {
  args: { vm: emptyVm, ...handlers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(messages.adminRoster.empty.title),
    ).toBeInTheDocument();
  },
};

export const TransferWarning: Story = {
  args: { vm: baseVm, ...handlers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The transfer-candidate row exposes a "Chuyển lớp" button.
    const transferBtn = await canvas.findByRole("button", {
      name: messages.adminRoster.addPanel.transfer,
    });
    await userEvent.click(transferBtn);
    await waitFor(() =>
      expect(
        document.body.textContent?.includes(
          messages.adminRoster.confirm.transferTitle,
        ),
      ).toBe(true),
    );
  },
};

export const BulkSelected: Story = {
  args: { vm: baseVm, ...handlers },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkboxes = await canvas.findAllByRole("checkbox");
    // Skip the header (index 0); select three row checkboxes.
    await userEvent.click(checkboxes[1]);
    await userEvent.click(checkboxes[2]);
    await userEvent.click(checkboxes[3]);
    await expect(await canvas.findByText(/Đã chọn 3/)).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: { vm: baseVm, ...handlers, onUnenroll: fail },
};

/**
 * US-E18.35 — what an ADMIN actually sees against the live backend: real names
 * from IAM, and honest placeholders where the wire has nothing (no student
 * code exists in any contract; dob/gender are optional per user, ADR-0122).
 */
export const RealModeWithMissingFields: Story = {
  args: {
    vm: {
      ...baseVm,
      roster: realRoster,
      activeCount: realRoster.length,
      transferredCount: 0,
    },
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tbl = messages.adminRoster.table;

    // Decorated row renders real data.
    await expect(await canvas.findByText("Nguyễn Minh Anh")).toBeVisible();
    await expect(canvas.getByText("15/03/2010")).toBeVisible();

    // Absence is announced, never blank and never fabricated.
    expect(canvas.getAllByText(tbl.notProvided).length).toBeGreaterThan(0);
    await expect(canvas.getByText(tbl.unknownName)).toBeVisible();

    // Self-reported "Khác" keeps its own badge.
    await expect(
      canvas.getByRole("img", { name: tbl.genderOther }),
    ).toBeVisible();

    // No member uuid is ever printed in a display cell.
    expect(canvasElement.textContent ?? "").not.toContain(
      "8f14e45f-ceea-467a-9d0b-2c1a4b9e7d31",
    );

    // Every row still carries its mutation affordance (the join degrading
    // must not silently disable admin actions).
    await expect(
      canvas.getAllByRole("checkbox", { name: /Chọn học sinh/ }),
    ).toHaveLength(realRoster.length);
  },
};

/**
 * US-E18.35 review — a FAILED roster read, the state this story made reachable
 * (`getClassRoster` is a real HTTP call now). It must NOT look like the empty
 * class above: the error is announced, and every mutation affordance is gone,
 * because acting on a roster we could not read is the real hazard.
 */
export const RosterReadFailed: Story = {
  args: {
    vm: {
      ...baseVm,
      roster: [],
      activeCount: 0,
      transferredCount: 0,
      fetchError: "network-error",
    },
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(
      messages.adminRoster.errors["network-error"],
    );
    // NOT the empty-class copy — the two must never be confusable.
    await expect(
      canvas.queryByText(messages.adminRoster.empty.title),
    ).not.toBeInTheDocument();
    // Transient failure → retry is offered.
    await expect(
      canvas.getByRole("button", { name: messages.Common.confirmDialog.retry }),
    ).toBeInTheDocument();
    // No table, no bulk-select, no enroll panel.
    await expect(canvas.queryAllByRole("checkbox")).toHaveLength(0);
    await expect(
      canvas.queryByPlaceholderText(
        messages.adminRoster.addPanel.searchPlaceholder,
      ),
    ).not.toBeInTheDocument();
  },
};

/** A 403 an admin cannot retry away — the retry control is absent, not disabled. */
export const RosterReadForbidden: Story = {
  args: {
    vm: {
      ...baseVm,
      roster: [],
      activeCount: 0,
      transferredCount: 0,
      fetchError: "forbidden",
    },
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByText(messages.adminRoster.errors.forbidden),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", {
        name: messages.Common.confirmDialog.retry,
      }),
    ).not.toBeInTheDocument();
    // The class picker survives so the operator is not dead-ended.
    await expect(
      canvas.getByText(messages.adminRoster.breadcrumb.classes),
    ).toBeVisible();
  },
};

/**
 * US-E18.41 — the pool became a REAL composition (IAM STUDENT directory MINUS
 * core's enrolled ids), so it can fail while the roster loads fine. The panel
 * must say so: an empty candidate list would otherwise claim there is nobody
 * left to enroll.
 */
export const CandidatePoolReadFailed: Story = {
  args: {
    vm: { ...baseVm, searchPool: [], poolError: "network-error" },
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(
      messages.adminRoster.errors["network-error"],
    );
    // NOT the "no candidates" copy — the two must never be confusable.
    await expect(
      canvas.queryByText(messages.adminRoster.addPanel.noResults),
    ).not.toBeInTheDocument();
    // The roster itself is untouched: rows and their affordances stay.
    await expect(
      canvas.getAllByRole("checkbox", { name: /Chọn học sinh/ }).length,
    ).toBeGreaterThan(0);
    // Transient failure → retry offered inside the panel.
    await expect(
      canvas.getByRole("button", { name: messages.Common.confirmDialog.retry }),
    ).toBeInTheDocument();
  },
};

/** 403 on the pool read — retry omitted, roster still fully usable. */
export const CandidatePoolForbidden: Story = {
  args: {
    vm: { ...baseVm, searchPool: [], poolError: "forbidden" },
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(messages.adminRoster.errors.forbidden),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", {
        name: messages.Common.confirmDialog.retry,
      }),
    ).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { vm: baseVm, ...handlers },
  parameters: {
    docs: {
      description: {
        story:
          "Loading skeleton lives in the RSC Suspense boundary (roster-skeleton.tsx); the client screen itself always renders hydrated data.",
      },
    },
  },
};
