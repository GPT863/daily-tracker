#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SITE_ROOT="/var/www/daily-tracker"
NGINX_SITE="/etc/nginx/sites-available/daily-tracker.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/daily-tracker.conf"
NGINX_CONF_D="/etc/nginx/conf.d/daily-tracker.conf"

echo "Deploying frontend from: $PROJECT_ROOT"

mkdir -p "$SITE_ROOT"

cp "$PROJECT_ROOT/index.html" "$SITE_ROOT/"
cp "$PROJECT_ROOT/app.js" "$SITE_ROOT/"
cp "$PROJECT_ROOT/style.css" "$SITE_ROOT/"
cp "$PROJECT_ROOT/manifest.json" "$SITE_ROOT/"
cp "$PROJECT_ROOT/sw.js" "$SITE_ROOT/"

rm -rf "$SITE_ROOT/icons"
cp -r "$PROJECT_ROOT/icons" "$SITE_ROOT/icons"

if command -v apt >/dev/null 2>&1; then
    apt update
    apt install -y nginx
    cp "$PROJECT_ROOT/deploy/nginx/daily-tracker.conf" "$NGINX_SITE"
    mkdir -p /etc/nginx/sites-enabled
    ln -sf "$NGINX_SITE" "$NGINX_ENABLED"
    rm -f /etc/nginx/sites-enabled/default
elif command -v yum >/dev/null 2>&1; then
    yum install -y epel-release || true
    yum install -y nginx
    cp "$PROJECT_ROOT/deploy/nginx/daily-tracker.conf" "$NGINX_CONF_D"
else
    echo "Unsupported package manager. Install nginx manually."
    exit 1
fi

systemctl enable nginx
systemctl restart nginx
nginx -t
systemctl reload nginx

echo "Frontend deployed successfully."
echo "Visit: http://<your-server-ip>/"
