# OVH Server Deployment Guide

This guide will help you deploy your rental application to an OVH server.

## Prerequisites

- An OVH server (VPS or dedicated server) with Ubuntu 20.04+ or Debian 11+
- Root or sudo access to the server
- A domain name pointing to your server's IP address (for SSL setup)
- Your application code in a Git repository

## Important Notes

### Backend (Supabase)
Your application uses **Supabase as a hosted backend service**. You don't need to install anything on your server for the backend. Supabase handles:
- Database hosting
- Authentication
- Edge Functions
- File Storage

Your current Supabase configuration:
- Project ID: `vbpyykdkaoktzuewbzzl`
- URL: `https://vbpyykdkaoktzuewbzzl.supabase.co`

## Deployment Steps

### 1. Prepare Your Repository

First, make sure your code is in a Git repository (GitHub, GitLab, etc.):

```bash
# If you haven't already, create a repository and push your code
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Initial Server Setup

Connect to your OVH server via SSH:

```bash
ssh root@your-server-ip
# or if you have a user account:
ssh username@your-server-ip
```

### 3. Deploy the Frontend

Upload the deployment script to your server and run it:

```bash
# Upload the script (from your local machine)
scp deploy/install-frontend.sh root@your-server-ip:/tmp/

# Connect to your server and run the script
ssh root@your-server-ip
chmod +x /tmp/install-frontend.sh
/tmp/install-frontend.sh
```

**Important**: Before running the script, edit it to replace:
- `https://github.com/yourusername/your-repo.git` with your actual repository URL
- `your-domain.com` with your actual domain name

### 4. Configure Domain (Optional but Recommended)

If you have a domain name:

1. Point your domain's A record to your server's IP address
2. Wait for DNS propagation (can take up to 24 hours)
3. Run the SSL setup script:

```bash
# Upload and run SSL setup
scp deploy/setup-ssl.sh root@your-server-ip:/tmp/
ssh root@your-server-ip
chmod +x /tmp/setup-ssl.sh
/tmp/setup-ssl.sh yourdomain.com
```

### 5. Future Updates

To update your application with new changes:

```bash
# Upload the update script
scp deploy/update-app.sh root@your-server-ip:/tmp/
ssh root@your-server-ip
chmod +x /tmp/update-app.sh
/tmp/update-app.sh
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