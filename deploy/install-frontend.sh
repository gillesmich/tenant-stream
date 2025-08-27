#!/bin/bash

# Frontend deployment script for OVH server
# Run this script on your OVH server

set -e

echo "🚀 Starting frontend deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (required for Vite)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install Git
echo "📦 Installing Git..."
sudo apt install -y git

# Create deployment directory
echo "📁 Creating deployment directory..."
sudo mkdir -p /var/www/rental-app
sudo chown -R $USER:$USER /var/www/rental-app

# Clone repository (replace with your actual repository URL)
echo "📥 Cloning repository..."
cd /var/www/rental-app
git clone https://github.com/yourusername/your-repo.git .

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create production environment file
echo "⚙️ Creating environment configuration..."
cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="vbpyykdkaoktzuewbzzl"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4"
VITE_SUPABASE_URL="https://vbpyykdkaoktzuewbzzl.supabase.co"
EOF

# Build the application
echo "🔨 Building application..."
npm run build

# Configure Nginx
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/rental-app << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your actual domain
    root /var/www/rental-app/dist;
    index index.html;

    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Enable the site
echo "🔗 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/rental-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "✅ Testing Nginx configuration..."
sudo nginx -t

# Start and enable Nginx
echo "🚀 Starting Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo "✅ Frontend deployment completed!"
echo "🌐 Your application should now be accessible at: http://your-server-ip"
echo ""
echo "Next steps:"
echo "1. Point your domain to this server's IP address"
echo "2. Run the SSL setup script to enable HTTPS"
echo "3. Update the Nginx configuration with your actual domain name"