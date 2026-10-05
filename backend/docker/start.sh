#!/bin/sh
set -e

# Render injects RENDER_EXTERNAL_URL with the service's real public URL —
# config is re-read per request (nothing is config:cached here), so exporting
# it before boot is enough to make url()/asset() generate correct links.
if [ -n "$RENDER_EXTERNAL_URL" ]; then
  export APP_URL="$RENDER_EXTERNAL_URL"
fi

if [ -z "$APP_KEY" ]; then
  echo "APP_KEY is not set — generating one for this run (set it as a persistent env var instead)."
  export APP_KEY=$(php artisan key:generate --show)
fi

php artisan migrate --force
php artisan db:seed --force
php artisan db:seed --class='Database\Seeders\DemoSeeder' --force
php artisan storage:link || true

exec php artisan serve --host 0.0.0.0 --port "${PORT:-8080}"
