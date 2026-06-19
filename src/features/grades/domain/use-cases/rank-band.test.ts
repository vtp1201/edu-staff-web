import { describe, expect, it } from "vitest";
import { getRankBand } from "./rank-band";

describe("getRankBand", () => {
  it("returns null for a null average", () => {
    expect(getRankBand(null)).toBeNull();
  });

  it("classifies xuat-sac at >= 9.5", () => {
    expect(getRankBand(9.5)).toBe("xuat-sac");
    expect(getRankBand(10)).toBe("xuat-sac");
  });

  it("classifies gioi in [8.0, 9.5)", () => {
    expect(getRankBand(8.0)).toBe("gioi");
    expect(getRankBand(9.4)).toBe("gioi");
  });

  it("classifies kha in [6.5, 8.0)", () => {
    expect(getRankBand(6.5)).toBe("kha");
    expect(getRankBand(7.9)).toBe("kha");
  });

  it("classifies trung-binh in [5.0, 6.5)", () => {
    expect(getRankBand(5.0)).toBe("trung-binh");
    expect(getRankBand(6.4)).toBe("trung-binh");
  });

  it("classifies yeu below 5.0", () => {
    expect(getRankBand(4.9)).toBe("yeu");
    expect(getRankBand(0)).toBe("yeu");
  });
});
