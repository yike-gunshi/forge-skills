#!/bin/bash
# forge-cookbook install script
# Creates symlinks in ~/.claude/skills/ pointing to this repo
# Usage: ./install.sh [--uninstall]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"

# All forge skills (subdirectories under skills/)
SKILLS=(
  forge-brainstorm forge-bugfix forge-deliver forge-design forge-design-impl
  forge-dev forge-doc-release forge-eng forge-fupan forge-prd
  forge-qa forge-review forge-ship
)

if [ "$1" = "--uninstall" ]; then
  echo "Uninstalling forge skills..."
  # Remove root forge symlink
  rm -f "$SKILLS_DIR/forge"
  # Remove all sub-skill symlinks
  for skill in "${SKILLS[@]}"; do
    rm -f "$SKILLS_DIR/$skill"
  done
  echo "Done. All forge symlinks removed."
  exit 0
fi

echo "Installing forge skills from: $SCRIPT_DIR"
mkdir -p "$SKILLS_DIR"

# 1. Root forge skill (SKILL.md at repo root)
if [ -L "$SKILLS_DIR/forge" ] || [ -e "$SKILLS_DIR/forge" ]; then
  rm -rf "$SKILLS_DIR/forge"
fi
ln -s "$SCRIPT_DIR" "$SKILLS_DIR/forge"
echo "  ✓ forge → $SCRIPT_DIR"

# 2. Sub-skills (each directory under skills/)
for skill in "${SKILLS[@]}"; do
  src="$SCRIPT_DIR/skills/$skill"
  dst="$SKILLS_DIR/$skill"
  if [ ! -d "$src" ]; then
    echo "  ⚠ $skill not found at $src, skipping"
    continue
  fi
  if [ -L "$dst" ] || [ -e "$dst" ]; then
    rm -rf "$dst"
  fi
  ln -s "$src" "$dst"
  echo "  ✓ $skill → $src"
done

echo ""
echo "Installed $(( ${#SKILLS[@]} + 1 )) forge skills."
echo "Run './install.sh --uninstall' to remove all symlinks."
