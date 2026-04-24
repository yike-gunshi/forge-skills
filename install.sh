#!/bin/bash
# forge-cookbook install script
# Creates symlinks for Claude Code and Codex-compatible skill directories.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
CODEX_SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.agents/skills}"

TARGET="both"
ACTION="install"
DRY_RUN=0
FORCE=0

# All forge skills (subdirectories under skills/)
SKILLS=(
  forge-brainstorm forge-bugfix forge-deliver forge-design forge-design-impl
  forge-dev forge-doc-release forge-eng forge-fupan forge-prd
  forge-qa forge-review forge-ship forge-status
)

usage() {
  cat <<'USAGE'
Usage: ./install.sh [options]

Options:
  --target <claude|codex|both>  Install target. Default: both
                                claude -> ~/.claude/skills
                                codex  -> ~/.agents/skills
  --uninstall                   Remove forge symlinks from the selected target
  --status                      Show install status for the selected target
  --dry-run                     Print actions without changing files
  --force                       Replace non-symlink paths if they block install
  -h, --help                    Show this help

Environment overrides:
  CLAUDE_SKILLS_DIR             Default: ~/.claude/skills
  CODEX_SKILLS_DIR              Default: ~/.agents/skills
USAGE
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '  DRY-RUN:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --target)
        [ "$#" -ge 2 ] || die "--target requires a value"
        TARGET="$2"
        shift 2
        ;;
      --target=*)
        TARGET="${1#*=}"
        shift
        ;;
      --uninstall)
        ACTION="uninstall"
        shift
        ;;
      --status)
        ACTION="status"
        shift
        ;;
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      --force)
        FORCE=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  case "$TARGET" in
    claude|codex|both) ;;
    *) die "Unsupported target '$TARGET'. Use claude, codex, or both." ;;
  esac
}

target_dirs() {
  case "$TARGET" in
    claude) printf '%s\n' "$CLAUDE_SKILLS_DIR" ;;
    codex) printf '%s\n' "$CODEX_SKILLS_DIR" ;;
    both)
      printf '%s\n' "$CLAUDE_SKILLS_DIR"
      printf '%s\n' "$CODEX_SKILLS_DIR"
      ;;
  esac
}

validate_sources() {
  [ -f "$SCRIPT_DIR/SKILL.md" ] || die "Root SKILL.md not found: $SCRIPT_DIR/SKILL.md"
  for skill in "${SKILLS[@]}"; do
    [ -f "$SCRIPT_DIR/skills/$skill/SKILL.md" ] || die "Skill missing SKILL.md: $SCRIPT_DIR/skills/$skill"
  done
}

link_one() {
  src="$1"
  dst="$2"

  if [ -L "$dst" ]; then
    current="$(readlink "$dst" || true)"
    if [ "$current" = "$src" ]; then
      echo "  ok  $(basename "$dst") -> $src"
      return
    fi
    run rm "$dst"
  elif [ -e "$dst" ]; then
    if [ "$FORCE" -ne 1 ]; then
      die "$dst exists and is not a symlink. Re-run with --force if you want to replace it."
    fi
    run rm -rf "$dst"
  fi

  run ln -s "$src" "$dst"
  echo "  add $(basename "$dst") -> $src"
}

install_to_dir() {
  skills_dir="$1"
  echo "Installing forge skills into: $skills_dir"
  run mkdir -p "$skills_dir"

  link_one "$SCRIPT_DIR" "$skills_dir/forge"
  for skill in "${SKILLS[@]}"; do
    link_one "$SCRIPT_DIR/skills/$skill" "$skills_dir/$skill"
  done
}

remove_one() {
  dst="$1"
  if [ -L "$dst" ]; then
    run rm "$dst"
    echo "  remove $(basename "$dst")"
  elif [ -e "$dst" ]; then
    if [ "$FORCE" -eq 1 ]; then
      run rm -rf "$dst"
      echo "  remove $(basename "$dst") (forced)"
    else
      echo "  skip $(basename "$dst") (not a symlink)"
    fi
  else
    echo "  missing $(basename "$dst")"
  fi
}

uninstall_from_dir() {
  skills_dir="$1"
  echo "Uninstalling forge skills from: $skills_dir"
  remove_one "$skills_dir/forge"
  for skill in "${SKILLS[@]}"; do
    remove_one "$skills_dir/$skill"
  done
}

status_one() {
  src="$1"
  dst="$2"
  name="$(basename "$dst")"

  if [ -L "$dst" ]; then
    current="$(readlink "$dst" || true)"
    if [ "$current" = "$src" ]; then
      echo "  ok      $name -> $current"
    else
      echo "  drift   $name -> $current (expected $src)"
    fi
  elif [ -e "$dst" ]; then
    echo "  blocked $name exists but is not a symlink"
  else
    echo "  missing $name"
  fi
}

status_for_dir() {
  skills_dir="$1"
  echo "Status for: $skills_dir"
  status_one "$SCRIPT_DIR" "$skills_dir/forge"
  for skill in "${SKILLS[@]}"; do
    status_one "$SCRIPT_DIR/skills/$skill" "$skills_dir/$skill"
  done
}

parse_args "$@"
validate_sources

case "$ACTION" in
  install)
    for dir in $(target_dirs); do
      install_to_dir "$dir"
    done
    echo ""
    echo "Installed $(( ${#SKILLS[@]} + 1 )) forge skills for target: $TARGET"
    echo "Restart Codex / Claude Code, or open a new session, to refresh skill discovery."
    ;;
  uninstall)
    for dir in $(target_dirs); do
      uninstall_from_dir "$dir"
    done
    ;;
  status)
    for dir in $(target_dirs); do
      status_for_dir "$dir"
    done
    ;;
esac
