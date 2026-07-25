import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { StaffConductNoteEntity } from "../../domain/entities/staff-conduct-note.entity";
import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";
import type { StaffViolationEntity } from "../../domain/entities/staff-violation.entity";
import { SDConductNoteRow } from "./sd-conduct-note-row";
import { SDSelfApprovedNote } from "./sd-self-approved-note";
import { SDViolationRow } from "./sd-violation-row";

/**
 * ============================================================================
 * SECURITY-GRADE PROOF #4 — `selfApproved` is ALWAYS rendered, never suppressed
 * NFR-008 pt.5 / ADR 0073 / AC-004.2 / AC-008.3 · plan.md Phase 8 item 4
 * ============================================================================
 *
 * Node-env static-markup assertions (no jsdom). Two complementary proofs:
 *  (a) the component itself takes ZERO props, so there is no code path inside it
 *      that can hide the note once mounted;
 *  (b) both row components mount it for EVERY `selfApproved: true` record —
 *      including states/roles where the mutating controls are absent — and mount
 *      it for none where the flag is false. The only condition anywhere is the
 *      `selfApproved` flag itself (derived once at the mapper boundary).
 */
const SELF_APPROVED_COPY =
  messages.staffDiscipline.conductNotes.selfApprovedNote;

const STAFF: StaffRosterEntry = {
  staffMemberId: "staff-1",
  staffName: "Nguyễn Thị Hương",
  department: "Tổ Toán",
  initials: "NH",
};

function render(ui: React.ReactElement) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function violation(over: Partial<StaffViolationEntity> = {}) {
  return {
    recordId: "sv-001",
    staffMemberId: "staff-1",
    staffName: STAFF.staffName,
    department: STAFF.department,
    category: "Vi phạm quy chế chuyên môn",
    description: "Mô tả vi phạm.",
    severity: "MINOR",
    occurredAt: "2026-04-14",
    state: "APPROVED",
    authorMemberId: "admin-1",
    approverMemberId: "admin-1",
    selfApproved: true,
    createdAt: "2026-04-14T07:40:00Z",
    updatedAt: "2026-04-15T08:00:00Z",
    ...over,
  } satisfies StaffViolationEntity;
}

function note(over: Partial<StaffConductNoteEntity> = {}) {
  return {
    termId: "HK1-2025-2026",
    staffMemberId: "staff-1",
    staffName: STAFF.staffName,
    department: STAFF.department,
    rating: "SATISFACTORY",
    note: "Ghi chú hạnh kiểm.",
    state: "APPROVED",
    authorMemberId: "admin-1",
    approverMemberId: "admin-1",
    selfApproved: true,
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-01-20T10:00:00Z",
    ...over,
  } satisfies StaffConductNoteEntity;
}

const rowHandlers = {
  onSubmit: vi.fn(),
  onApprove: vi.fn(),
  onStartReject: vi.fn(),
  onChangeRejectReason: vi.fn(),
  onConfirmReject: vi.fn(),
  onCancelReject: vi.fn(),
};

describe("SDSelfApprovedNote — unsuppressable by construction", () => {
  it("renders its full label with NO props at all", () => {
    const html = render(<SDSelfApprovedNote />);
    expect(html).toContain(SELF_APPROVED_COPY);
  });

  it("has no prop that could hide it (zero-prop type contract)", () => {
    // Passing anything is a type error; at runtime extra props are ignored and
    // the label still renders — there is no `hidden`/`visible`/`variant` branch.
    const html = render(
      <SDSelfApprovedNote
        {...({ hidden: true, visible: false } as unknown as Record<
          string,
          never
        >)}
      />,
    );
    expect(html).toContain(SELF_APPROVED_COPY);
  });
});

describe("SDViolationRow — selfApproved annotation (AC-004.2)", () => {
  it("renders the annotation whenever selfApproved is true (principal view)", () => {
    const html = render(
      <SDViolationRow
        violation={violation()}
        staff={STAFF}
        canSubmit={false}
        canDecide={false}
        isRejecting={false}
        isBusy={false}
        rejectReason=""
        {...rowHandlers}
      />,
    );
    expect(html).toContain(SELF_APPROVED_COPY);
  });

  it("renders it in the teacher read-only view too (no mutating controls present)", () => {
    const html = render(
      <SDViolationRow
        violation={violation()}
        staff={STAFF}
        canSubmit={false}
        canDecide={false}
        isRejecting={false}
        isBusy={false}
        rejectReason=""
        {...rowHandlers}
      />,
    );
    expect(html).toContain(SELF_APPROVED_COPY);
    expect(html).not.toContain(
      messages.staffDiscipline.violations.actions.approve,
    );
  });

  it("renders it even while a row mutation is in flight (isBusy)", () => {
    const html = render(
      <SDViolationRow
        violation={violation()}
        staff={STAFF}
        canSubmit={false}
        canDecide={true}
        isRejecting={true}
        isBusy={true}
        rejectReason="Lý do đủ dài để hợp lệ."
        {...rowHandlers}
      />,
    );
    expect(html).toContain(SELF_APPROVED_COPY);
  });

  it("does NOT render it when selfApproved is false (a different approver)", () => {
    const html = render(
      <SDViolationRow
        violation={violation({
          approverMemberId: "admin-2",
          selfApproved: false,
        })}
        staff={STAFF}
        canSubmit={false}
        canDecide={false}
        isRejecting={false}
        isBusy={false}
        rejectReason=""
        {...rowHandlers}
      />,
    );
    expect(html).not.toContain(SELF_APPROVED_COPY);
  });
});

describe("SDConductNoteRow — selfApproved annotation (AC-008.3) + lock notice (AC-007.4)", () => {
  const conductHandlers = { ...rowHandlers, onOpenSetDialog: vi.fn() };

  it("renders the annotation alongside the permanent lock notice", () => {
    const html = render(
      <SDConductNoteRow
        note={note()}
        staff={STAFF}
        canSubmit={false}
        canDecide={false}
        canEdit={false}
        isLocked={true}
        isRejecting={false}
        isBusy={false}
        rejectReason=""
        {...conductHandlers}
      />,
    );
    expect(html).toContain(SELF_APPROVED_COPY);
    expect(html).toContain(messages.staffDiscipline.errors.locked);
  });

  it("renders NO edit trigger at all for an APPROVED (locked) note — not a disabled one", () => {
    const html = render(
      <SDConductNoteRow
        note={note()}
        staff={STAFF}
        canSubmit={false}
        canDecide={false}
        // Even if a caller wrongly passed canEdit, isLocked wins structurally.
        canEdit={true}
        isLocked={true}
        isRejecting={false}
        isBusy={false}
        rejectReason=""
        {...conductHandlers}
      />,
    );
    expect(html).toContain(messages.staffDiscipline.errors.locked);
    expect(html).not.toContain("<button");
  });

  it("renders the edit trigger for a DRAFT note (not locked)", () => {
    const html = render(
      <SDConductNoteRow
        note={note({
          state: "DRAFT",
          approverMemberId: undefined,
          selfApproved: false,
        })}
        staff={STAFF}
        canSubmit={true}
        canDecide={false}
        canEdit={true}
        isLocked={false}
        isRejecting={false}
        isBusy={false}
        rejectReason=""
        {...conductHandlers}
      />,
    );
    expect(html).toContain("<button");
    expect(html).not.toContain(messages.staffDiscipline.errors.locked);
    expect(html).not.toContain(SELF_APPROVED_COPY);
  });
});
