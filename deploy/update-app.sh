#!/bin/bash

# Application update script
# Run this script to deploy new versions

set -e

echo "🔄 Updating application..."

# Navigate to app directory
cd /var/www/rental-app

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install/update dependencies
echo "📦 Updating dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Restart Nginx (optional, but good practice)
echo "🔄 Restarting Nginx..."
sudo systemctl reload nginx

echo "✅ Application updated successfully!"
echo "🌐 Changes are now live!"