import { describe, expect, it } from "vitest";
import { checkRules, strengthLevel, strengthScore } from "./password-strength";

describe("password-strength", () => {
  it("flags each satisfied rule", () => {
    expect(checkRules("Abcdef1!")).toEqual({
      length: true,
      upper: true,
      number: true,
      special: true,
    });
    expect(checkRules("abc")).toEqual({
      length: false,
      upper: false,
      number: false,
      special: false,
    });
  });

  it("scores 0–4 by satisfied rules", () => {
    expect(strengthScore("")).toBe(0);
    expect(strengthScore("abcdefgh")).toBe(1); // length only
    expect(strengthScore("Abcdefgh")).toBe(2); // length + upper
    expect(strengthScore("Abcdefg1")).toBe(3); // + number
    expect(strengthScore("Abcdef1!")).toBe(4); // + special
  });

  it("maps score to level", () => {
    expect(strengthLevel("")).toBe("empty");
    expect(strengthLevel("abcdefgh")).toBe("weak");
    expect(strengthLevel("Abcdefg1")).toBe("fair");
    expect(strengthLevel("Abcdef1!")).toBe("strong");
  });
});
