# One-Week Migration Scripts

**Get your rental app off Supabase in 7 days with minimal effort.**

## Quick Start

```bash
# Make scripts executable
chmod +x migration-guide/scripts/*.sh

# Day 1-2: Setup database and backend
./migration-guide/scripts/1-setup-database.sh
./migration-guide/scripts/2-setup-backend.sh

# Day 3: Migrate your data
./migration-guide/scripts/3-migrate-data.sh

# Day 4-5: Update frontend
./migration-guide/scripts/4-update-frontend.sh

# Day 6-7: Test and go live
```

## What Each Script Does

### 1. Database Setup (`1-setup-database.sh`)
- Installs PostgreSQL (if needed)
- Creates `rental_app` database and `rental_user` 
- Creates **only essential tables** (no bloat)
- Takes: 10 minutes

### 2. Backend Setup (`2-setup-backend.sh`)
- Creates minimal Node.js + Express API
- Basic JWT authentication
- Essential CRUD endpoints only
- Takes: 5 minutes

### 3. Data Migration (`3-migrate-data.sh`)
- Exports data from your Supabase project
- Imports to local PostgreSQL
- Sets default password "password123" for all users
- Takes: 15 minutes

### 4. Frontend Update (`4-update-frontend.sh`)
- Creates new API client to replace Supabase
- Updates auth hooks
- Provides manual update checklist
- Takes: 2-3 days to update all components

## What's Included (Essentials Only)

✅ **Database**: PostgreSQL with core tables  
✅ **Auth**: JWT login/signup  
✅ **API**: CRUD for properties, tenants, leases, rents  
✅ **Frontend**: New API client  

## What's NOT Included (Add Later If Needed)

❌ Email system  
❌ File uploads  
❌ Real-time features  
❌ Advanced security  
❌ Monitoring/logging  
❌ Docker containers  

## After Migration

1. **Test everything** with default password "password123"
2. **Change JWT secret** in production
3. **Add SSL** for production deployment
4. **Backup database** regularly

## Production Deployment

```bash
# On your OVH server
git clone your-repo
cd rental-backend
npm install --production
pm2 start server.js --name rental-api
```

That's it! You've escaped vendor lock-in in one week with minimal complexity.