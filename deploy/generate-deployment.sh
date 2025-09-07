#!/bin/bash

# Script de configuration et déploiement complet sur serveur OVH
# Usage: ./generate-deployment.sh

set -e

echo "🚀 Génération des scripts de déploiement pour serveur OVH..."

# Créer le dossier de déploiement
mkdir -p deployment/{nginx,systemd,scripts,ssl}

# Script d'installation complète
cat > deployment/install-complete.sh << 'EOF'
#!/bin/bash

# Installation complète de l'application de location sur serveur OVH
# Usage: ./install-complete.sh

set -e

echo "🚀 Démarrage de l'installation complète..."

# Variables
DOMAIN=${1:-"votre-domaine.com"}
DB_PASSWORD=${2:-"rental123"}
JWT_SECRET=${3:-$(openssl rand -hex 32)}

echo "📋 Configuration:"
echo "   Domaine: $DOMAIN"
echo "   Base de données: rental_app"
echo "   Utilisateur DB: rental_user"

# Mise à jour du système
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# Installation des paquets nécessaires
echo "📦 Installation des dépendances..."
sudo apt install -y curl wget git nginx postgresql postgresql-contrib nodejs npm python3-certbot-nginx ufw

# Configuration du pare-feu
echo "🔒 Configuration du pare-feu..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw allow 5432  # PostgreSQL (local seulement)
sudo ufw --force enable

# Installation de Node.js 18+
echo "📦 Installation de Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installation de PM2 pour la gestion des processus
echo "📦 Installation de PM2..."
sudo npm install -g pm2

# Configuration PostgreSQL
echo "🗄️ Configuration de PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Création de l'utilisateur et de la base de données
sudo -u postgres psql -c "CREATE USER rental_user WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE rental_app OWNER rental_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rental_app TO rental_user;"

# Configuration PostgreSQL pour les connexions locales
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
echo "local   rental_app      rental_user                     md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

sudo systemctl restart postgresql

echo "✅ Installation des dépendances terminée"
echo "🔑 JWT Secret généré: $JWT_SECRET"
echo "🗄️ Base de données créée avec succès"
echo ""
echo "Prochaines étapes:"
echo "1. Cloner votre code: git clone <votre-repo>"
echo "2. Configurer le backend avec le JWT secret: $JWT_SECRET"
echo "3. Lancer le script de déploiement des applications"
EOF

# Script de déploiement des applications
cat > deployment/deploy-apps.sh << 'EOF'
#!/bin/bash

# Déploiement des applications frontend et backend
# Usage: ./deploy-apps.sh <domain> <git-repo-url>

set -e

DOMAIN=${1:-"votre-domaine.com"}
REPO_URL=${2:-"https://github.com/votre-user/votre-repo.git"}

echo "🚀 Déploiement des applications..."
echo "   Domaine: $DOMAIN"
echo "   Repository: $REPO_URL"

# Créer les répertoires de déploiement
sudo mkdir -p /var/www/{frontend,backend}
sudo chown -R $USER:$USER /var/www

# Cloner le repository
cd /var/www
if [ -d "repo" ]; then
    cd repo && git pull
else
    git clone $REPO_URL repo
    cd repo
fi

