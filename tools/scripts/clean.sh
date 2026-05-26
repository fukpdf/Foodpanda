#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🧹 Cleaning build artifacts..."

find "$ROOT_DIR" -type d \( \
  -name ".next" \
  -o -name "dist" \
  -o -name ".turbo" \
  -o -name "coverage" \
  -o -name ".tsbuildinfo" \
\) -not -path "*/node_modules/*" | while read -r dir; do
  echo "  Removing: $dir"
  rm -rf "$dir"
done

find "$ROOT_DIR" -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete

echo "✅ Clean complete."
