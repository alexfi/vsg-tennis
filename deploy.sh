#!/bin/bash
# VSG Singles — rebuild & deploy
set -e

echo "🔨 Building..."
npm run build

echo "📦 Deploying to /var/www/vsg-singles..."
rm -rf /var/www/vsg-singles/*
cp -r dist/* /var/www/vsg-singles/

echo "🔄 Reloading Caddy..."
systemctl reload caddy

echo "✅ Deployed! http://46.101.107.157/"
