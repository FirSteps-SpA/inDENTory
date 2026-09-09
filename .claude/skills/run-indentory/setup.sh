#!/usr/bin/env bash
# Installs the headless Chromium browser + native libraries this skill's
# driver.mjs needs, without requiring root. Run once per container.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Downloading Chromium Headless Shell (Playwright)..."
npx --yes playwright install chromium

SHELL_BIN=$(find "$HOME/.cache/ms-playwright" -maxdepth 2 -type d -name 'chromium_headless_shell-*' 2>/dev/null | head -1)/chrome-headless-shell-linux64/chrome-headless-shell

if [ ! -x "$SHELL_BIN" ]; then
  echo "chrome-headless-shell binary not found at expected path — aborting." >&2
  exit 1
fi

LIB_DIR="$PWD/pw-libs/usr/lib/x86_64-linux-gnu"

if LD_LIBRARY_PATH="$LIB_DIR:${LD_LIBRARY_PATH:-}" ldd "$SHELL_BIN" 2>/dev/null | grep -q "not found"; then
  echo "==> Missing shared libraries detected (expected in a bare container)."
  echo "    'playwright install --with-deps' needs root/sudo, which this"
  echo "    container doesn't have — fetching just the .deb packages with"
  echo "    'apt-get download' (works unprivileged) and extracting them"
  echo "    locally instead."
  mkdir -p pw-libs/.debs
  (
    cd pw-libs/.debs
    # Package names verified against Ubuntu 24.04 (noble) — see SKILL.md
    # Gotchas if apt-get can't find one of these on a different base image.
    apt-get download libnspr4 libnss3 libasound2t64
  )
  for f in pw-libs/.debs/*.deb; do
    dpkg-deb -x "$f" pw-libs
  done
  rm -rf pw-libs/.debs
  echo "==> Extracted libraries to pw-libs/usr/lib/x86_64-linux-gnu/"
fi

remaining=$(LD_LIBRARY_PATH="$LIB_DIR:${LD_LIBRARY_PATH:-}" ldd "$SHELL_BIN" 2>/dev/null | grep "not found" || true)
if [ -n "$remaining" ]; then
  echo "Still missing after extraction:" >&2
  echo "$remaining" >&2
  exit 1
fi

echo "==> Setup complete. Try:"
echo "    node .claude/skills/run-indentory/driver.mjs <<< 'nav http://localhost:5173'"
