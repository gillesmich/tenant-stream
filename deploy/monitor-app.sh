#!/bin/bash

# Monitoring script for deployed Supabase application
# Usage: ./monitor-app.sh

echo "📊 RENTAL APPLICATION MONITORING"
echo "================================="
echo "Timestamp: $(date)"
echo ""

# System Status
echo "🖥️  SYSTEM STATUS"
echo "----------------"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Uptime: $(uptime -p)"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Memory Usage
echo "💾 MEMORY USAGE"
echo "---------------"
free -h | head -2
echo "Memory Usage: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo ""

# Disk Usage
echo "💿 DISK USAGE"
echo "-------------"
df -h / | tail -1
echo ""

# Service Status
echo "🔧 SERVICES STATUS"
echo "------------------"
services=("nginx")

for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet $service; then
        echo "✅ $service: Running"
    else
        echo "❌ $service: Not running"
    fi
done
echo ""

# Network Status
echo "🌐 NETWORK STATUS"
echo "-----------------"
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo "✅ Local website: Accessible"
else
    echo "❌ Local website: Not accessible"
fi

# Check external connectivity
if ping -c 1 8.8.8.8 &> /dev/null; then
    echo "✅ Internet: Connected"
else
    echo "❌ Internet: Not connected"
fi
echo ""

# SSL Certificate Status
echo "🔐 SSL CERTIFICATE STATUS"
echo "-------------------------"
if command -v certbot &> /dev/null; then
    sudo certbot certificates 2>/dev/null | grep -E "(Certificate Name|Expiry Date)" || echo "No certificates found"
else
    echo "Certbot not installed"
fi
echo ""

# Recent Logs
echo "📝 RECENT NGINX LOGS (Last 10 lines)"
echo "------------------------------------"
if [ -f /var/log/nginx/error.log ]; then
    sudo tail -n 10 /var/log/nginx/error.log
else
    echo "No error logs found"
fi
echo ""

# Application Status
echo "🚀 APPLICATION STATUS"
echo "---------------------"
if [ -d "/var/www/html/rental-app" ]; then
    echo "✅ Application files: Present"
    echo "📁 Last modified: $(stat -c %y /var/www/html/rental-app/index.html 2>/dev/null || echo 'Unknown')"
else
    echo "❌ Application files: Missing"
fi

# Check if Git repository exists
if [ -d "/var/www/rental-app/.git" ]; then
    cd /var/www/rental-app
    echo "📋 Git status:"
    echo "   Current branch: $(git branch --show-current 2>/dev/null || echo 'Unknown')"
    echo "   Last commit: $(git log -1 --format='%h - %s (%cr)' 2>/dev/null || echo 'Unknown')"
    echo "   Status: $(git status --porcelain 2>/dev/null | wc -l) modified files"
fi
echo ""

# Security Check
echo "🔒 SECURITY STATUS"
echo "------------------"
if sudo ufw status | grep -q "Status: active"; then
    echo "✅ Firewall: Active"
    echo "   Open ports: $(sudo ufw status | grep ALLOW | wc -l)"
else
    echo "⚠️  Firewall: Inactive"
fi

# Check for failed login attempts
failed_logins=$(sudo grep "Failed password" /var/log/auth.log 2>/dev/null | tail -n 10 | wc -l)
if [ $failed_logins -gt 0 ]; then
    echo "⚠️  Recent failed logins: $failed_logins"
else
    echo "✅ No recent failed logins"
fi
echo ""

echo "📊 Monitoring completed at $(date)"
echo "💡 Run this script regularly to monitor your application health"