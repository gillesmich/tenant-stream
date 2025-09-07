#!/bin/bash

# Complete deployment script for OVH server
# This script orchestrates the entire deployment process

set -e

echo "🚀 RENTAL APPLICATION - COMPLETE DEPLOYMENT"
echo "==========================================="
echo ""

# Check if domain parameter is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <your-domain.com> [git-repo-url]"
    echo "Example: $0 myrentalapp.com https://github.com/username/rental-app.git"
    echo ""
    echo "If git-repo-url is not provided, you'll need to manually place your code in /var/www/"
    exit 1
fi

DOMAIN=$1
GIT_REPO=${2:-""}

echo "🌐 Domain: $DOMAIN"
echo "📁 Git Repository: ${GIT_REPO:-"Manual deployment"}"
echo ""

# Confirmation
read -p "🤔 Ready to deploy? This will install and configure everything. Continue? (yes/no): " confirm
if [[ $confirm != "yes" ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "📋 DEPLOYMENT PLAN:"
echo "1. ✅ Update system packages"
echo "2. ✅ Install required software (Nginx, PostgreSQL, Node.js)"
echo "3. ✅ Setup database"
echo "4. ✅ Deploy frontend application"
echo "5. ✅ Deploy backend application"
echo "6. ✅ Configure Nginx"
echo "7. ✅ Setup SSL certificate"
echo "8. ✅ Configure monitoring"
echo ""

read -p "Press Enter to start deployment..."

# Step 1: System update
echo ""
echo "1️⃣ Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install software
echo ""
echo "2️⃣ Installing required software..."

# Install Node.js 18+
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install other packages
echo "📦 Installing Nginx, PostgreSQL, and utilities..."
sudo apt install -y nginx postgresql postgresql-contrib git curl software-properties-common ufw

# Install PM2 for process management
sudo npm install -g pm2

# Step 3: Setup database
echo ""
echo "3️⃣ Setting up PostgreSQL database..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

DB_NAME="rental_app"
DB_USER="rental_user"
DB_PASSWORD="rental123"

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF

echo "✅ Database created successfully"

# Step 4 & 5: Deploy applications
echo ""
echo "4️⃣ Deploying applications..."

# Create directories
sudo mkdir -p /var/www/frontend
sudo mkdir -p /var/www/backend
sudo chown -R $USER:$USER /var/www/

if [[ -n "$GIT_REPO" ]]; then
    echo "📥 Cloning from Git repository..."
    git clone $GIT_REPO /tmp/rental-app-source
    
    # Copy frontend files
    cp -r /tmp/rental-app-source/* /var/www/frontend/
    
    # Copy backend files
    cp -r /tmp/rental-app-source/* /var/www/backend/
    
    # Clean up
    rm -rf /tmp/rental-app-source
else
    echo "ℹ️  Manual deployment mode - please upload your code to:"
    echo "   Frontend: /var/www/frontend"
    echo "   Backend: /var/www/backend"
    read -p "Press Enter when you've uploaded your code..."
fi

# Setup frontend
echo "🌐 Setting up frontend..."
cd /var/www/frontend

# Create environment file
cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="vbpyykdkaoktzuewbzzl"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4"
VITE_SUPABASE_URL="https://vbpyykdkaoktzuewbzzl.supabase.co"
EOF

# Install dependencies and build
npm install
npm run build

echo "✅ Frontend deployed"

# Setup backend
echo "🔧 Setting up backend..."
cd /var/www/backend

# Create backend environment file
cat > .env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
JWT_SECRET=$(openssl rand -base64 32)
PORT=3001
NODE_ENV=production
EOF

# Install dependencies
npm install

# Create uploads directory
mkdir -p uploads
sudo chown -R www-data:www-data uploads

# Setup PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rental-backend',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Build and start backend
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Backend deployed"

# Step 6: Configure Nginx
echo ""
echo "6️⃣ Configuring Nginx..."

sudo tee /etc/nginx/sites-available/rental-app << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root /var/www/frontend/dist;
    index index.html;

    # Frontend - Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
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
sudo ln -sf /etc/nginx/sites-available/rental-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and start Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ Nginx configured"

# Step 7: Setup SSL
echo ""
echo "7️⃣ Setting up SSL certificate..."

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Set up automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo "✅ SSL configured"

# Step 8: Configure firewall
echo ""
echo "8️⃣ Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo "✅ Firewall configured"

# Final verification
echo ""
echo "🔍 Final verification..."
sleep 3

# Check services
echo "Service status:"
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Failed"
systemctl is-active postgresql && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Failed"
pm2 list | grep -q "rental-backend" && echo "✅ Backend: Running" || echo "❌ Backend: Failed"

# Check HTTP response
if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN 2>/dev/null | grep -q "200\|301\|302"; then
    echo "✅ Website: Accessible"
else
    echo "❌ Website: Not accessible"
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "======================="
echo ""
echo "🌐 Your application is now available at:"
echo "   HTTP:  http://$DOMAIN"
echo "   HTTPS: https://$DOMAIN"
echo ""
echo "🔧 Management commands:"
echo "   Monitor: ./monitor.sh"
echo "   Backup:  ./backup.sh"
echo "   Update:  ./update.sh"
echo ""
echo "📋 Important information:"
echo "   Database: $DB_NAME"
echo "   DB User:  $DB_USER"
echo "   Frontend: /var/www/frontend"
echo "   Backend:  /var/www/backend"
echo "   Logs:     /var/www/backend/logs/"
echo ""
echo "🛡️  Next steps:"
echo "   1. Change the default database password"
echo "   2. Setup automated backups (cron job)"
echo "   3. Monitor application logs"
echo "   4. Test all functionality"
echo ""
echo "✅ Deployment successful! 🚀"