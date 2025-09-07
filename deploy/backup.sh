#!/bin/bash

# Backup script for rental application
# Creates backups of database and uploaded files

set -e

# Configuration
BACKUP_DIR="/var/backups/rental-app"
DB_NAME="rental_app"
DB_USER="rental_user"
DB_PASSWORD="rental123"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

echo "💾 Starting backup process..."

# Create backup directory
sudo mkdir -p $BACKUP_DIR
sudo chown $USER:$USER $BACKUP_DIR

# Database backup
echo "📊 Backing up database..."
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME > "$BACKUP_DIR/database_$TIMESTAMP.sql"

# Compress database backup
gzip "$BACKUP_DIR/database_$TIMESTAMP.sql"
echo "✅ Database backup created: database_$TIMESTAMP.sql.gz"

# Backup uploaded files (if they exist)
if [ -d "/var/www/backend/uploads" ]; then
    echo "📁 Backing up uploaded files..."
    tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /var/www/backend uploads/
    echo "✅ Files backup created: uploads_$TIMESTAMP.tar.gz"
fi

# Backup Nginx configuration
echo "⚙️ Backing up Nginx configuration..."
sudo cp /etc/nginx/sites-available/rental-app "$BACKUP_DIR/nginx_config_$TIMESTAMP.conf"
echo "✅ Nginx config backup created: nginx_config_$TIMESTAMP.conf"

# Backup environment files
if [ -f "/var/www/rental-app/.env" ]; then
    echo "🔐 Backing up environment configuration..."
    cp /var/www/rental-app/.env "$BACKUP_DIR/frontend_env_$TIMESTAMP"
    echo "✅ Frontend env backup created: frontend_env_$TIMESTAMP"
fi

if [ -f "/var/www/backend/.env" ]; then
    cp /var/www/backend/.env "$BACKUP_DIR/backend_env_$TIMESTAMP"
    echo "✅ Backend env backup created: backend_env_$TIMESTAMP"
fi

# Clean up old backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "database_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "nginx_config_*.conf" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*_env_*" -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo "📋 Current backups:"
ls -lh $BACKUP_DIR/

# Calculate backup size
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo ""
echo "💾 Total backup size: $BACKUP_SIZE"

echo "✅ Backup process completed successfully!"
echo ""
echo "💡 To restore from backup:"
echo "  Database: gunzip -c database_TIMESTAMP.sql.gz | psql -U $DB_USER -d $DB_NAME"
echo "  Files: tar -xzf uploads_TIMESTAMP.tar.gz -C /var/www/backend/"
echo ""
echo "📁 Backup location: $BACKUP_DIR"