#!/bin/bash
# Prepare the claude-seo plugin runtime (Python venv + Chromium) in cloud sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cli=$(ls -d "$HOME"/.claude/plugins/cache/agricidaniel-claude-seo/claude-seo/*/scripts/claude-seo 2>/dev/null | sort -V | tail -1 || true)
if [ -z "$cli" ]; then
  echo "claude-seo plugin not installed yet; skipping runtime setup" >&2
  exit 0
fi

if ! "$cli" doctor --json 2>/dev/null | grep -q '"ready": true'; then
  "$cli" setup
fi
