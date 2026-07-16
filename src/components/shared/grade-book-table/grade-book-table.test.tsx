import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  GradeBook,
  GradeBookRow,
} from "@/features/grades/domain/entities/grade-book.entity";
import { GradeBookTable } from "./grade-book-table";
import type { GradeBookTableVM } from "./grade-book-table.i-vm";

/**
 * DOM-attribute proof for US-E17.2 (mobile scroll + sticky column a11y).
 *
 * The repo's vitest env is `node` (no jsdom / @testing-library) — UI flows are
 * proven in Storybook browser mode. Here we render the component to static
 * markup via react-dom/server, which runs in node and lets us assert the exact
 * attributes/classes/styles the story mandates (role/aria-label, iOS momentum
 * style, min-width, sticky-cell right border + z-index).
 */

const SCHEME = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  termId: "HK1",
  columns: [
    {
      id: "tx",
      type: "TX" as const,
      label: "Thường xuyên",
      count: 2,
      weight: 20,
    },
    { id: "gk", type: "GK" as const, label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK" as const, label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

const ROWS: GradeBookRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: { tx: 8, gk: 8, ck: 9 },
    average: 8.5,
    conductGrade: "Tot",
    publishStatus: "PUBLISHED",
  },
];

function book(rows: GradeBookRow[]): GradeBook {
  return {
    classSubjectId: "cs-001",
    term: "HK1",
    className: "10A1",
    subjectName: "Toán",
    scheme: SCHEME,
    rows,
    publishMode: "SELF_PUBLISH",
  };
}

function renderTable(): string {
  // Spread props so Biome's useValidAriaRole doesn't read the VM's `role`
  // (viewer role) as a JSX ARIA role attribute.
  const props: GradeBookTableVM = {
    gradeBook: book(ROWS),
    role: "student",
    isPublished: true,
  };
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={messages}>
      <GradeBookTable {...props} />
    </NextIntlClientProvider>,
  );
}

// The scroll wrapper is the div carrying overflow-x-auto.
function scrollWrapper(html: string): string {
  const match = html.match(/<div[^>]*overflow-x-auto[^>]*>/);
  if (!match) throw new Error("scroll wrapper not found");
  return match[0];
}

describe("GradeBookTable — mobile scroll + sticky column a11y (US-E17.2)", () => {
  it("FR-1/FR-4/A11Y-002: scroll region is named via aria-labelledby → the caption reusing gradeBook.tableCaption (no duplicate string)", () => {
    const html = renderTable();
    const wrapper = scrollWrapper(html);
    expect(wrapper).toContain('role="region"');
    // A11Y-001: focusable so keyboard users can arrow/PageDown-scroll it.
    expect(wrapper).toContain('tabindex="0"');
    // A11Y-002: no redundant aria-label — the name comes from the caption via id.
    expect(wrapper).not.toContain("aria-label=");
    const labelledBy = wrapper.match(/aria-labelledby="([^"]+)"/);
    expect(labelledBy).not.toBeNull();
    const captionId = labelledBy?.[1] as string;
    // Resolve the id reference: the referenced <caption> text = tableCaption.
    const caption = html.match(
      new RegExp(`<caption[^>]*id="${captionId}"[^>]*>([^<]*)</caption>`),
    );
    expect(caption?.[1]).toBe(messages.gradeBook.tableCaption);
    expect(messages.gradeBook.tableCaption.length).toBeGreaterThan(0);
  });

  it("FR-1/AC-10: iOS momentum scroll style sits on the overflow wrapper", () => {
    const wrapper = scrollWrapper(renderTable());
    // React serializes WebkitOverflowScrolling → -webkit-overflow-scrolling.
    expect(wrapper).toContain("-webkit-overflow-scrolling:touch");
  });

  it("FR-2/AC-11: the <table> carries min-w-[640px]", () => {
    const table = renderTable().match(/<table[^>]*>/);
    expect(table?.[0]).toContain("min-w-[640px]");
  });

  it("FR-3/AC-07/AC-08: every sticky first-column cell has right border + z-[1]", () => {
    const html = renderTable();
    const stickyCells = html.match(/<th[^>]*sticky left-0[^>]*>/g) ?? [];
    // One sticky <th scope=col> header + one sticky <th scope=row> per data row.
    expect(stickyCells.length).toBeGreaterThanOrEqual(2);
    for (const cell of stickyCells) {
      expect(cell).toContain("border-r");
      // US-E17.5 (AC-03.3/03.4): explicit edu-* tokens so the separator/bg
      // stay literally `var(--edu-border)` / `var(--edu-card)` regardless of
      // shadcn semantic aliasing (which diverges in dark mode).
      expect(cell).toContain("border-edu-border");
      expect(cell).toContain("bg-edu-card");
      expect(cell).toContain("z-[1]");
    }
  });
});

/**
 * US-E17.11 — every data-row cell meets the WCAG 2.5.5 / 2.5.8 44px touch
 * target floor. Header (<thead>) cells are out of scope (not tappable). We
 * isolate the <tbody> markup and assert `min-h-[44px]` on the row header and
 * every data <td>.
 */
describe("GradeBookTable — touch target 44px (US-E17.11)", () => {
  // Extract only the <tbody>…</tbody> slice so <thead> cells are excluded.
  function tbody(html: string): string {
    const match = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    if (!match) throw new Error("tbody not found");
    return match[1];
  }

  it("AC-E17.11-01: the data-row header (<th scope=row>) has min-h-[44px]", () => {
    const body = tbody(renderTable());
    const rowHeader = body.match(/<th[^>]*scope="row"[^>]*>/);
    expect(rowHeader).not.toBeNull();
    expect(rowHeader?.[0]).toContain("min-h-[44px]");
  });

  it("AC-E17.11-01: every data <td> has min-h-[44px]", () => {
    const body = tbody(renderTable());
    const cells = body.match(/<td[^>]*>/g) ?? [];
    // score columns (3) + average + conduct = 5 cells in this fixture.
    expect(cells.length).toBeGreaterThanOrEqual(5);
    for (const cell of cells) {
      expect(cell).toContain("min-h-[44px]");
    }
  });
});
