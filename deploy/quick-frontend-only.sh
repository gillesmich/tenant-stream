#!/bin/bash

# Quick frontend-only deployment for Supabase apps
# Usage: ./quick-frontend-only.sh <domain> [git-repo-url]

set -e

DOMAIN=$1
GIT_REPO=${2:-"https://github.com/gillesmich/tenant-stream.git"}

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain> [git-repo-url]"
    echo "Example: $0 myapp.com"
    exit 1
fi

echo "🚀 Quick Frontend Deployment for $DOMAIN"
echo "========================================"

# Clean up any PM2 processes (not needed for frontend-only)
sudo pm2 delete all 2>/dev/null || true
sudo systemctl disable --now pm2-root 2>/dev/null || true

# Update system
echo "📦 Updating system..."
sudo apt update

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Nginx if needed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt install -y nginx
fi

# Deploy application
echo "📥 Deploying application..."
sudo rm -rf /tmp/app-deploy
git clone $GIT_REPO /tmp/app-deploy
cd /tmp/app-deploy

# Build frontend
echo "🔨 Building frontend..."
npm install
npm run build

# Deploy to web root
echo "🌐 Deploying to web server..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Configure Nginx for SPA
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name $DOMAIN www.$DOMAIN _;
    root /var/www/html;
    index index.html;

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 'Nginx Full' 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || true

# Setup SSL if certbot is available
if command -v certbot &> /dev/null; then
    echo "🔐 Setting up SSL..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN 2>/dev/null || echo "SSL setup skipped (manual DNS setup may be needed)"
else
    echo "💡 Install certbot for SSL: sudo apt install certbot python3-certbot-nginx"
fi

# Cleanup
rm -rf /tmp/app-deploy

echo ""
echo "✅ Deployment completed!"
echo "🌐 Your app should be available at: http://$DOMAIN"
echo "💡 Make sure your domain DNS points to this server's IP"
echo ""
echo "📋 Quick commands:"
echo "• Check status: sudo systemctl status nginx"
echo "• View logs: sudo tail -f /var/log/nginx/access.log"
echo "• Update app: Re-run this script"