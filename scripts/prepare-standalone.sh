#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Preparing standalone runtime assets..."

if [ ! -d ".next/standalone" ]; then
  echo "ERROR: .next/standalone not found. Run 'npm run build' first."
  exit 1
fi

if [ ! -d ".next/static" ]; then
  echo "ERROR: .next/static not found. Build output is incomplete."
  exit 1
fi

mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static

if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -R public .next/standalone/public
fi

STATIC_FILES=$(find .next/standalone/.next/static -type f | wc -l | tr -d ' ')
if [ "$STATIC_FILES" -eq 0 ]; then
  echo "ERROR: No files copied into .next/standalone/.next/static"
  exit 1
fi

echo "Standalone assets ready. Files in .next/standalone/.next/static: $STATIC_FILES"
