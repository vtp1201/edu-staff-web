import { AlertTriangle, CalendarX } from "lucide-react";
import { describe, expect, it } from "vitest";
import type { Invitation } from "../../domain/entities/invitation.entity";
import {
  buildCountdown,
  buildRowVM,
  type CountdownLabels,
} from "./build-row-vm";

const NOW = new Date("2026-07-18T00:00:00Z").getTime();
const DAY = 86_400_000;
const iso = (offsetDays: number) =>
  new Date(NOW + offsetDays * DAY).toISOString();

const labels: CountdownLabels = {
  daysLeft: (n) => `Còn ${n} ngày`,
  expiredOn: (d) => `Hết hạn ${d}`,
  notApplicable: "—",
  formatDate: (i) => i.slice(0, 10),
};

describe("buildCountdown (UC-007)", () => {
  it("normal: pending ≥3 days → daysLeft text, no icon (AC-007.1)", () => {
    const c = buildCountdown("pending", iso(8), NOW, labels);
    expect(c.variant).toBe("normal");
    expect(c.text).toBe("Còn 8 ngày");
    expect(c.icon).toBeUndefined();
  });

  it("urgent: pending <3 days → bold text + AlertTriangle icon (AC-007.2)", () => {
    const c = buildCountdown("pending", iso(2), NOW, labels);
    expect(c.variant).toBe("urgent");
    expect(c.icon).toBe(AlertTriangle);
  });

  it("expired: muted text + CalendarX icon (AC-007.3)", () => {
    const c = buildCountdown("expired", iso(-5), NOW, labels);
    expect(c.variant).toBe("expired");
    expect(c.icon).toBe(CalendarX);
    expect(c.text).toContain("Hết hạn");
  });

  it("accepted/revoked → em-dash, no icon (AC-007.4)", () => {
    expect(buildCountdown("accepted", iso(-1), NOW, labels)).toEqual({
      variant: "na",
      text: "—",
    });
    expect(buildCountdown("revoked", iso(-1), NOW, labels)).toEqual({
      variant: "na",
      text: "—",
    });
  });
});

describe("buildRowVM", () => {
  const inv: Invitation = {
    id: "inv-1",
    email: "lan@x.com",
    role: "teacher",
    status: "pending",
    invitedBy: "Admin",
    sentAt: iso(-6),
    expiresAt: iso(8),
  };

  it("gates actions by status (pending → copyLink + revoke, not resend)", () => {
    const vm = buildRowVM(inv, NOW, rowLabels, false);
    expect(vm.actions).toEqual({ copyLink: true, resend: false, revoke: true });
  });

  it("gates resend on expired only", () => {
    const vm = buildRowVM({ ...inv, status: "expired" }, NOW, rowLabels, false);
    expect(vm.actions).toEqual({
      copyLink: false,
      resend: true,
      revoke: false,
    });
  });

  it("passes through isRowMutating and resolved labels", () => {
    const vm = buildRowVM(inv, NOW, rowLabels, true);
    expect(vm.isRowMutating).toBe(true);
    expect(vm.roleLabel).toBe("Giáo viên");
    expect(vm.statusLabel).toBe("Chờ chấp nhận");
  });
});

const rowLabels = {
  roleLabelOf: () => "Giáo viên",
  statusLabelOf: () => "Chờ chấp nhận",
  sentAtLabelOf: (i: string) => i.slice(0, 10),
  countdown: labels,
};
