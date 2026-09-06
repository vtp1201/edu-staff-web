import type { Decorator } from "@storybook/nextjs-vite";
import { useEffect } from "react";

/**
 * Renders a story in dark mode by putting the real `.dark` class on `<html>`.
 *
 * `globals: { theme: "dark" }` (addon-themes) only works in the Storybook UI —
 * story globals are NOT applied by the vitest browser runner, so a story that
 * relies on them renders LIGHT in `vitest.storybook.mts` and proves nothing
 * (US-E24.12). Putting the class on `<html>` also covers portalled content
 * (dropdown/dialog), which renders outside the story canvas.
 */
export const withDarkTheme: Decorator = (Story) => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);
  return <Story />;
};
