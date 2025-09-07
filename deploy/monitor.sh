#!/bin/bash

# Monitoring script for the rental application
# Run this to check the status of all services

set -e

echo "🔍 Rental Application Status Monitor"
echo "====================================="
echo ""

# Check system resources
echo "💾 System Resources:"
echo "-------------------"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h /
echo ""
echo "CPU load:"
uptime
echo ""

# Check services status
echo "🔧 Service Status:"
echo "-----------------"
services=("nginx" "postgresql" "rental-backend")

for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: Running"
    else
        echo "❌ $service: Stopped"
    fi
done
echo ""

# Check network connections
echo "🌐 Network Status:"
echo "-----------------"
echo "Active connections on port 80 (HTTP):"
netstat -an | grep :80 | wc -l
echo "Active connections on port 443 (HTTPS):"
netstat -an | grep :443 | wc -l
echo "Active connections on port 3001 (Backend):"
netstat -an | grep :3001 | wc -l
echo ""

# Check Nginx status
echo "🌍 Nginx Status:"
echo "---------------"
if command -v nginx &> /dev/null; then
    nginx -v
    echo "Configuration test:"
    if sudo nginx -t 2>/dev/null; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration has errors"
    fi
else
    echo "❌ Nginx not installed"
fi
echo ""

# Check PostgreSQL status
echo "🗄️ PostgreSQL Status:"
echo "--------------------"
if command -v psql &> /dev/null; then
    sudo -u postgres psql -c "SELECT version();" 2>/dev/null | head -3
    echo "Database connections:"
    sudo -u postgres psql -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tail -2
else
    echo "❌ PostgreSQL not installed"
fi
echo ""

# Check backend logs (if using systemd service)
echo "📋 Recent Backend Logs:"
echo "----------------------"
if systemctl is-active --quiet rental-backend 2>/dev/null; then
    echo "Last 10 lines from backend service:"
    sudo journalctl -u rental-backend -n 10 --no-pager
else
    echo "Backend service not running or not configured as systemd service"
    if [ -f "/var/www/backend/logs/app.log" ]; then
        echo "Last 10 lines from application log:"
        tail -10 /var/www/backend/logs/app.log
    fi
fi
echo ""

# Check Nginx error logs
echo "🚨 Recent Nginx Errors:"
echo "----------------------"
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Last 5 error entries:"
    sudo tail -5 /var/log/nginx/error.log
else
    echo "No Nginx error log found"
fi
echo ""

# Check SSL certificate status
echo "🔒 SSL Certificate Status:"
echo "-------------------------"
if [ -f "/etc/nginx/sites-available/rental-app" ]; then
    domain=$(grep -E "server_name" /etc/nginx/sites-available/rental-app | head -1 | awk '{print $2}' | sed 's/;//')
    if [[ $domain != "your-domain.com" ]] && [[ $domain != "_" ]]; then
        echo "Checking SSL for domain: $domain"
        if command -v openssl &> /dev/null; then
            echo | timeout 5 openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "❌ SSL certificate check failed"
        else
            echo "OpenSSL not available for certificate check"
        fi
    else
        echo "Domain not configured or using default"
    fi
else
    echo "Nginx configuration not found"
fi
echo ""

# Check application accessibility
echo "🌐 Application Accessibility:"
echo "----------------------------"
if curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null | grep -q "200\|301\|302"; then
    echo "✅ Application accessible via HTTP"
else
    echo "❌ Application not accessible via HTTP"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null | grep -q "200"; then
    echo "✅ Backend API accessible"
else
    echo "❌ Backend API not accessible"
fi
echo ""

echo "🏁 Monitoring complete!"
echo ""
echo "💡 Useful commands:"
echo "  View live Nginx access logs: sudo tail -f /var/log/nginx/access.log"
echo "  View live Nginx error logs: sudo tail -f /var/log/nginx/error.log"
echo "  View backend logs: sudo journalctl -u rental-backend -f"
echo "  Restart services: sudo systemctl restart nginx|postgresql|rental-backend"