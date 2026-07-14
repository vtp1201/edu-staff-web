import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PresenceState } from "@/features/messaging/domain/entities/presence";
import { PresenceDot, type PresenceDotSize } from "./presence-dot";

/**
 * US-E10.6 AC-10.6.1.9 / AC-10.6.2.7 / AC-10.6.4.10 — the presence dot must be a
 * static indicator: NO animation/transition CSS (it must never blink/pulse/fade,
 * NFR-002). Node-env static-markup assertion (no @testing-library) proving the
 * emitted class list carries no motion utility across every rendered state+size.
 */
const MOTION_RE = /transition|animate-|duration-|animate\b/;

const SIZES: PresenceDotSize[] = ["list", "header", "panel"];
const VISIBLE_STATES: PresenceState[] = ["online", "recent"];

describe("PresenceDot — no motion (static indicator)", () => {
  for (const presence of VISIBLE_STATES) {
    for (const size of SIZES) {
      it(`emits no animation/transition class for ${presence} @ ${size}`, () => {
        const html = renderToStaticMarkup(
          <PresenceDot presence={presence} size={size} label="status" />,
        );
        // Pull every class="…" chunk out of the static markup and assert none
        // carries a motion utility.
        const classChunks = [...html.matchAll(/class="([^"]*)"/g)].map(
          (m) => m[1],
        );
        expect(classChunks.length).toBeGreaterThan(0);
        for (const chunk of classChunks) {
          expect(chunk).not.toMatch(MOTION_RE);
        }
      });
    }
  }

  it("renders nothing for offline (no dot node to animate)", () => {
    const html = renderToStaticMarkup(
      <PresenceDot presence="offline" size="list" label="offline" />,
    );
    expect(html).toBe("");
  });
});
