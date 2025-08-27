#!/bin/bash

# SSL setup script using Let's Encrypt
# Run this AFTER setting up your domain DNS

set -e

# Check if domain parameter is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <your-domain.com>"
    echo "Example: $0 myrentalapp.com"
    exit 1
fi

DOMAIN=$1

echo "🔒 Setting up SSL for domain: $DOMAIN"

# Install Certbot
echo "📦 Installing Certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
echo "🔐 Obtaining SSL certificate..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Update Nginx configuration with the domain
echo "⚙️ Updating Nginx configuration..."
sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/rental-app

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Set up automatic renewal
echo "🔄 Setting up automatic SSL renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo "✅ SSL setup completed!"
echo "🌐 Your application is now accessible at: https://$DOMAIN"
echo "🔒 SSL certificate will auto-renew every 60 days"