# Déployer le frontend
echo "🎨 Déploiement du frontend..."
if [ -d "rental-app" ]; then
    cd rental-app
    npm install --production
    npm run build
    sudo cp -r dist/* /var/www/frontend/
    cd ..
fi

# Déployer le backend
echo "⚙️ Déploiement du backend..."
if [ -d "rental-backend" ]; then
    cd rental-backend
    npm install --production
    npm run build
    sudo cp -r * /var/www/backend/
    
    # Créer le dossier uploads
    sudo mkdir -p /var/www/backend/uploads
    sudo chown -R www-data:www-data /var/www/backend/uploads
    cd ..
fi

echo "✅ Applications déployées avec succès"
EOF

# Configuration Nginx
cat > deployment/nginx/rental-app.conf << 'EOF'
# Configuration Nginx pour l'application de location
# Remplacer "votre-domaine.com" par votre vrai domaine

server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Redirection HTTPS (sera configuré par Certbot)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;
    
    # Certificats SSL (seront configurés par Certbot)
    # ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # En-têtes de sécurité
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Configuration frontend (React)
    location / {
        root /var/www/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache des assets statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend (Node.js)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
    
    # Uploads
    location /uploads/ {
        alias /var/www/backend/uploads/;
        expires 1M;
        add_header Cache-Control "public";
    }
    
    # Compression Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Taille max upload
    client_max_body_size 10M;
}
EOF

# Service systemd pour le backend
cat > deployment/systemd/rental-backend.service << 'EOF'
[Unit]
Description=Rental Backend API
Documentation=https://github.com/votre-user/votre-repo
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/backend
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10
KillMode=mixed
TimeoutStopSec=30

# Sécurité
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/www/backend/uploads
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Logs
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rental-backend

[Install]
WantedBy=multi-user.target
EOF

# Script de configuration SSL
cat > deployment/ssl/setup-ssl.sh << 'EOF'
#!/bin/bash

# Configuration SSL avec Let's Encrypt
# Usage: ./setup-ssl.sh <domain>

set -e

DOMAIN=${1:-"votre-domaine.com"}

echo "🔒 Configuration SSL pour $DOMAIN..."

# Vérifier que le domaine pointe vers ce serveur
echo "🔍 Vérification DNS..."
CURRENT_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN)

if [ "$CURRENT_IP" != "$DOMAIN_IP" ]; then
    echo "⚠️  Attention: Le domaine $DOMAIN ne pointe pas vers ce serveur ($CURRENT_IP)"
    echo "   DNS du domaine: $DOMAIN_IP"
    echo "   Continuez-vous quand même? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Remplacer le domaine dans la configuration Nginx
sudo sed -i "s/votre-domaine.com/$DOMAIN/g" /etc/nginx/sites-available/rental-app

# Tester la configuration Nginx
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx

# Obtenir le certificat SSL
echo "🔐 Obtention du certificat SSL..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Configuration du renouvellement automatique
echo "🔄 Configuration du renouvellement automatique..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test du renouvellement
sudo certbot renew --dry-run

echo "✅ SSL configuré avec succès pour $DOMAIN"
echo "🌐 Votre site est maintenant accessible en HTTPS"
echo "🔒 Le certificat se renouvellera automatiquement"
EOF

# Script de monitoring
cat > deployment/scripts/monitor.sh << 'EOF'
#!/bin/bash

# Script de monitoring de l'application
# Usage: ./monitor.sh

echo "📊 État de l'application de location"
echo "=================================="

# Vérifier Nginx
echo "🌐 Nginx:"
if systemctl is-active --quiet nginx; then
    echo "   ✅ Actif"
    echo "   📈 Connexions: $(netstat -an | grep :80 | grep ESTABLISHED | wc -l)"
else
    echo "   ❌ Inactif"
fi

# Vérifier le backend
echo ""
echo "⚙️  Backend:"
if systemctl is-active --quiet rental-backend; then
    echo "   ✅ Actif"
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "   🏥 Health check: OK"
    else
        echo "   ⚠️  Health check: Échec"
    fi
else
    echo "   ❌ Inactif"
fi

# Vérifier PostgreSQL
echo ""
echo "🗄️  PostgreSQL:"
if systemctl is-active --quiet postgresql; then
    echo "   ✅ Actif"
    echo "   📊 Connexions: $(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)"
else
    echo "   ❌ Inactif"
fi

# Utilisation des ressources
echo ""
echo "💻 Ressources système:"
echo "   🧠 RAM: $(free -h | awk 'NR==2{printf "%.1f/%.1f GB (%.0f%%)", $3/1024/1024, $2/1024/1024, $3*100/$2}')"
echo "   💾 Disque: $(df -h / | awk 'NR==2{printf "%s/%s (%s)", $3, $2, $5}')"
echo "   ⚡ CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"

# Logs récents
echo ""
echo "📋 Logs récents (dernières erreurs):"
echo "   Backend:"
sudo journalctl -u rental-backend --since "5 minutes ago" --no-pager | grep -i error | tail -3 | sed 's/^/     /'

echo ""
echo "🔄 Dernière mise à jour: $(date)"
EOF

# Script de sauvegarde
cat > deployment/scripts/backup.sh << 'EOF'
#!/bin/bash

# Script de sauvegarde de la base de données
# Usage: ./backup.sh

set -e

BACKUP_DIR="/var/backups/rental-app"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="rental_app"
DB_USER="rental_user"

echo "💾 Démarrage de la sauvegarde..."

# Créer le dossier de sauvegarde
sudo mkdir -p $BACKUP_DIR

# Sauvegarde de la base de données
echo "🗄️  Sauvegarde de la base de données..."
sudo -u postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Sauvegarde des uploads
echo "📁 Sauvegarde des fichiers uploadés..."
sudo tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C /var/www/backend uploads/

# Nettoyer les anciennes sauvegardes (garder 7 jours)
echo "🧹 Nettoyage des anciennes sauvegardes..."
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Afficher la taille des sauvegardes
echo "📊 Sauvegardes créées:"
ls -lh $BACKUP_DIR/*$DATE*

echo "✅ Sauvegarde terminée"
EOF

# Script de restauration
cat > deployment/scripts/restore.sh << 'EOF'
#!/bin/bash

# Script de restauration de la base de données
# Usage: ./restore.sh <backup_file>

set -e

BACKUP_FILE=$1
DB_NAME="rental_app"
DB_USER="rental_user"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Sauvegardes disponibles:"
    ls -la /var/backups/rental-app/db_backup_*.sql.gz
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Fichier de sauvegarde non trouvé: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ATTENTION: Cette opération va écraser la base de données actuelle"
echo "Continuer? (y/N)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Restauration annulée"
    exit 1
fi

echo "🔄 Arrêt des services..."
sudo systemctl stop rental-backend

echo "🗄️  Restauration de la base de données..."
gunzip -c "$BACKUP_FILE" | sudo -u postgres psql $DB_NAME

echo "🚀 Redémarrage des services..."
sudo systemctl start rental-backend

echo "✅ Restauration terminée"
EOF

# Script de mise à jour
cat > deployment/scripts/update.sh << 'EOF'
#!/bin/bash

# Script de mise à jour de l'application
# Usage: ./update.sh

set -e

echo "🔄 Mise à jour de l'application..."

# Sauvegarder avant la mise à jour
echo "💾 Sauvegarde automatique..."
./backup.sh

# Se placer dans le répertoire du code
cd /var/www/repo

# Récupérer les dernières modifications
echo "📥 Récupération du code..."
git pull origin main

# Mise à jour du frontend
if [ -d "rental-app" ]; then
    echo "🎨 Mise à jour du frontend..."
    cd rental-app
    npm install --production
    npm run build
    sudo cp -r dist/* /var/www/frontend/
    cd ..
fi

# Mise à jour du backend
if [ -d "rental-backend" ]; then
    echo "⚙️  Mise à jour du backend..."
    cd rental-backend
    npm install --production
    npm run build
    
    # Arrêter le service
    sudo systemctl stop rental-backend
    
    # Copier les nouveaux fichiers (sans écraser .env)
    sudo cp -r dist/* /var/www/backend/dist/
    sudo cp package*.json /var/www/backend/
    
    # Redémarrer le service
    sudo systemctl start rental-backend
    cd ..
fi

# Recharger Nginx
echo "🌐 Rechargement de Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Mise à jour terminée"
echo "🔍 Vérification des services..."
sleep 5
./monitor.sh
EOF

# Rendre les scripts exécutables
chmod +x deployment/*.sh
chmod +x deployment/scripts/*.sh
chmod +x deployment/ssl/*.sh

# Instructions finales
cat > deployment/README.md << 'EOF'
# Guide de déploiement sur serveur OVH

## 1. Installation initiale

```bash
# Télécharger les scripts sur votre serveur OVH
wget https://votre-domaine.com/deployment.tar.gz
tar -xzf deployment.tar.gz
cd deployment

# Installation complète (remplacer par votre domaine)
sudo ./install-complete.sh votre-domaine.com
```

## 2. Déploiement des applications

```bash
# Déployer frontend et backend (remplacer par votre repo)
./deploy-apps.sh votre-domaine.com https://github.com/votre-user/votre-repo.git
```

## 3. Configuration Nginx et SSL

```bash
# Copier la configuration Nginx
sudo cp nginx/rental-app.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/rental-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Configuration SSL
./ssl/setup-ssl.sh votre-domaine.com
```

## 4. Configuration du service backend

```bash
# Installer le service systemd
sudo cp systemd/rental-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable rental-backend
sudo systemctl start rental-backend
```

## 5. Monitoring et maintenance

```bash
# Monitoring
./scripts/monitor.sh

# Sauvegarde
./scripts/backup.sh

# Mise à jour
./scripts/update.sh

# Restauration
./scripts/restore.sh /var/backups/rental-app/db_backup_YYYYMMDD_HHMMSS.sql.gz
```

## Structure des fichiers

```
deployment/
├── install-complete.sh      # Installation initiale
├── deploy-apps.sh          # Déploiement des apps
├── nginx/
│   └── rental-app.conf     # Configuration Nginx
├── systemd/
│   └── rental-backend.service  # Service backend
├── ssl/
│   └── setup-ssl.sh        # Configuration SSL
└── scripts/
    ├── monitor.sh          # Monitoring
    ├── backup.sh           # Sauvegarde
    ├── restore.sh          # Restauration
    └── update.sh           # Mise à jour
```

## Variables importantes

- **Domaine**: Remplacer `votre-domaine.com` par votre vrai domaine
- **Repository**: URL de votre repository Git
- **Base de données**: `rental_app` / `rental_user`
- **Ports**: Frontend (80/443), Backend (3001), PostgreSQL (5432)

## Logs

```bash
# Logs backend
sudo journalctl -u rental-backend -f

# Logs Nginx
sudo tail -f /var/log/nginx/error.log

# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```
EOF

echo "✅ Scripts de déploiement générés avec succès dans le dossier deployment/"
echo ""
echo "📋 Fichiers créés:"
echo "   ├── install-complete.sh      # Installation serveur"
echo "   ├── deploy-apps.sh          # Déploiement applications"
echo "   ├── nginx/rental-app.conf   # Configuration Nginx"
echo "   ├── systemd/rental-backend.service  # Service backend"
echo "   ├── ssl/setup-ssl.sh        # Configuration SSL"
echo "   └── scripts/                # Scripts de maintenance"
echo ""
echo "🚀 Utilisation sur votre serveur OVH:"
echo "   1. Transférer le dossier deployment/"
echo "   2. ./install-complete.sh votre-domaine.com"
echo "   3. ./deploy-apps.sh votre-domaine.com https://github.com/user/repo.git"
echo "   4. Configurer Nginx et SSL"
echo ""
echo "📖 Voir deployment/README.md pour le guide complet"