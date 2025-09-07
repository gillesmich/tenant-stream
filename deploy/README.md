# Deployment Scripts for Supabase Rental Application

This directory contains comprehensive deployment scripts for your Supabase-integrated rental application.

## 📁 Files Overview

- `full-app-deployment.sh` - Complete deployment script with SSL and monitoring
- `quick-frontend-only.sh` - Fast frontend-only deployment (recommended for Supabase apps)
- `update-app.sh` - Update deployed application with latest changes
- `monitor-app.sh` - Monitor application health and system status

## 🚀 Quick Start

### Option 1: Quick Frontend Deployment (Recommended)

For Supabase applications, you typically only need to deploy the frontend:

```bash
# Download and run the quick deployment script
wget https://raw.githubusercontent.com/gillesmich/tenant-stream/main/deploy/quick-frontend-only.sh
chmod +x quick-frontend-only.sh
./quick-frontend-only.sh yourdomain.com https://github.com/yourusername/yourrepo.git
```

### Option 2: Full Deployment

For complete setup with all features:

```bash
# Download and run the full deployment script
wget https://raw.githubusercontent.com/gillesmich/tenant-stream/main/deploy/full-app-deployment.sh
chmod +x full-app-deployment.sh
./full-app-deployment.sh yourdomain.com https://github.com/yourusername/yourrepo.git
```

## 📋 Prerequisites

1. **Ubuntu 20.04+ server** with sudo access
2. **Domain name** pointing to your server's IP
3. **Git repository** with your application code
4. **Supabase project** already configured

## 🔧 What Gets Installed

- **Node.js 18+** - For building the React application
- **Nginx** - Web server for serving the frontend
- **Certbot** - For SSL certificate management
- **UFW Firewall** - Basic security configuration

## 📝 Usage Instructions

### Initial Deployment

1. **Prepare your server:**
   ```bash
   # Update your server
   sudo apt update && sudo apt upgrade -y
   
   # Ensure you have curl and wget
   sudo apt install -y curl wget
   ```

2. **Run deployment:**
   ```bash
   # For quick frontend-only deployment
   ./quick-frontend-only.sh yourdomain.com
   
   # OR for full deployment
   ./full-app-deployment.sh yourdomain.com https://github.com/yourusername/yourrepo.git
   ```

### Updating Your Application

```bash
# Update the deployed application
./update-app.sh
```

### Monitoring

```bash
# Check application health
./monitor-app.sh
```

## 🌐 Domain Configuration

Before running the deployment scripts:

1. **Point your domain to your server:**
   - Create an A record pointing `yourdomain.com` to your server's IP
   - Create an A record pointing `www.yourdomain.com` to your server's IP

2. **Wait for DNS propagation** (usually 5-30 minutes)

3. **Verify DNS propagation:**
   ```bash
   nslookup yourdomain.com
   ```

## 🔐 SSL Certificate

The deployment scripts automatically:
- Install Certbot
- Obtain SSL certificates from Let's Encrypt
- Configure automatic renewal
- Redirect HTTP to HTTPS

## 📊 Post-Deployment

After successful deployment:

1. **Test your application:**
   - Visit `https://yourdomain.com`
   - Check that authentication works with Supabase
   - Verify all features are functional

2. **Monitor regularly:**
   ```bash
   ./monitor-app.sh
   ```

3. **Update when needed:**
   ```bash
   ./update-app.sh
   ```

## Accessing Your Application

After deployment:
- **Without SSL**: `http://your-server-ip`
- **With domain and SSL**: `https://yourdomain.com`

## Supabase Configuration

Your application will automatically connect to your existing Supabase project. No additional backend setup is required on your server.

If you need to update Supabase settings:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vbpyykdkaoktzuewbzzl)
2. Make changes in the dashboard
3. The changes will be reflected immediately in your deployed application

## Troubleshooting

### Application not loading
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check if files are built correctly
ls -la /var/www/rental-app/dist/
```

### SSL issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew --dry-run
```

### Database connection issues
- Verify your Supabase project is active
- Check if your domain is allowed in Supabase dashboard under Authentication > URL Configuration

## Security Recommendations

1. **Keep your server updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure automatic security updates**:
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```

3. **Monitor your application**:
   - Set up server monitoring
   - Check Supabase logs regularly
   - Monitor SSL certificate expiration

## Backup Strategy

Since your backend is on Supabase:
- **Database**: Use Supabase's built-in backup features
- **Frontend**: Your code is in Git, so it's already backed up
- **Server**: Consider taking server snapshots before major updates

## Support

- **Supabase Issues**: [Supabase Support](https://supabase.com/support)
- **Server Issues**: Contact your OVH support
- **Application Issues**: Check the application logs and Supabase dashboard