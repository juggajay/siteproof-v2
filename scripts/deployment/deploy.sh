#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT_DIR/apps/web"

echo "🚀 Starting SiteProof v2 deployment from $APP_DIR..."

if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found. Installing..."
  npm install -g vercel
fi

cd "$APP_DIR"

if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
  echo "❌ Missing NEXT_PUBLIC_SUPABASE_URL"
  echo "Please set the required environment variables before running this script:"
  echo "  export NEXT_PUBLIC_SUPABASE_URL=your-url"
  echo "  export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key"
  echo "  export SUPABASE_SERVICE_KEY=your-service-key"
  echo "  export TRIGGER_API_KEY=your-trigger-key"
  echo "  export TRIGGER_API_URL=https://api.trigger.dev"
  exit 1
fi

echo "📦 Deploying to Vercel..."
vercel --prod \
  --name siteproof-app \
  --yes \
  --env NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --env SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY" \
  --env TRIGGER_API_KEY="$TRIGGER_API_KEY" \
  --env TRIGGER_API_URL="$TRIGGER_API_URL"

echo "✅ Deployment complete!"
