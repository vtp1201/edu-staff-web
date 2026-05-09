#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , componentDir, componentName, pascal] = process.argv;

if (!componentDir || !componentName || !pascal) {
  console.error(
    "Usage: bun scripts/generate-story.ts <dir> <name> <PascalName>",
  );
  process.exit(1);
}

const filePath = join(componentDir, `${componentName}.tsx`);
const content = readFileSync(filePath, "utf-8");

// ─── Extract exported PascalCase names ───────────────────────────────────────

function extractExports(src: string): string[] {
  const names = new Set<string>();

  for (const m of src.matchAll(
    /export\s+(?:function|const|class)\s+([A-Z]\w*)/g,
  )) {
    names.add(m[1]);
  }

  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (/^[A-Z]/.test(name)) names.add(name);
    }
  }

  return [...names];
}

// ─── Story render generator ───────────────────────────────────────────────────

const SKIP = [
  "Portal",
  "Overlay",
  "Arrow",
  "ScrollUpButton",
  "ScrollDownButton",
  "Thumb",
  "Track",
  "Range",
];
const _LEVEL1 = [
  "Header",
  "Body",
  "Content",
  "Footer",
  "Trigger",
  "Group",
  "Separator",
  "List",
];
const _IN_HEADER = ["Title", "Description", "Action", "Icon"];
const _IN_CONTENT = ["Item", "Label", "Value"];

function suffix(name: string, main: string) {
  return name.startsWith(main) ? name.slice(main.length) : "";
}

function find(subs: string[], main: string, sfx: string) {
  return subs.find((s) => suffix(s, main) === sfx);
}

function generateRender(main: string, subs: string[]): string {
  const usable = subs.filter((s) => !SKIP.some((sk) => suffix(s, main) === sk));

  const header = find(usable, main, "Header");
  const content = find(usable, main, "Content") ?? find(usable, main, "Body");
  const footer = find(usable, main, "Footer");
  const trigger = find(usable, main, "Trigger");
  const separator = find(usable, main, "Separator");
  const group = find(usable, main, "Group");

  const title = find(usable, main, "Title");
  const description = find(usable, main, "Description");
  const action = find(usable, main, "Action");
  const item = find(usable, main, "Item");
  const label = find(usable, main, "Label");
  const value = find(usable, main, "Value");

  const i = (n: number) => "  ".repeat(n + 2);
  const lines: string[] = [];

  lines.push(`${i(0)}<${main}>`);

  if (trigger) {
    lines.push(`${i(1)}<${trigger}>`);
    if (value) {
      lines.push(`${i(2)}<${value} placeholder="Select..." />`);
    } else {
      lines.push(`${i(2)}Open`);
    }
    lines.push(`${i(1)}</${trigger}>`);
  }

  if (header) {
    lines.push(`${i(1)}<${header}>`);
    if (title) lines.push(`${i(2)}<${title}>Title</${title}>`);
    if (description)
      lines.push(`${i(2)}<${description}>Description</${description}>`);
    if (action) lines.push(`${i(2)}<${action}>Action</${action}>`);
    lines.push(`${i(1)}</${header}>`);
  }

  if (content) {
    lines.push(`${i(1)}<${content}>`);
    if (group) {
      lines.push(`${i(2)}<${group}>`);
      if (label) lines.push(`${i(3)}<${label}>Group Label</${label}>`);
      if (item) {
        lines.push(`${i(3)}<${item} value="item-1">Item 1</${item}>`);
        lines.push(`${i(3)}<${item} value="item-2">Item 2</${item}>`);
      }
      lines.push(`${i(2)}</${group}>`);
    } else if (item) {
      lines.push(`${i(2)}<${item} value="item-1">Item 1</${item}>`);
      lines.push(`${i(2)}<${item} value="item-2">Item 2</${item}>`);
    } else {
      lines.push(`${i(2)}<p>Content</p>`);
    }
    lines.push(`${i(1)}</${content}>`);
  } else if (!trigger && !header && !footer) {
    for (const sub of usable.slice(0, 3)) {
      lines.push(`${i(1)}<${sub} />`);
    }
  }

  if (separator) lines.push(`${i(1)}<${separator} />`);

  if (footer) {
    lines.push(`${i(1)}<${footer}>`);
    lines.push(
      `${i(2)}<p className="text-sm text-muted-foreground">Footer</p>`,
    );
    lines.push(`${i(1)}</${footer}>`);
  }

  lines.push(`${i(0)}</${main}>`);
  return lines.join("\n");
}

// ─── Build story file ─────────────────────────────────────────────────────────

const allExports = extractExports(content);
const subComponents = allExports.filter(
  (e) => e !== pascal && e.startsWith(pascal),
);

let storyContent: string;

if (subComponents.length === 0) {
  storyContent = `import type { Meta, StoryObj } from "@storybook/react";
import { ${pascal} } from "./${componentName}";

const meta = {
  title: "UI/${pascal}",
  component: ${pascal},
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ${pascal}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
`;
} else {
  const importNames = [pascal, ...subComponents].join(",\n  ");
  const renderBody = generateRender(pascal, subComponents);

  storyContent = `import type { Meta, StoryObj } from "@storybook/react";
import {
  ${importNames},
} from "./${componentName}";

const meta = {
  title: "UI/${pascal}",
  component: ${pascal},
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ${pascal}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
${renderBody}
  ),
};
`;
}

const outPath = join(componentDir, `${componentName}.stories.tsx`);
writeFileSync(outPath, storyContent);
console.log(`✓ Created → ${outPath}`);
