#!/usr/bin/env bash
set -e

COMPONENT="$1"

if [ -z "$COMPONENT" ]; then
  echo "❌ Usage: bun ui:add <component-name>"
  exit 1
fi

UI_DIR="src/components/ui"
SRC_FILE="$UI_DIR/$COMPONENT.tsx"
COMPONENT_DIR="$UI_DIR/$COMPONENT"

# Convert kebab-case to PascalCase (macOS + Linux)
PASCAL=$(echo "$COMPONENT" | awk -F'-' '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' OFS='')

# Run shadcn add
bunx shadcn@latest add "$COMPONENT"

# If shadcn already created a folder, just add story if missing
if [ -d "$COMPONENT_DIR" ]; then
  echo "ℹ️  $COMPONENT already a folder"
  if [ ! -f "$COMPONENT_DIR/$COMPONENT.stories.tsx" ]; then
    bun scripts/generate-story.ts "$COMPONENT_DIR" "$COMPONENT" "$PASCAL"
    bunx biome check --write "$COMPONENT_DIR/" 2>/dev/null || true
  fi
  exit 0
fi

if [ ! -f "$SRC_FILE" ]; then
  echo "❌ Expected $SRC_FILE not found after shadcn add"
  exit 1
fi

# Organize into folder
mkdir -p "$COMPONENT_DIR"
mv "$SRC_FILE" "$COMPONENT_DIR/$COMPONENT.tsx"
echo "✓ Moved  → $COMPONENT_DIR/$COMPONENT.tsx"

# index.ts
echo "export * from \"./$COMPONENT\";" > "$COMPONENT_DIR/index.ts"
echo "✓ Created → $COMPONENT_DIR/index.ts"

# Smart story generator
bun scripts/generate-story.ts "$COMPONENT_DIR" "$COMPONENT" "$PASCAL"

# Format everything
bunx biome check --write "$COMPONENT_DIR/" 2>/dev/null || true
echo "✓ Formatted"

echo ""
echo "✅ $PASCAL ready:"
echo "   $COMPONENT_DIR/"
echo "   ├── $COMPONENT.tsx"
echo "   ├── index.ts"
echo "   └── $COMPONENT.stories.tsx"
