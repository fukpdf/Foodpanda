#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔨 Building all DeliveryOS packages..."
cd "$ROOT_DIR"

echo "📦 Building shared packages..."
pnpm --filter @deliveryos/shared-types run build
pnpm --filter @deliveryos/shared-utils run build
pnpm --filter @deliveryos/security-core run build
pnpm --filter @deliveryos/ui-system run build

echo "🖥️  Building services..."
pnpm --filter @deliveryos/api-gateway run build
pnpm --filter @deliveryos/auth-service run build

echo "🌐 Building apps..."
pnpm --filter @deliveryos/customer-pwa run build
pnpm --filter @deliveryos/vendor-pwa run build
pnpm --filter @deliveryos/rider-pwa run build
pnpm --filter @deliveryos/admin-panel run build

echo ""
echo "✅ All packages built successfully!"
