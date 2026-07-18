import { describe, expect, it } from "vitest";
import type { TenantAccentTone } from "@/components/shared/tenant-card/tenant-card.i-vm";
import { resolveTenantDisplay } from "./tenant-display.mock";

const TONES: TenantAccentTone[] = [
  "primary",
  "success",
  "warning",
  "info",
  "purple",
  "teal",
];

describe("resolveTenantDisplay", () => {
  it("returns the curated display fields for a known tenantId", () => {
    const d = resolveTenantDisplay("tenant-acme");
    expect(d.tenantName).toBe("THPT Chu Văn An");
    expect(d.address.length).toBeGreaterThan(0);
    expect(TONES).toContain(d.logoColor);
  });

  it("falls back deterministically for an unknown tenantId (same input → same output)", () => {
    const a = resolveTenantDisplay("00000000-unknown-tenant-uuid");
    const b = resolveTenantDisplay("00000000-unknown-tenant-uuid");
    expect(a).toEqual(b);
    // fallback still yields a valid closed-enum tone (never a raw hex)
    expect(TONES).toContain(a.logoColor);
    // no invented display name — the id itself is the fallback label
    expect(a.tenantName).toBe("00000000-unknown-tenant-uuid");
  });

  it("spreads different unknown ids across the tone enum (not a constant)", () => {
    const tones = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"].map(
        (id) => resolveTenantDisplay(id).logoColor,
      ),
    );
    // deterministic hash should land on more than one tone across 12 ids
    expect(tones.size).toBeGreaterThan(1);
  });

  it("never returns a raw hex/color string as logoColor", () => {
    for (const id of ["x", "y", "z", "tenant-acme", "tenant-beta"]) {
      expect(resolveTenantDisplay(id).logoColor).not.toMatch(/^#|rgb/i);
    }
  });
});
