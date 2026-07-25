import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LinkAuditEntry } from "../../domain/entities/link-audit-entry.entity";
import { PLAuditTrailSection } from "./pl-audit-trail-section";

/**
 * ============================================================================
 * DEFENSE-IN-DEPTH PROOF — an "unlinked" entry NEVER renders a note line
 * UC-104 sc1 · `LinkAuditEntry.note` doc contract · QA DEF-1
 * ============================================================================
 *
 * Node-env static-markup assertions (no jsdom), mirroring the established
 * `sd-self-approved-note.test.tsx` pattern.
 *
 * The mock repository already normalises `note: action === "created" ? note : null`
 * at the DATA layer, so this is not reachable through the app today. That is
 * exactly why the render layer needs its own gate: suppression must hold **by
 * construction** here too, so a future repository (or a real BE payload that
 * echoes a note back on the unlink event) cannot leak note text onto an
 * unlinked row. The probe below deliberately forges the impossible entity
 * shape the data layer would never produce.
 */
const PROBE = "SHOULD_NOT_RENDER_PROBE";

const LABELS = {
  sectionTitle: "Lịch sử liên kết",
  loadingLabel: "Đang tải lịch sử",
  emptyTitle: "Chưa có lịch sử",
  emptyBody: "Các thay đổi sẽ xuất hiện ở đây.",
  errorMessage: "Không tải được lịch sử.",
  retryLabel: "Thử lại",
  notePrefix: "Ghi chú",
  actionLabel: { created: "Đã tạo", unlinked: "Đã hủy" },
} satisfies React.ComponentProps<typeof PLAuditTrailSection>["labels"];

function entry(over: Partial<LinkAuditEntry> = {}) {
  return {
    entryId: "ae-001",
    linkId: "pl-001",
    action: "created",
    actorId: "admin-1",
    actorName: "Nguyễn Thị Hương",
    occurredAt: "2026-07-20T08:00:00Z",
    note: null,
    ...over,
  } satisfies LinkAuditEntry;
}

function render(entries: LinkAuditEntry[]) {
  return renderToStaticMarkup(
    <PLAuditTrailSection
      status="success"
      entries={entries}
      formatTimestamp={() => "20/07/2026 15:00"}
      onRetry={vi.fn()}
      labels={LABELS}
    />,
  );
}

describe("PLAuditTrailSection — note suppression on 'unlinked' (UC-104 sc1)", () => {
  it("does NOT render a note line for an 'unlinked' entry even when note is non-null", () => {
    const html = render([entry({ action: "unlinked", note: PROBE })]);

    expect(html).not.toContain(PROBE);
    // The note-prefix label must be absent too — no empty "Ghi chú:" line.
    expect(html).not.toContain(LABELS.notePrefix);
    // The row itself still renders (only the note line is suppressed).
    expect(html).toContain(LABELS.actionLabel.unlinked);
  });

  it("still renders the note line for a 'created' entry (gate is action-scoped, not a blanket removal)", () => {
    const html = render([entry({ action: "created", note: "Phụ huynh ruột" })]);

    expect(html).toContain("Phụ huynh ruột");
    expect(html).toContain(LABELS.notePrefix);
  });

  it("renders no note line for a 'created' entry with a null note", () => {
    const html = render([entry({ action: "created", note: null })]);

    expect(html).not.toContain(LABELS.notePrefix);
    expect(html).toContain(LABELS.actionLabel.created);
  });

  it("suppresses the unlinked note while a sibling created note in the SAME list renders", () => {
    const html = render([
      entry({ entryId: "ae-002", action: "unlinked", note: PROBE }),
      entry({ entryId: "ae-001", action: "created", note: "Phụ huynh ruột" }),
    ]);

    expect(html).not.toContain(PROBE);
    expect(html).toContain("Phụ huynh ruột");
  });
});
