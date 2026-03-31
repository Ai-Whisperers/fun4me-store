#!/bin/sh
set -e

echo "=============================================="
echo "Vete Platform - Starting up..."
echo "=============================================="
echo "Environment: ${NODE_ENV:-development}"
echo "Timezone: ${TZ:-UTC}"
echo "=============================================="

# Validate required environment variables
validate_env() {
    missing=""

    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        missing="$missing NEXT_PUBLIC_SUPABASE_URL"
    fi

    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        missing="$missing NEXT_PUBLIC_SUPABASE_ANON_KEY"
    fi

    if [ -n "$missing" ]; then
        echo "ERROR: Missing required environment variables:$missing"
        echo ""
        echo "This application requires Supabase Cloud."
        echo "Get credentials from: https://supabase.com/dashboard"
        exit 1
    fi

    echo "Environment validation passed."
}

# Run validation
validate_env

echo "Starting application..."
exec "$@"
