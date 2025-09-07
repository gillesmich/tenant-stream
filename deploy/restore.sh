#!/bin/bash

# Restore script for rental application
# Restores database and files from backup

set -e

# Configuration
BACKUP_DIR="/var/backups/rental-app"
DB_NAME="rental_app"
DB_USER="rental_user"
DB_PASSWORD="rental123"

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "📋 Available backups:"
    ls -la $BACKUP_DIR/database_*.sql.gz 2>/dev/null || echo "No database backups found"
    echo ""
    echo "Usage: $0 <backup_timestamp>"
    echo "Example: $0 20240101_120000"
    echo ""
    echo "Available timestamps:"
    ls $BACKUP_DIR/database_*.sql.gz 2>/dev/null | sed 's/.*database_\(.*\)\.sql\.gz/\1/' || echo "No backups found"
    exit 1
fi

TIMESTAMP=$1
DB_BACKUP_FILE="$BACKUP_DIR/database_$TIMESTAMP.sql.gz"
FILES_BACKUP_FILE="$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"

# Verify backup files exist
if [ ! -f "$DB_BACKUP_FILE" ]; then
    echo "❌ Database backup file not found: $DB_BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite the current database and files!"
echo "Database backup: $DB_BACKUP_FILE"
if [ -f "$FILES_BACKUP_FILE" ]; then
    echo "Files backup: $FILES_BACKUP_FILE"
fi
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "🔄 Starting restore process..."

# Stop services
echo "⏹️  Stopping services..."
sudo systemctl stop nginx
if systemctl is-active --quiet rental-backend; then
    sudo systemctl stop rental-backend
fi

# Create a backup of current state before restore
echo "💾 Creating safety backup of current state..."
SAFETY_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")_pre_restore
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME > "$BACKUP_DIR/database_$SAFETY_TIMESTAMP.sql"
gzip "$BACKUP_DIR/database_$SAFETY_TIMESTAMP.sql"
echo "✅ Safety backup created: database_$SAFETY_TIMESTAMP.sql.gz"

# Restore database
echo "📊 Restoring database..."
# Drop and recreate database
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

# Restore from backup
gunzip -c "$DB_BACKUP_FILE" | PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME
echo "✅ Database restored successfully"

# Restore files if backup exists
if [ -f "$FILES_BACKUP_FILE" ]; then
    echo "📁 Restoring uploaded files..."
    
    # Backup current uploads if they exist
    if [ -d "/var/www/backend/uploads" ]; then
        mv /var/www/backend/uploads "/var/www/backend/uploads_backup_$SAFETY_TIMESTAMP"
        echo "📦 Current uploads backed up to: uploads_backup_$SAFETY_TIMESTAMP"
    fi
    
    # Restore from backup
    tar -xzf "$FILES_BACKUP_FILE" -C /var/www/backend/
    sudo chown -R www-data:www-data /var/www/backend/uploads
    echo "✅ Files restored successfully"
else
    echo "ℹ️  No files backup found for this timestamp"
fi

# Restore configuration files if they exist
NGINX_CONFIG_BACKUP="$BACKUP_DIR/nginx_config_$TIMESTAMP.conf"
if [ -f "$NGINX_CONFIG_BACKUP" ]; then
    echo "⚙️ Restoring Nginx configuration..."
    sudo cp "$NGINX_CONFIG_BACKUP" /etc/nginx/sites-available/rental-app
    sudo nginx -t
    echo "✅ Nginx configuration restored"
fi

FRONTEND_ENV_BACKUP="$BACKUP_DIR/frontend_env_$TIMESTAMP"
if [ -f "$FRONTEND_ENV_BACKUP" ]; then
    echo "🔐 Restoring frontend environment..."
    cp "$FRONTEND_ENV_BACKUP" /var/www/rental-app/.env
    echo "✅ Frontend environment restored"
fi

BACKEND_ENV_BACKUP="$BACKUP_DIR/backend_env_$TIMESTAMP"
if [ -f "$BACKEND_ENV_BACKUP" ]; then
    echo "🔐 Restoring backend environment..."
    cp "$BACKEND_ENV_BACKUP" /var/www/backend/.env
    echo "✅ Backend environment restored"
fi

# Start services
echo "▶️  Starting services..."
sudo systemctl start nginx
if [ -f "/etc/systemd/system/rental-backend.service" ]; then
    sudo systemctl start rental-backend
fi

# Verify restoration
echo "🔍 Verifying restoration..."
sleep 2

if curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null | grep -q "200\|301\|302"; then
    echo "✅ Frontend accessible"
else
    echo "⚠️  Frontend may not be accessible"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null | grep -q "200"; then
    echo "✅ Backend accessible"
else
    echo "⚠️  Backend may not be accessible"
fi

echo ""
echo "✅ Restore process completed!"
echo ""
echo "📋 Restoration summary:"
echo "  Timestamp: $TIMESTAMP"
echo "  Database: ✅ Restored"
echo "  Files: $([ -f "$FILES_BACKUP_FILE" ] && echo "✅ Restored" || echo "➖ No backup")"
echo "  Config: $([ -f "$NGINX_CONFIG_BACKUP" ] && echo "✅ Restored" || echo "➖ No backup")"
echo ""
echo "🛡️  Safety backup created: database_$SAFETY_TIMESTAMP.sql.gz"
echo "💡 If you need to rollback, run: $0 $SAFETY_TIMESTAMP"