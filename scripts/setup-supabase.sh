#!/usr/bin/env bash
set -euo pipefail

# Configure Supabase + Vercel for Noor.
# Usage: ./scripts/setup-supabase.sh
#
# You will be prompted for three values from:
# Supabase Dashboard → Project Settings → API

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

read -r -p "NEXT_PUBLIC_SUPABASE_URL (https://xxxx.supabase.co): " SUPABASE_URL
read -r -p "NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON
read -r -p "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON" || -z "$SUPABASE_SERVICE" ]]; then
  echo "All three values are required."
  exit 1
fi

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=https://noor-nine-kohl.vercel.app
EOF

echo "Wrote .env.local"

add_vercel_env() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | npx vercel env add "$name" production preview development --force 2>/dev/null || \
    printf '%s' "$value" | npx vercel env add "$name" production --force
}

echo "Adding Vercel environment variables..."
add_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
add_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON"
add_vercel_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE"

echo "Done. Next steps:"
echo "1. Run supabase/setup.sql in Supabase SQL Editor"
echo "2. Run supabase/rls_policies.sql in Supabase SQL Editor"
echo "3. Run: npx vercel --prod --yes"
