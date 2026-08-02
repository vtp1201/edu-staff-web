import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { RosterStudent } from "@/features/admin-roster/domain/entities/roster-student.entity";
import { RosterTable } from "./roster-table";

/**
 * `readOnly` variant proof (US-E13.10).
 *
 * The repo's vitest env is `node` (no jsdom / @testing-library) — UI flows are
 * proven in Storybook browser mode. Here we render to static markup via
 * `react-dom/server` and assert the exact DOM the read-only principal caller
 * must NOT contain: a control a keyboard/screen-reader user can reach but that
 * this role may never perform is a defect, not just a visual omission
 * (accessibility.md, packet AC-3).
 */

const t = messages.adminRoster;

const roster: RosterStudent[] = [
  {
    id: "HS25001",
    name: "Nguyễn Văn An",
    dob: "01/01/2010",
    gender: "M",
    status: "active",
  },
  {
    id: "HS25002",
    name: "Trần Thị Bình",
    dob: "02/02/2010",
    gender: "F",
    status: "transferred",
  },
];

/**
 * The two polarities are separate JSX call sites on purpose: `RosterTableProps`
 * is a union discriminated on `readOnly`, so the mutating caller MUST pass both
 * handlers and the read-only caller must not — a forgotten handler is a
 * compile error, and this helper is the proof of both shapes.
 */
function render(props: { roster: RosterStudent[]; readOnly?: boolean }) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      {props.readOnly ? (
        <RosterTable roster={props.roster} readOnly />
      ) : (
        <RosterTable
          roster={props.roster}
          onRequestUnenrollOne={() => {}}
          onRequestUnenrollMany={() => {}}
        />
      )}
    </NextIntlClientProvider>,
  );
}

describe("RosterTable — readOnly variant", () => {
  it("omits every mutation affordance when readOnly", () => {
    const html = render({ roster, readOnly: true });

    // Bulk-select: no checkbox role at all (header or row).
    expect(html).not.toContain('role="checkbox"');
    expect(html).not.toContain(t.table.selectAll);
    expect(html).not.toContain("Chọn học sinh");
    // Per-row remove + the bulk destructive action share this label.
    expect(html).not.toContain(t.table.removeFromClass);
    // Dead placeholder control — dropped rather than shipped visibly disabled.
    expect(html).not.toContain(t.table.exportCsv);
  });

  it("keeps the read-only data columns and search when readOnly", () => {
    const html = render({ roster, readOnly: true });

    expect(html).toContain(t.table.name);
    expect(html).toContain(t.table.studentId);
    expect(html).toContain(t.table.dob);
    expect(html).toContain(t.table.gender);
    expect(html).toContain(t.table.status);
    expect(html).toContain(t.table.searchPlaceholder);
    expect(html).toContain("Nguyễn Văn An");
    expect(html).toContain(t.status.transferred);
  });

  it("spans the no-match row across the reduced column count when readOnly", () => {
    const html = render({ roster: [], readOnly: true });

    // 8 columns minus the select + actions columns.
    expect(html).toContain('colSpan="6"');
    expect(html).toContain(t.table.noMatch);
  });

  it("keeps every mutation affordance for the default (admin) caller", () => {
    const html = render({ roster });

    expect(html).toContain('role="checkbox"');
    expect(html).toContain(t.table.selectAll);
    expect(html).toContain(t.table.removeFromClass);
    expect(html).toContain(t.table.exportCsv);
  });

  it("spans the no-match row across all 8 columns for the default caller", () => {
    const html = render({ roster: [] });

    expect(html).toContain('colSpan="8"');
  });
});
