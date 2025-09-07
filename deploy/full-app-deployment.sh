#!/bin/bash

# Complete deployment script for Supabase-integrated rental application
# Usage: ./full-app-deployment.sh <domain> [git-repo-url]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DOMAIN=""
GIT_REPO=""
APP_NAME="rental-app"

# Check if domain parameter is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Usage: $0 <your-domain.com> [git-repo-url]${NC}"
    echo -e "${YELLOW}Example: $0 myrentalapp.com https://github.com/username/rental-app.git${NC}"
    echo ""
    echo "If git-repo-url is not provided, you'll need to manually place your code in /var/www/"
    exit 1
fi

DOMAIN=$1
GIT_REPO=${2:-""}

echo -e "${BLUE}🚀 SUPABASE RENTAL APPLICATION - COMPLETE DEPLOYMENT${NC}"
echo "==========================================="
echo -e "${GREEN}🌐 Domain: $DOMAIN${NC}"
if [ -n "$GIT_REPO" ]; then
    echo -e "${GREEN}📁 Git Repository: $GIT_REPO${NC}"
fi

# Confirmation
read -p "🤔 Ready to deploy? This will install and configure everything. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 DEPLOYMENT PLAN:${NC}"
echo "1. ✅  Update system packages"
echo "2. ✅  Install required software (Nginx, Node.js, Certbot)"
echo "3. ✅  Deploy application from Git"
echo "4. ✅  Build frontend application"
echo "5. ✅  Configure Nginx"
echo "6. ✅  Setup SSL certificate"
echo "7. ✅  Configure firewall"
echo "8. ✅  Final verification"
echo ""
read -p "Press Enter to start deployment..."

# Step 1: Update system
echo -e "${YELLOW}1️⃣ Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install required software
echo -e "${YELLOW}2️⃣ Installing required software...${NC}"

# Install Node.js 18+
echo -e "${BLUE}📦 Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install other required packages
echo -e "${BLUE}📦 Installing Nginx and utilities...${NC}"
sudo apt install -y nginx git curl software-properties-common ufw

# Install PM2 globally for process management
sudo npm install -g pm2

# Step 3: Deploy application
echo -e "${YELLOW}3️⃣ Deploying application...${NC}"

# Create deployment directory
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

if [ -n "$GIT_REPO" ]; then
    echo -e "${BLUE}📥 Cloning from Git repository...${NC}"
    
    # Remove existing directory if it exists
    sudo rm -rf /var/www/$APP_NAME
    
    # Clone repository
    cd /var/www
    git clone $GIT_REPO $APP_NAME
    cd $APP_NAME
    
    # Set proper ownership
    sudo chown -R $USER:$USER /var/www/$APP_NAME
else
    echo -e "${YELLOW}⚠️  No Git repository provided. Please manually upload your code to /var/www/$APP_NAME${NC}"
    exit 1
fi

# Step 4: Build frontend application
echo -e "${YELLOW}4️⃣ Building frontend application...${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Create production environment file for frontend
echo -e "${BLUE}⚙️ Creating environment configuration...${NC}"
cat > .env.production << EOF
# Supabase Configuration
VITE_SUPABASE_URL=https://vbpyykdkaoktzuewbzzl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicHl5a2RrYW9rdHp1ZXdienpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzA2MTQsImV4cCI6MjA3MTg0NjYxNH0.FIh_pXKyNfeR2qm8my6bLENe-8HwM7hrEckNwaKR9s4
EOF

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build

# Create dist directory for serving
sudo mkdir -p /var/www/html/$APP_NAME
sudo cp -r dist/* /var/www/html/$APP_NAME/
sudo chown -R www-data:www-data /var/www/html/$APP_NAME

echo -e "${GREEN}✅  Frontend built and deployed${NC}"

# Step 5: Configure Nginx
echo -e "${YELLOW}5️⃣ Configuring Nginx...${NC}"

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    root /var/www/html/$APP_NAME;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Handle React Router (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
EOF

# Enable the site
echo -e "${BLUE}🔗 Enabling Nginx site...${NC}"
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo -e "${BLUE}✅ Testing Nginx configuration...${NC}"
sudo nginx -t

# Start and enable Nginx
echo -e "${BLUE}🚀 Starting Nginx...${NC}"
sudo systemctl restart nginx
sudo systemctl enable nginx

# Step 6: Setup SSL certificate
echo -e "${YELLOW}6️⃣ Setting up SSL certificate...${NC}"

# Install Certbot
echo -e "${BLUE}📦 Installing Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
echo -e "${BLUE}🔐 Obtaining SSL certificate...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Set up automatic renewal
echo -e "${BLUE}🔄 Setting up automatic SSL renewal...${NC}"
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Step 7: Configure firewall
echo -e "${YELLOW}7️⃣ Configuring firewall...${NC}"
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

# Step 8: Final verification
echo -e "${YELLOW}8️⃣ Final verification...${NC}"

# Check Nginx status
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
fi

# Check if website is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo -e "${GREEN}✅ Website is accessible${NC}"
else
    echo -e "${RED}❌ Website is not accessible${NC}"
fi

# Create update script
echo -e "${BLUE}📝 Creating update script...${NC}"
cat > /var/www/$APP_NAME/update.sh << EOF
#!/bin/bash
cd /var/www/$APP_NAME
git pull origin main
npm install
npm run build
sudo cp -r dist/* /var/www/html/$APP_NAME/
sudo chown -R www-data:www-data /var/www/html/$APP_NAME
sudo systemctl reload nginx
echo "Update completed!"
EOF
chmod +x /var/www/$APP_NAME/update.sh

# Create monitoring script
cat > /var/www/$APP_NAME/monitor.sh << EOF
#!/bin/bash
echo "=== System Status ==="
echo "Nginx: \$(sudo systemctl is-active nginx)"
echo "Disk Usage: \$(df -h / | awk 'NR==2{print \$5}')"
echo "Memory Usage: \$(free -m | awk 'NR==2{printf "%.1f%%", \$3*100/\$2 }')"
echo "Load Average: \$(uptime | awk -F'load average:' '{print \$2}')"
echo ""
echo "=== SSL Certificate Status ==="
sudo certbot certificates
echo ""
echo "=== Recent Nginx Logs ==="
sudo tail -n 10 /var/log/nginx/error.log
EOF
chmod +x /var/www/$APP_NAME/monitor.sh

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉${NC}"
echo ""
echo -e "${BLUE}📋 DEPLOYMENT SUMMARY:${NC}"
echo -e "🌐 Website URL: https://$DOMAIN"
echo -e "📁 Application path: /var/www/$APP_NAME"
echo -e "🔧 Update script: /var/www/$APP_NAME/update.sh"
echo -e "📊 Monitor script: /var/www/$APP_NAME/monitor.sh"
echo ""
echo -e "${YELLOW}📝 NEXT STEPS:${NC}"
echo "1. Point your domain DNS to this server's IP address"
echo "2. Test your application at https://$DOMAIN"
echo "3. Configure your Supabase project settings if needed"
echo "4. Set up monitoring and backups"
echo ""
echo -e "${BLUE}💡 USEFUL COMMANDS:${NC}"
echo "• Update app: cd /var/www/$APP_NAME && ./update.sh"
echo "• Monitor system: cd /var/www/$APP_NAME && ./monitor.sh"
echo "• Check logs: sudo tail -f /var/log/nginx/access.log"
echo "• Restart Nginx: sudo systemctl restart nginx"
echo ""
echo -e "${GREEN}✅ Your Supabase rental application is now live!${NC}"