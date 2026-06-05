import type { Meta, StoryObj } from "@storybook/react";

/**
 * Design System foundations — visual reference for tokens defined in
 * `src/app/tokens.css` (decision 0010). Source of truth: tokens.css +
 * `.claude/rules/design-system.md`. Do not hardcode values here that diverge
 * from tokens.css.
 */

type Swatch = { name: string; varName: string; hex: string; fg?: string };

const BRAND: Swatch[] = [
  { name: "primary", varName: "--edu-primary", hex: "#5D87FF", fg: "#fff" },
  { name: "primary-light", varName: "--edu-primary-light", hex: "#ECF2FF" },
  {
    name: "primary-dark",
    varName: "--edu-primary-dark",
    hex: "#4570EA",
    fg: "#fff",
  },
];

const STATUS: Swatch[] = [
  { name: "success", varName: "--edu-success", hex: "#13DEB9" },
  { name: "warning", varName: "--edu-warning", hex: "#FFAE1F", fg: "#2A3547" },
  { name: "error", varName: "--edu-error", hex: "#FA896B", fg: "#fff" },
  { name: "info", varName: "--edu-info", hex: "#539BFF", fg: "#fff" },
  { name: "purple", varName: "--edu-purple", hex: "#7B5EA7", fg: "#fff" },
  { name: "teal", varName: "--edu-teal", hex: "#00B8A9", fg: "#fff" },
];

const SURFACE: Swatch[] = [
  { name: "bg", varName: "--edu-bg", hex: "#F5F7FA" },
  { name: "card", varName: "--edu-card", hex: "#FFFFFF" },
  { name: "border", varName: "--edu-border", hex: "#E5EAF2" },
];

const TEXT: Swatch[] = [
  {
    name: "text-primary",
    varName: "--edu-text-primary",
    hex: "#2A3547",
    fg: "#fff",
  },
  {
    name: "text-secondary",
    varName: "--edu-text-secondary",
    hex: "#5A6A85",
    fg: "#fff",
  },
  {
    name: "text-muted",
    varName: "--edu-text-muted",
    hex: "#8898A9",
    fg: "#fff",
  },
];

const ROLES: Swatch[] = [
  {
    name: "teacher",
    varName: "--edu-role-teacher",
    hex: "#5D87FF",
    fg: "#fff",
  },
  { name: "principal", varName: "--edu-role-principal", hex: "#13DEB9" },
  {
    name: "student",
    varName: "--edu-role-student",
    hex: "#FFAE1F",
    fg: "#2A3547",
  },
  { name: "parent", varName: "--edu-role-parent", hex: "#7B5EA7", fg: "#fff" },
];

function SwatchGrid({ title, items }: { title: string; items: Swatch[] }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--edu-text-muted)",
          marginBottom: 10,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((s) => (
          <div
            key={s.varName}
            style={{
              border: "1px solid var(--edu-border)",
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--edu-card)",
            }}
          >
            <div
              style={{
                background: `var(${s.varName})`,
                color: s.fg ?? "var(--edu-text-primary)",
                height: 64,
                display: "flex",
                alignItems: "flex-end",
                padding: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {s.name}
            </div>
            <div
              style={{
                padding: "6px 8px",
                fontSize: 11,
                color: "var(--edu-text-muted)",
              }}
            >
              <div style={{ fontFamily: "ui-monospace, monospace" }}>
                {s.varName}
              </div>
              <div>{s.hex}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const meta: Meta = {
  title: "Design System/Foundations",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

export const Colors: Story = {
  render: () => (
    <div
      style={{
        padding: 24,
        background: "var(--edu-bg)",
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
      }}
    >
      <SwatchGrid title="Brand" items={BRAND} />
      <SwatchGrid title="Status" items={STATUS} />
      <SwatchGrid title="Surface" items={SURFACE} />
      <SwatchGrid title="Text" items={TEXT} />
      <SwatchGrid
        title="Role accent (decision 0013 — chỉ khác màu)"
        items={ROLES}
      />
    </div>
  ),
};

export const Typography: Story = {
  render: () => {
    const rows: {
      label: string;
      size: number;
      weight: number;
      color?: string;
      upper?: boolean;
    }[] = [
      { label: "page-title — Tổng quan", size: 22, weight: 800 },
      { label: "section-title — Điểm danh", size: 18, weight: 800 },
      { label: "card-title — Lớp 10A1", size: 15, weight: 700 },
      { label: "body — Nội dung mô tả bình thường", size: 14, weight: 400 },
      {
        label: "label — trạng thái",
        size: 12,
        weight: 700,
        color: "var(--edu-text-muted)",
        upper: true,
      },
      {
        label: "caption — 2 phút trước",
        size: 11,
        weight: 400,
        color: "var(--edu-text-muted)",
      },
      { label: "stat-value — 26", size: 26, weight: 800 },
    ];
    return (
      <div
        style={{
          padding: 24,
          background: "var(--edu-bg)",
          minHeight: "100vh",
          fontFamily: "var(--font-sans)",
          color: "var(--edu-text-primary)",
        }}
      >
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              fontSize: r.size,
              fontWeight: r.weight,
              color: r.color ?? "var(--edu-text-primary)",
              textTransform: r.upper ? "uppercase" : "none",
              letterSpacing: r.upper ? 1 : 0,
              marginBottom: 14,
            }}
          >
            {r.label}
          </div>
        ))}
      </div>
    );
  },
};

export const RadiusAndShadow: Story = {
  render: () => {
    const radii: { name: string; varName: string }[] = [
      { name: "btn 8", varName: "--edu-radius-btn" },
      { name: "card 12", varName: "--edu-radius-card" },
      { name: "role-icon 16", varName: "--edu-radius-role-icon" },
      { name: "badge full", varName: "--edu-radius-badge" },
      { name: "otp 10", varName: "--edu-radius-otp" },
    ];
    const shadows = [
      "--edu-shadow-card",
      "--edu-shadow-card-hover",
      "--edu-shadow-toggle",
    ];
    return (
      <div
        style={{
          padding: 24,
          background: "var(--edu-bg)",
          minHeight: "100vh",
          fontFamily: "var(--font-sans)",
        }}
      >
        <h3
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--edu-text-muted)",
            marginBottom: 10,
          }}
        >
          Radius
        </h3>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          {radii.map((r) => (
            <div
              key={r.varName}
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "var(--edu-text-muted)",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  background: "var(--edu-primary)",
                  borderRadius: `var(${r.varName})`,
                  marginBottom: 6,
                }}
              />
              {r.name}
            </div>
          ))}
        </div>
        <h3
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--edu-text-muted)",
            marginBottom: 10,
          }}
        >
          Shadow
        </h3>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {shadows.map((s) => (
            <div
              key={s}
              style={{
                width: 140,
                height: 80,
                background: "var(--edu-card)",
                borderRadius: "var(--edu-radius-card)",
                boxShadow: `var(${s})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "var(--edu-text-muted)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {s.replace("--edu-shadow-", "")}
            </div>
          ))}
        </div>
      </div>
    );
  },
};
