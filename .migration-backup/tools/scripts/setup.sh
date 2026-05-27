#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Setting up DeliveryOS development environment..."

command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Install via: corepack enable"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found."; exit 1; }

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required. Found: $(node --version)"
  exit 1
fi

echo "📦 Installing dependencies..."
cd "$ROOT_DIR" && pnpm install

echo "🔐 Setting up environment files..."
APPS=("customer-pwa" "vendor-pwa" "rider-pwa" "admin-panel")
for app in "${APPS[@]}"; do
  ENV_FILE="$ROOT_DIR/apps/$app/.env.local"
  EXAMPLE_FILE="$ROOT_DIR/apps/$app/.env.example"
  if [ ! -f "$ENV_FILE" ] && [ -f "$EXAMPLE_FILE" ]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    echo "  Created: apps/$app/.env.local"
  fi
done

SERVICES=("api-gateway" "auth-service")
for svc in "${SERVICES[@]}"; do
  ENV_FILE="$ROOT_DIR/services/$svc/.env"
  EXAMPLE_FILE="$ROOT_DIR/services/$svc/.env.example"
  if [ ! -f "$ENV_FILE" ] && [ -f "$EXAMPLE_FILE" ]; then
    cp "$EXAMPLE_FILE" "$ENV_FILE"
    echo "  Created: services/$svc/.env"
  fi
done

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  pnpm run dev           — Start all apps and services"
echo "  pnpm --filter @deliveryos/customer-pwa run dev  — Start customer PWA only"
echo "  docker compose -f infrastructure/docker/docker-compose.yml up -d  — Start databases"
