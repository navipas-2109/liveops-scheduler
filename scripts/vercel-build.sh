#!/usr/bin/env bash
# Build on Vercel: apply migrations, load starting data, build the app.
#
# Migrations need a direct (unpooled) connection. Supabase setups give it as
# DIRECT_URL; Vercel's Neon integration names it DATABASE_URL_UNPOOLED.
set -euo pipefail

export DIRECT_URL="${DIRECT_URL:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}}"
if [ -z "${DATABASE_URL:-}" ] || [ -z "$DIRECT_URL" ]; then
  echo "DATABASE_URL is not set — connect a database to this Vercel project (Storage tab)." >&2
  exit 1
fi

npx prisma migrate deploy
npx prisma db seed
npx next build
