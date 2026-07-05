import { describe, expect, it } from "vitest";
import {
  formatSendToastTime,
  resolveSendToastParams,
} from "./send-toast-params";

describe("resolveSendToastParams", () => {
  it("AC-E17.12-01: returns the contextual key + 4000ms when recipientCount is available", () => {
    const params = resolveSendToastParams(312, "14:35");
    expect(params).toEqual({
      key: "sendToastContext",
      values: { recipientCount: 312, time: "14:35" },
      duration: 4000,
    });
  });

  it("AC-E17.12-04: falls back to the generic key + 2000ms when recipientCount is undefined", () => {
    const params = resolveSendToastParams(undefined, "14:35");
    expect(params).toEqual({ key: "sendToast", duration: 2000 });
  });

  it("falls back to the generic key when recipientCount is 0 (no broken placeholder)", () => {
    const params = resolveSendToastParams(0, "14:35");
    expect(params).toEqual({ key: "sendToast", duration: 2000 });
  });
});

describe("formatSendToastTime", () => {
  it("FR-006: formats vi locale as 24h HH:mm", () => {
    const date = new Date(2026, 0, 1, 14, 35);
    expect(formatSendToastTime("vi", date)).toBe("14:35");
  });

  it("FR-006: formats en locale as 12h h:mm a", () => {
    const date = new Date(2026, 0, 1, 14, 35);
    expect(formatSendToastTime("en", date)).toBe("2:35 PM");
  });

  it("falls back to 24h vi format for an unknown locale", () => {
    const date = new Date(2026, 0, 1, 9, 5);
    expect(formatSendToastTime("fr", date)).toBe("09:05");
  });
});
