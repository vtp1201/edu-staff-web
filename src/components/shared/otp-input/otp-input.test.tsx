import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OtpInput } from "./otp-input";

// Node-env test (no DOM): assert static structure/a11y attributes. Interactive
// behaviour (auto-advance, backspace-to-previous) is covered by the Storybook
// play function in otp-input.stories.tsx (browser env).
function html(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

describe("OtpInput", () => {
  it("renders 6 cells inside a fieldset (implicit role=group)", () => {
    const markup = html(<OtpInput value="" onChange={() => {}} />);
    expect(markup.match(/<input/g)?.length).toBe(6);
    expect(markup).toContain("<fieldset");
  });

  it("exposes the group aria-label and per-digit aria-labels", () => {
    const markup = html(
      <OtpInput
        value=""
        onChange={() => {}}
        groupAriaLabel="Mã xác thực 6 chữ số"
        digitAriaLabel={(n) => `Chữ số thứ ${n}`}
      />,
    );
    expect(markup).toContain('aria-label="Mã xác thực 6 chữ số"');
    expect(markup).toContain('aria-label="Chữ số thứ 1"');
    expect(markup).toContain('aria-label="Chữ số thứ 6"');
  });

  it("fills each cell from the controlled value", () => {
    const markup = html(<OtpInput value="123" onChange={() => {}} />);
    expect(markup).toContain('value="1"');
    expect(markup).toContain('value="2"');
    expect(markup).toContain('value="3"');
  });

  it("sets aria-invalid + error tokens + describedby when error", () => {
    const markup = html(
      <OtpInput
        value=""
        onChange={() => {}}
        error
        describedById="ev-otp-err"
      />,
    );
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="ev-otp-err"');
    expect(markup).toContain("border-edu-error-dark");
    expect(markup).toContain("text-edu-error-text");
  });

  it("does not link describedby when there is no error", () => {
    const markup = html(
      <OtpInput value="" onChange={() => {}} describedById="ev-otp-err" />,
    );
    expect(markup).not.toContain("aria-describedby");
    expect(markup).not.toContain('aria-invalid="true"');
  });

  it("disables all cells when disabled", () => {
    const markup = html(
      <OtpInput value="123456" onChange={() => {}} disabled />,
    );
    expect(markup.match(/disabled=""/g)?.length).toBe(6);
  });

  it("puts autoComplete=one-time-code only on the first cell", () => {
    const markup = html(<OtpInput value="" onChange={() => {}} />);
    expect(markup.match(/autoComplete="one-time-code"/g)?.length).toBe(1);
  });
});
