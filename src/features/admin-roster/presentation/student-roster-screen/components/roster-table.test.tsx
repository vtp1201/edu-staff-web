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
    code: "HS25001",
    name: "Nguyễn Văn An",
    dob: "01/01/2010",
    gender: "M",
    status: "active",
  },
  {
    id: "HS25002",
    code: "HS25002",
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

/**
 * Real-mode degradation (US-E18.35). `code`/`name`/`dob`/`gender` are optional
 * on the entity: a student may legitimately have no dob/gender recorded
 * (ADR-0122), no core/IAM contract carries a student CODE at all, and the IAM
 * batch lookup may not resolve a member. None of that is an error — each cell
 * must show an honest placeholder, and none may ever show a raw member uuid.
 */
describe("RosterTable — missing per-student fields render placeholders", () => {
  const degraded: RosterStudent[] = [
    // Nothing resolved at all (worst case: IAM lookup degraded).
    { id: "8f14e45f-ceea-467a-9d0b-2c1a4b9e7d31", status: "active" },
    // Resolved name, PII not filled in by the student.
    {
      id: "b2c3d4e5-0000-4444-8888-111122223333",
      name: "Lê Thị Cẩm",
      status: "active",
    },
  ];

  it("shows the sr-announced placeholder instead of an empty or fabricated cell", () => {
    const html = render({ roster: degraded, readOnly: true });

    // The em dash is decorative; the meaning is in the sr-only text.
    expect(html).toContain(t.table.notProvided);
    expect(html).toContain("—");
  });

  it("never prints the raw member uuid — not as the code, not as the name", () => {
    const html = render({ roster: degraded, readOnly: true });

    expect(html).not.toContain("8f14e45f-ceea-467a-9d0b-2c1a4b9e7d31");
    expect(html).not.toContain("b2c3d4e5-0000-4444-8888-111122223333");
  });

  it("falls back to a named placeholder for an unresolved student, keeping the row usable", () => {
    const html = render({ roster: degraded, readOnly: true });

    expect(html).toContain(t.table.unknownName);
    // The resolved sibling still renders normally.
    expect(html).toContain("Lê Thị Cẩm");
  });

  it("labels the remove control with the placeholder name for the admin caller (never a uuid)", () => {
    const html = render({ roster: degraded });

    expect(html).toContain(
      `${t.table.removeFromClass} — ${t.table.unknownName}`,
    );
    expect(html).not.toContain("8f14e45f-ceea-467a-9d0b-2c1a4b9e7d31");
  });

  it('renders IAM "OTHER" as its own badge — never coerced into Nam/Nữ', () => {
    const html = render({
      roster: [{ id: "s-1", name: "Trần An", gender: "O", status: "active" }],
      readOnly: true,
    });

    expect(html).toContain(`aria-label="${t.table.genderOther}"`);
    expect(html).not.toContain(`aria-label="${t.table.genderMale}"`);
    expect(html).not.toContain(`aria-label="${t.table.genderFemale}"`);
  });
});
